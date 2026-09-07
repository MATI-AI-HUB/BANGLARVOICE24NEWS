/**
 * Banglar Voice — pipeline orchestrator.
 *
 * Wires: collector → rewriter → media sourcer → (editorial gate) → publisher
 * → social/telegram broadcast, and hosts the Telegram command loop as the
 * editorial control plane.
 *
 * State machine per item:
 *   collected → rewritten → media_attached → pending_approval
 *            → approved → published → broadcast
 *
 * Human-in-the-loop is the DEFAULT: nothing publishes or broadcasts unless
 * an editor approves the item (Admin Console or Telegram /approve|/publish)
 * or AUTO_PUBLISH=true is explicitly set in the environment.
 *
 * Persistence model (kept deliberately light, Supabase-backed when env is
 * present):
 *   - collected/rewritten items live in the app's newsroom_queue (status)
 *   - richer pipeline records (rewritten body, media, broadcast log) are kept
 *     in an optional local JSON state file (PIPELINE_STATE_FILE) so the loop
 *     is restart-safe without requiring DB schema changes.
 *
 * In --dry-run the whole graph runs against a sample item and prints exactly
 * what WOULD happen, with zero network writes.
 */

import { getDbClient, pushDrafts, slugExists, type IngestDraft } from './ingest.js';
import { parseSourceList, fetchSource, isFresh, type RawItem } from './collector.js';
import { rewriteItem, type RewriteConfig } from './rewriter.js';
import { sourceMedia, type MediaConfig } from './media.js';
import { buildMessage, FacebookAdapter, InstagramAdapter, LinkedInAdapter, TelegramAdapter, TwitterAdapter, type PublishedStory } from './publisher.js';
import { TelegramController, parseCommand, queueSummary, sourcesReply, type TgCommand, type TgHandler } from './telegram.js';
import type { BroadcastPlatform, BroadcastResult, PipelineItem, QueueRow } from './types.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type PipelineConfig = {
  baseUrl: string;
  ingestKey: string;
  dryRun?: boolean;
  log: (m: string) => void;
  stateFile?: string;
};

export type SocialEnv = {
  FACEBOOK_PAGE_ID?: string;
  FACEBOOK_PAGE_TOKEN?: string;
  TWITTER_APP_KEY?: string;
  TWITTER_APP_SECRET?: string;
  TWITTER_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_SECRET?: string;
  INSTAGRAM_PAGE_ID?: string;
  INSTAGRAM_BUSINESS_ID?: string;
  INSTAGRAM_TOKEN?: string;
  LINKEDIN_ACCESS_TOKEN?: string;
  LINKEDIN_PERSON_URN?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
};

/* ------------------------------------------------------------------ */
/* Lightweight JSON state file (restart-safe, schema-free)             */
/* ------------------------------------------------------------------ */

function loadState(file: string | undefined): { items: Record<string, PipelineItem> } {
  if (!file) return { items: {} };
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as { items: Record<string, PipelineItem> };
  } catch {
    /* corrupt → start fresh */
  }
  return { items: {} };
}

function saveState(file: string | undefined, state: { items: Record<string, PipelineItem> }): void {
  if (!file) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(state, null, 2));
  } catch {
    /* non-fatal */
  }
}

/* ------------------------------------------------------------------ */
/* Item lifecycle helpers                                              */
/* ------------------------------------------------------------------ */

function upsertItem(state: { items: Record<string, PipelineItem> }, item: PipelineItem): void {
  state.items[item.id] = item;
}

function byId(state: { items: Record<string, PipelineItem> }, idOrShort: string): PipelineItem | undefined {
  const full = Object.values(state.items).find((i) => i.id === idOrShort);
  if (full) return full;
  return Object.values(state.items).find((i) => i.id.startsWith(idOrShort));
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeItem(raw: RawItem, queuedId: string): PipelineItem {
  const ts = nowIso();
  return {
    id: queuedId,
    slug: '',
    state: 'collected',
    original_title: raw.title,
    original_link: raw.link,
    source_label: raw.source.agent ?? 'collector',
    source_category: raw.source.category as PipelineItem['source_category'],
    media: [],
    broadcast: {},
    collected_at: ts,
    updated_at: ts,
  };
}

/* ------------------------------------------------------------------ */
/* Core graph                                                          */
/* ------------------------------------------------------------------ */

export type ProcessDraftOptions = {
  item: PipelineItem;
  rewriteCfg: RewriteConfig;
  mediaCfg: MediaConfig;
  autoPublish: boolean;
  dryRun?: boolean;
  state: { items: Record<string, PipelineItem> };
  log: (m: string) => void;
  save: () => void;
};

/**
 * Rewrite + source media for one item, then either mark pending_approval or
 * (when autoPublish) go straight to publishAndBroadcast.
 * Returns the item id.
 */
export async function processDraft(opts: ProcessDraftOptions): Promise<string> {
  const { item, rewriteCfg, mediaCfg, autoPublish, dryRun, state, log, save } = opts;
  const raw: RawItem = {
    source: {
      id: item.slug || item.id,
      url: item.original_link ?? '',
      lang: 'both',
      category: item.source_category ?? 'national',
      agent: item.source_label ?? 'collector',
    },
    title: item.original_title ?? '',
    link: item.original_link ?? '',
    pubDate: item.collected_at,
    description: item.original_title,
  };

  // 1) REWRITE
  log(`  ↳ rewriting #${item.id.slice(0, 8)}…`);
  const rw = await rewriteItem(raw, { ...rewriteCfg, dryRun: dryRun ?? rewriteCfg.dryRun });
  item.rewritten = rw.story;
  item.state = 'rewritten';
  item.updated_at = nowIso();
  if (rw.error) log(`    (${rw.error})`);
  log(`    headline: ${rw.story?.headline.slice(0, 90)}`);

  // 2) MEDIA
  log(`  ↳ sourcing CC0 media…`);
  const med = await sourceMedia(rw.story!, item.source_category ?? 'national', { ...mediaCfg, dryRun: dryRun ?? mediaCfg.dryRun });
  item.media = med.media;
  item.state = 'media_attached';
  item.updated_at = nowIso();
  if (med.error) log(`    (${med.error})`);
  log(`    media: ${med.media.length} item(s), first: ${med.media[0]?.url ?? '-'}`);

  save();

  if (autoPublish) {
    item.state = 'approved';
    item.approved_by = 'auto';
    item.approved_at = nowIso();
    await publishAndBroadcast({ item, dryRun, state, log, save });
  } else {
    item.state = 'pending_approval';
    item.updated_at = nowIso();
    save();
    log(`  ⏸  awaiting editor approval (#${item.id.slice(0, 8)}) — Telegram: /approve ${item.id.slice(0, 8)}`);
  }
  return item.id;
}

/* ------------------------------------------------------------------ */
/* Publish + broadcast                                                 */
/* ------------------------------------------------------------------ */

export type PublishOptions = {
  item: PipelineItem;
  dryRun?: boolean;
  state: { items: Record<string, PipelineItem> };
  log: (m: string) => void;
  save: () => void;
  baseUrl?: string;
  ingestKey?: string;
  social?: SocialEnv;
};

function makeSocial(env: SocialEnv) {
  return [
    new FacebookAdapter({ pageId: env.FACEBOOK_PAGE_ID, token: env.FACEBOOK_PAGE_TOKEN }),
    new TwitterAdapter({
      appKey: env.TWITTER_APP_KEY,
      appSecret: env.TWITTER_APP_SECRET,
      accessToken: env.TWITTER_ACCESS_TOKEN,
      accessSecret: env.TWITTER_ACCESS_SECRET,
    }),
    new InstagramAdapter({
      pageId: env.INSTAGRAM_PAGE_ID,
      token: env.INSTAGRAM_TOKEN,
      igUserId: env.INSTAGRAM_BUSINESS_ID,
    }),
    new LinkedInAdapter({ accessToken: env.LINKEDIN_ACCESS_TOKEN, personUrn: env.LINKEDIN_PERSON_URN }),
    new TelegramAdapter({ botToken: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID }),
  ];
}

function record(state: { items: Record<string, PipelineItem> }, item: PipelineItem, r: BroadcastResult): void {
  item.broadcast[r.platform] = r;
}

/**
 * Mark published (website) and broadcast to every configured social platform.
 * In dry-run each adapter reports a simulated result (no network).
 */
export async function publishAndBroadcast(opts: PublishOptions): Promise<void> {
  const { item, dryRun, state, log, save, baseUrl, ingestKey, social = {} } = opts;
  if (!item.rewritten) {
    item.state = 'failed';
    item.error = 'cannot publish: no rewritten story';
    save();
    return;
  }

  const story: PublishedStory = {
    id: item.id,
    slug: item.slug,
    headline: item.rewritten.headline,
    dek: item.rewritten.dek,
    body: item.rewritten.body,
    image: item.media[0] ?? null,
    category: item.source_category,
    keywords: item.rewritten.keywords,
    source_label: item.source_label,
    url: baseUrl ? `${baseUrl.replace(/\/+$/, '')}/news/${item.slug}` : undefined,
  };

  // Website: reuse the app's own ingest path (approved → published row).
  // The real app's newsroom_queue admin flow mirrors into published posts.
  if (dryRun) {
    record(state, item, {
      platform: 'website',
      ok: true,
      skipped: true,
      skipped_reason: 'dry-run: would POST to ingest API for publication',
      at: nowIso(),
    });
  } else if (baseUrl && ingestKey) {
    const draft: IngestDraft = {
      title: item.rewritten.headline.slice(0, 160),
      dek: item.rewritten.dek.slice(0, 300),
      category: item.source_category ?? 'national',
      body: item.rewritten.body,
      source: item.source_label ?? 'banglar-voice',
      tags: item.rewritten.keywords.slice(0, 6),
      image_url: item.media[0]?.url ?? null,
      agent: 'autonomous-pipeline',
      slug: item.slug || item.id,
    };
    const res = await pushDrafts(baseUrl, ingestKey, [draft]);
    if (res.ok) {
      record(state, item, { platform: 'website', ok: true, at: nowIso() });
      log(`  ✓ website: queued for publish (ingest ok)`);
    } else {
      record(state, item, { platform: 'website', ok: false, error: res.error, at: nowIso() });
      log(`  ✗ website ingest failed: ${res.error}`);
    }
  } else {
    record(state, item, {
      platform: 'website',
      ok: true,
      skipped: true,
      skipped_reason: 'no BV_BASE_URL/NEWSROOM_INGEST_KEY — website publish skipped',
      at: nowIso(),
    });
  }

  item.state = 'published';
  item.published_at = nowIso();
  item.updated_at = nowIso();
  save();

  // Social broadcast
  for (const adapter of makeSocial(social)) {
    let res: BroadcastResult;
    if (dryRun) {
      res = {
        platform: adapter.platform,
        ok: true,
        skipped: true,
        skipped_reason: 'dry-run: no network call made',
        at: nowIso(),
      };
    } else {
      res = await adapter.publish(story);
    }
    record(state, item, res);
    log(
      res.skipped
        ? `  – ${adapter.platform}: skipped (${res.skipped_reason})`
        : res.ok
          ? `  ✓ ${adapter.platform}: ${res.ref ?? 'ok'}`
          : `  ✗ ${adapter.platform}: ${res.error}`,
    );
  }

  item.state = 'broadcast';
  item.updated_at = nowIso();
  save();
}

/* ------------------------------------------------------------------ */
/* Telegram handler (editorial control plane)                          */
/* ------------------------------------------------------------------ */

export function makeTelegramHandler(opts: {
  state: { items: Record<string, PipelineItem> };
  cfg: { rewriteCfg: RewriteConfig; mediaCfg: MediaConfig; dryRun?: boolean; baseUrl?: string; ingestKey?: string; social?: SocialEnv };
  save: () => void;
  setPaused: (v: boolean) => void;
  isPaused: () => boolean;
  log: (m: string) => void;
}): TgHandler {
  const { state, cfg, save, setPaused, isPaused, log } = opts;
  return async (cmd: TgCommand): Promise<string> => {
    switch (cmd.kind) {
      case 'help':
        return (
          '🤖 বাংলার ভয়েস কমান্ড:\n' +
          '/publish <id> — অনুমোদন + প্রকাশ + ব্রডকাস্ট\n' +
          '/approve <id> — শুধু অনুমোদন\n' +
          '/reject <id> — বাতিল\n' +
          '/rewrite <id> — পুনরায় rewrite\n' +
          '/media <id> — CC0 মিডিয়া পুনঃসংগ্রহ\n' +
          '/status — সারসংক্ষেপ\n' +
          '/sources — সোর্স তালিকা\n' +
          '/pause • /resume — পাইপলাইন বিরতি/চালু'
        );
      case 'status': {
        const rows = Object.values(state.items)
          .slice(0, 50)
          .map((i) => ({ id: i.id, slug: i.slug, status: i.state, title: i.rewritten?.headline ?? i.original_title ?? '' }) as QueueRow);
        return queueSummary(rows);
      }
      case 'sources':
        return sourcesReply(parseSourceList(process.env['NEWS_RSS_URLS']).map((s) => `${s.id} (${s.url})`));
      case 'pause':
        setPaused(true);
        return '⏸ পাইপলাইন বিরত রাখা হয়েছে। /resume দিয়ে চালু করুন।';
      case 'resume':
        setPaused(false);
        return '▶️ পাইপলাইন চালু হয়েছে।';
      case 'approve':
      case 'publish': {
        const item = byId(state, cmd.id);
        if (!item) return `❌ আইটেম পাওয়া যায়নি: ${cmd.id}`;
        item.state = 'approved';
        item.approved_by = 'telegram';
        item.approved_at = nowIso();
        save();
        if (cmd.kind === 'approve') {
          log(`  ✓ approved #${item.id.slice(0, 8)} (telegram)`);
          return `✅ অনুমোদিত: #${item.id.slice(0, 8)} — ${item.rewritten?.headline.slice(0, 60) ?? ''}`;
        }
        await publishAndBroadcast({
          item,
          dryRun: cfg.dryRun,
          state,
          save,
          baseUrl: cfg.baseUrl,
          ingestKey: cfg.ingestKey,
          social: cfg.social,
          log,
        });
        return `🚀 প্রকাশিত + ব্রডকাস্ট: #${item.id.slice(0, 8)}`;
      }
      case 'reject': {
        const item = byId(state, cmd.id);
        if (!item) return `❌ আইটেম পাওয়া যায়নি: ${cmd.id}`;
        item.state = 'rejected';
        item.updated_at = nowIso();
        save();
        return `🗑 বাতিল: #${item.id.slice(0, 8)}`;
      }
      case 'rewrite':
      case 'media': {
        const item = byId(state, cmd.id);
        if (!item) return `❌ আইটেম পাওয়া যায়নি: ${cmd.id}`;
        if (cmd.kind === 'rewrite') {
          const raw: RawItem = {
            source: { id: item.slug, url: item.original_link ?? '', lang: 'both', category: item.source_category ?? 'national', agent: item.source_label ?? 'collector' },
            title: item.original_title ?? '',
            link: item.original_link ?? '',
            pubDate: item.collected_at,
            description: item.original_title,
          };
          const rw = await rewriteItem(raw, { ...cfg.rewriteCfg, dryRun: cfg.dryRun });
          item.rewritten = rw.story;
          item.updated_at = nowIso();
          save();
          return `✍️ নতুন rewrite: #${item.id.slice(0, 8)} — ${rw.story?.headline.slice(0, 60) ?? ''}`;
        }
        const med = await sourceMedia(item.rewritten!, item.source_category ?? 'national', { ...cfg.mediaCfg, dryRun: cfg.dryRun });
        item.media = med.media;
        item.updated_at = nowIso();
        save();
        return `🖼 নতুন মিডিয়া: #${item.id.slice(0, 8)} (${med.media.length}টি)`;
      }
      default:
        return `🤔 চেনা কমান্ড নয়। /help দেখুন।`;
    }
  };
}

/* ------------------------------------------------------------------ */
/* Main orchestration cycle                                            */
/* ------------------------------------------------------------------ */

export type CycleOptions = {
  cfg: PipelineConfig;
  rewriteCfg: RewriteConfig;
  mediaCfg: MediaConfig;
  social: SocialEnv;
  autoPublish: boolean;
  pollTelegram: boolean;
  stateFile?: string;
};

export type CycleResult = {
  collected: number;
  rewrote: number;
  pending: number;
  autoPublished: number;
  errors: string[];
};

/**
 * One full pipeline pass:
 *   1. Telegram control commands (if token set)
 *   2. collect fresh items from RSS sources (dedupe vs Supabase + state)
 *   3. rewrite + media-source each (state machine)
 *   4. human-gate or auto-publish per config
 */
export async function runPipelineCycle(opts: CycleOptions): Promise<CycleResult> {
  const { cfg, rewriteCfg, mediaCfg, social, autoPublish, pollTelegram } = opts;
  const state = loadState(cfg.stateFile);
  const save = () => saveState(cfg.stateFile, state);
  const errors: string[] = [];
  const result: CycleResult = { collected: 0, rewrote: 0, pending: 0, autoPublished: 0, errors };

  // Telegram command polling (editorial control plane)
  if (pollTelegram && social.TELEGRAM_BOT_TOKEN && !cfg.dryRun) {
    const handler = makeTelegramHandler({
      state,
      cfg: { rewriteCfg, mediaCfg, dryRun: cfg.dryRun, baseUrl: cfg.baseUrl, ingestKey: cfg.ingestKey, social },
      save,
      setPaused: (v) => {
        (opts as { paused?: boolean }).paused = v;
      },
      isPaused: () => Boolean((opts as { paused?: boolean }).paused),
      log: cfg.log,
    });
    const ctl = new TelegramController(
      {
        botToken: social.TELEGRAM_BOT_TOKEN,
        allowedChatIds: (process.env['TELEGRAM_ALLOWED_CHAT_IDS'] ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        log: cfg.log,
      },
      handler,
    );
    const n = await ctl.pollOnce();
    if (n > 0) cfg.log(`telegram: handled ${n} command(s)`);
  }

  const paused = Boolean((opts as { paused?: boolean }).paused);
  if (paused) {
    cfg.log('pipeline paused (telegram /pause) — skipping collection');
    return result;
  }

  // Collect
  const sources = parseSourceList(process.env['NEWS_RSS_URLS']);
  const seen = new Set<string>();
  const windowMs = 1000 * 60 * 60 * 36;

  for (const source of sources) {
    if (cfg.dryRun && result.collected >= 3) break; // dry-run: cap sources to keep it fast
    try {
      const items = await fetchSource(source, undefined);
      const fresh = items.filter((it) => isFresh(it.pubDate, windowMs));
      for (const it of fresh.slice(0, 6)) {
        if (seen.has(it.link)) continue;
        seen.add(it.link);
        const slug = slugifySafe(it.link);
        if (!slug || (it.title ?? '').length < 5) continue;
        if (!cfg.dryRun) {
          try {
            const exists = await slugExists(getDbClient(), slug.slice(0, 80));
            if (exists) continue;
          } catch {
            /* dedupe best-effort */
          }
        }
        // Queue the item through the app ingest first so editors see it in the
        // Admin Console too; keep the local pipeline record in sync.
        const queuedId = `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const item = makeItem(it, queuedId);
        item.slug = slug.slice(0, 80);
        item.state = 'collected';
        item.updated_at = nowIso();

        // Ingest to app (so the Admin Console shows the item). In dry-run we
        // only simulate this — the app endpoint is not called.
        if (!cfg.dryRun && cfg.ingestKey) {
          try {
            const draft: IngestDraft = {
              title: (it.title ?? '').slice(0, 160),
              dek: (it.description ?? '').replace(/<[^>]+>/g, ' ').slice(0, 300),
              category: source.category,
              body: [(it.description ?? '').replace(/<[^>]+>/g, ' ').slice(0, 600)],
              source: new URL(it.link).hostname.replace(/^www\./, '').slice(0, 200),
              tags: [],
              image_url: null,
              agent: 'autonomous-pipeline',
              slug,
            };
            await pushDrafts(cfg.baseUrl, cfg.ingestKey, [draft]);
          } catch (e) {
            errors.push(`ingest ${slug}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        upsertItem(state, item);
        result.collected++;
        save();
        await processDraft({
          item,
          rewriteCfg,
          mediaCfg,
          autoPublish,
          dryRun: cfg.dryRun,
          state,
          log: cfg.log,
          save,
        });
        result.rewrote++;
        if (autoPublish) result.autoPublished++;
        else result.pending++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`[${source.id}] ${msg}`);
      cfg.log(`[${source.id}] ERROR: ${msg}`);
    }
  }

  save();
  return result;
}

function slugifySafe(input: string): string {
  try {
    const u = new URL(input);
    const path = u.pathname.replace(/\/$/, '');
    const seg = path.split('/').filter(Boolean).pop() ?? '';
    return (
      seg
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'item'
    );
  } catch {
    return (
      input
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'item'
    );
  }
}

/** Export a sample item for dry-run/demo purposes. */
export function sampleItem(): PipelineItem {
  const ts = nowIso();
  return {
    id: 'demo_00000001',
    slug: 'demo-dhaka-metro-inauguration',
    state: 'collected',
    original_title: 'ঢাকায় মেট্রোরেলের নতুন লাইন উদ্বোধন করা হয়েছে',
    original_link: 'https://example.com/story/dhaka-metro',
    source_label: 'demo-feed',
    source_category: 'national',
    media: [],
    broadcast: {},
    collected_at: ts,
    updated_at: ts,
  };
}

export { buildMessage };
