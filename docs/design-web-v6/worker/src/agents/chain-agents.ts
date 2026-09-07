/**
 * Banglar Voice — chain agents: Collector, Rewriter, Media, Editor, Publisher,
 * Social. Each is a self-contained AgentHandle with its OWN inbox cursor on
 * the shared bus. They never import each other; they exchange PipelineItem
 * payloads ONLY via bus messages (topics in src/agents/types.ts).
 */

import type { AgentMessage } from '../lib/bus.js';
import type { PipelineItem, BroadcastPlatform } from '../lib/types.js';
import { TOPIC, type AgentContext, type AgentHandle } from './types.js';

/* ================================================================== */
/* CollectorAgent                                                      */
/* ================================================================== */

/**
 * Watches public RSS sources; every fresh item becomes a bus message
 * `story.collected` addressed to the RewriterAgent (or the matching desk
 * agent when category routing is enabled, see registry.ts).
 */
export class CollectorAgent implements AgentHandle {
  readonly id: string;
  readonly topics: string[];
  constructor(private ctx: AgentContext, private deskMode = false) {
    this.id = ctx.id;
    this.topics = ['control.resume', 'control.status'];
  }

  describe(): string {
    return 'collects fresh items from RSS sources and publishes story.collected';
  }

  async tick(): Promise<number> {
    const { log, bus, dryRun } = this.ctx;
    const from = this.id;
    if (this.deskMode) return 0; // desk agents do their own collection cycle

    const { parseSourceList, fetchSource, isFresh } = await import('../lib/collector.js');
    const sources = parseSourceList(process.env['NEWS_RSS_URLS']);
    let handled = 0;
    const seen = new Set<string>();
    const windowMs = 1000 * 60 * 60 * 36;

    for (const source of sources.slice(0, dryRun ? 1 : sources.length)) {
      try {
        const items = await fetchSource(source, undefined);
        const fresh = items.filter((it) => isFresh(it.pubDate, windowMs)).slice(0, 6);
        for (const it of fresh) {
          if (seen.has(it.link)) continue;
          seen.add(it.link);
          const title = (it.title ?? '').trim();
          if (title.length < 5) continue;
          const ts = new Date().toISOString();
          const item: PipelineItem = {
            id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            slug: '',
            state: 'collected',
            original_title: it.title,
            original_link: it.link,
            source_label: source.agent ?? 'collector',
            source_category: source.category as PipelineItem['source_category'],
            media: [],
            broadcast: {},
            collected_at: ts,
            updated_at: ts,
          };
          const desk = this.deskAgentFor(source.category);
          log(`collected #${item.id.slice(0, 8)} [${source.category}] ${title.slice(0, 70)}`);
          await bus.publish({
            topic: TOPIC.COLLECTED,
            type: 'story.collected',
            from,
            to: desk,
            payload: item,
          });
          handled += 1;
        }
      } catch (e) {
        log(`source ${source.id} ERROR: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (dryRun) log(`[dry-run] would collect+route fresh items; simulated ${handled} publish(es)`);
    return handled;
  }

  private deskAgentFor(category?: string): string {
    if (!this.deskMode) return 'rewriter';
    const map: Record<string, string> = {
      national: 'desk-national',
      politics: 'desk-politics',
      economy: 'desk-economy',
      sports: 'desk-sports',
      technology: 'desk-tech',
      entertainment: 'desk-entertainment',
      international: 'desk-international',
    };
    return map[category ?? ''] ?? 'desk-general';
  }
}

/* ================================================================== */
/* RewriterAgent                                                       */
/* ================================================================== */

/** Consumes story.collected, produces original Bangla copy, emits
 *  story.rewritten to MediaAgent. */
export class RewriterAgent implements AgentHandle {
  readonly id: string;
  readonly topics: string[];
  constructor(private ctx: AgentContext) {
    this.id = ctx.id;
    this.topics = [TOPIC.COLLECTED, 'control.resume', 'control.status'];
  }
  describe(): string {
    return 'rewrites collected stories into original copyright-free Bangla (AI or fallback)';
  }

  async tick(): Promise<number> {
    const { bus, log, dryRun } = this.ctx;
    const { rewriteItem } = await import('../lib/rewriter.js');
    const rewriteCfg = {
      baseUrl: process.env['CHAT_AI_BASE_URL'] ?? 'https://api.openai.com/v1',
      apiKey: process.env['CHAT_AI_KEY'] ?? '',
      model: process.env['CHAT_AI_MODEL'] ?? 'gpt-4o-mini',
      dryRun,
    };
    const rawFrom = (item: PipelineItem) => ({
      source: {
        id: item.slug || item.id,
        url: item.original_link ?? '',
        lang: 'both' as const,
        category: item.source_category ?? 'national',
        agent: item.source_label ?? 'collector',
      },
      title: item.original_title ?? '',
      link: item.original_link ?? '',
      pubDate: item.collected_at,
      description: item.original_title,
    });

    let handled = 0;
    await bus.poll(this.id, TOPIC.COLLECTED, async (m: AgentMessage) => {
      const item = m.payload as PipelineItem;
      const rw = await rewriteItem(rawFrom(item), { ...rewriteCfg });
      item.rewritten = rw.story;
      item.state = 'rewritten';
      item.updated_at = new Date().toISOString();
      if (rw.error) log(`  (${rw.error})`);
      log(`rewrote #${item.id.slice(0, 8)} → ${rw.story?.headline.slice(0, 60)}`);
      await bus.publish({ topic: TOPIC.REWRITTEN, type: 'story.rewritten', from: this.id, to: 'media', payload: item });
      handled += 1;
    });
    return handled;
  }
}

/* ================================================================== */
/* MediaAgent                                                          */
/* ================================================================== */

/** Consumes story.rewritten, attaches CC0 media + attribution, emits
 *  story.media_ready to EditorAgent. */
export class MediaAgent implements AgentHandle {
  readonly id: string;
  readonly topics: string[];
  constructor(private ctx: AgentContext) {
    this.id = ctx.id;
    this.topics = [TOPIC.REWRITTEN, 'control.resume', 'control.status'];
  }
  describe(): string {
    return 'sources copyright-free (CC0) images with attribution for each story';
  }

  async tick(): Promise<number> {
    const { bus, log, dryRun } = this.ctx;
    const { sourceMedia } = await import('../lib/media.js');
    const mediaCfg = { pexelsKey: process.env['PEXELS_API_KEY'], dryRun };
    let handled = 0;
    await bus.poll(this.id, TOPIC.REWRITTEN, async (m: AgentMessage) => {
      const item = m.payload as PipelineItem;
      const med = await sourceMedia(item.rewritten!, item.source_category ?? 'national', { ...mediaCfg, dryRun });
      item.media = med.media;
      item.state = 'media_attached';
      item.updated_at = new Date().toISOString();
      log(`media #${item.id.slice(0, 8)}: ${med.media.length} item(s), first ${med.media[0]?.url ?? '-'}`);
      await bus.publish({ topic: TOPIC.MEDIA_READY, type: 'story.media_ready', from: this.id, to: 'editor', payload: item });
      handled += 1;
    });
    return handled;
  }
}

/* ================================================================== */
/* EditorAgent — the human-in-the-loop approval gate                   */
/* ================================================================== */

/**
 * Consumes story.media_ready and parks the item as pending_approval (its own
 * private queue file, mirrors into Supabase newsroom_queue when configured).
 * Consumes control.approve / control.reject (from TelegramAgent or the Admin
 * Console) and only then emits story.approved / story.rejected to the
 * PublisherAgent / SupervisorAgent. Nothing auto-publishes unless the editor
 * approves (or AUTO_PUBLISH=true is set, which routes straight through).
 */
export class EditorAgent implements AgentHandle {
  readonly id: string;
  readonly topics: string[];
  constructor(private ctx: AgentContext) {
    this.id = ctx.id;
    this.topics = [TOPIC.MEDIA_READY, TOPIC.CTRL_APPROVE, TOPIC.CTRL_REJECT, TOPIC.CTRL_PAUSE, TOPIC.CTRL_RESUME, TOPIC.CTRL_STATUS];
  }
  describe(): string {
    return 'editorial gate: queues stories for human approval, acts on Telegram /approve|/reject|/publish';
  }

  async tick(): Promise<number> {
    const { bus, log, dryRun } = this.ctx;
    const autoPublish = process.env['AUTO_PUBLISH'] === 'true';
    const pendingFile = process.env['EDITOR_QUEUE_FILE'] ?? '.state/editor-pending.json';
    let handled = 0;

    const loadPending = (): Record<string, PipelineItem> => {
      try {
        const { existsSync, readFileSync } = awaitImportFs();
        if (existsSync(pendingFile)) return JSON.parse(readFileSync(pendingFile, 'utf8'));
      } catch { /* fresh */ }
      return {};
    };
    const savePending = (s: Record<string, PipelineItem>) => {
      try {
        const { mkdirSync, writeFileSync } = awaitImportFs();
        mkdirSync(pendingFile.split('/').slice(0, -1).join('/') || '.', { recursive: true });
        writeFileSync(pendingFile, JSON.stringify(s, null, 2));
      } catch { /* non-fatal */ }
    };

    await bus.poll(this.id, TOPIC.MEDIA_READY, async (m: AgentMessage) => {
      const item = m.payload as PipelineItem;
      item.state = 'pending_approval';
      item.updated_at = new Date().toISOString();
      if (autoPublish) {
        log(`AUTO_PUBLISH=true — routing #${item.id.slice(0, 8)} straight to publisher`);
        item.state = 'approved';
        item.approved_by = 'auto';
        item.approved_at = new Date().toISOString();
        await bus.publish({ topic: TOPIC.APPROVED, type: 'story.approved', from: this.id, to: 'publisher', payload: item });
      } else {
        const pending = loadPending();
        pending[item.id] = item;
        savePending(pending);
        log(`⏸ awaiting editor approval #${item.id.slice(0, 8)} — Telegram /approve ${item.id.slice(0, 8)}`);
      }
      handled += 1;
    });

    await bus.poll(this.id, TOPIC.CTRL_APPROVE, async (m: AgentMessage) => {
      const { id } = m.payload as { id: string };
      const pending = loadPending();
      const item = Object.values(pending).find((i) => i.id === id || i.id.startsWith(id));
      if (!item) {
        log(`approve failed: no pending item ${id}`);
        return;
      }
      item.state = 'approved';
      item.approved_by = (m.payload as { by?: string }).by ?? 'telegram';
      item.approved_at = new Date().toISOString();
      item.updated_at = item.approved_at;
      delete pending[item.id];
      savePending(pending);
      log(`✓ approved #${item.id.slice(0, 8)} by ${item.approved_by}`);
      await bus.publish({ topic: TOPIC.APPROVED, type: 'story.approved', from: this.id, to: 'publisher', payload: item });
      handled += 1;
    });

    await bus.poll(this.id, TOPIC.CTRL_REJECT, async (m: AgentMessage) => {
      const { id } = m.payload as { id: string };
      const pending = loadPending();
      const item = Object.values(pending).find((i) => i.id === id || i.id.startsWith(id));
      if (!item) return;
      item.state = 'rejected';
      item.updated_at = new Date().toISOString();
      delete pending[item.id];
      savePending(pending);
      log(`🗑 rejected #${item.id.slice(0, 8)}`);
      await bus.publish({ topic: TOPIC.REJECTED, type: 'story.rejected', from: this.id, to: 'supervisor', payload: item });
      handled += 1;
    });

    return handled;
  }
}

/* ================================================================== */
/* PublisherAgent — website publication                                */
/* ================================================================== */

/** Consumes story.approved; publishes to the website (ingest API path),
 *  then emits story.published to SocialAgent. */
export class PublisherAgent implements AgentHandle {
  readonly id: string;
  readonly topics: string[];
  constructor(private ctx: AgentContext) {
    this.id = ctx.id;
    this.topics = [TOPIC.APPROVED, 'control.resume', 'control.status'];
  }
  describe(): string {
    return 'publishes approved stories to the website (newsroom ingest API)';
  }

  async tick(): Promise<number> {
    const { bus, log, dryRun } = this.ctx;
    const { pushDrafts, type IngestDraft } = await import('../lib/ingest.js');
    const baseUrl = (process.env['BV_BASE_URL'] ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
    const ingestKey = process.env['NEWSROOM_INGEST_KEY'] ?? '';
    let handled = 0;

    await bus.poll(this.id, TOPIC.APPROVED, async (m: AgentMessage) => {
      const item = m.payload as PipelineItem;
      if (!item.rewritten) {
        item.state = 'failed';
        item.error = 'cannot publish: no rewritten story';
        log(`publish failed #${item.id.slice(0, 8)}: no rewritten story`);
        return;
      }
      if (dryRun) {
        log(`[dry-run] would publish #${item.id.slice(0, 8)} to website (${baseUrl})`);
      } else if (baseUrl && ingestKey) {
        const draft: IngestDraft = {
          title: item.rewritten.headline.slice(0, 160),
          dek: item.rewritten.dek.slice(0, 300),
          category: item.source_category ?? 'national',
          body: item.rewritten.body,
          source: item.source_label ?? 'banglar-voice',
          tags: item.rewritten.keywords.slice(0, 6),
          image_url: item.media[0]?.url ?? null,
          agent: 'publisher-agent',
          slug: item.slug || item.id,
        };
        const res = await pushDrafts(baseUrl, ingestKey, [draft]);
        if (!res.ok) log(`website publish failed: ${res.error}`);
      } else {
        log(`website publish skipped: no BV_BASE_URL/NEWSROOM_INGEST_KEY`);
      }
      item.state = 'published';
      item.published_at = new Date().toISOString();
      item.updated_at = item.published_at;
      log(`published #${item.id.slice(0, 8)} → ${baseUrl}/news/${item.slug || item.id}`);
      await bus.publish({ topic: TOPIC.PUBLISHED, type: 'story.published', from: this.id, to: 'social', payload: item });
      handled += 1;
    });
    return handled;
  }
}

/* ================================================================== */
/* SocialAgent — broadcast to every configured platform                */
/* ================================================================== */

/** Consumes story.published; runs each social adapter (all guarded by
 *  config presence), then emits story.broadcast to SupervisorAgent. */
export class SocialAgent implements AgentHandle {
  readonly id: string;
  readonly topics: string[];
  constructor(private ctx: AgentContext) {
    this.id = ctx.id;
    this.topics = [TOPIC.PUBLISHED, 'control.resume', 'control.status'];
  }
  describe(): string {
    return 'broadcasts published stories to Facebook/X/Instagram/LinkedIn/Telegram (config-guarded)';
  }

  async tick(): Promise<number> {
    const { bus, log, dryRun } = this.ctx;
    const {
      FacebookAdapter, TwitterAdapter, InstagramAdapter, LinkedInAdapter, TelegramAdapter,
    } = await import('../lib/publisher.js');
    const env = process.env;
    const adapters = [
      new FacebookAdapter({ pageId: env['FACEBOOK_PAGE_ID'], token: env['FACEBOOK_PAGE_TOKEN'] }),
      new TwitterAdapter({
        appKey: env['TWITTER_APP_KEY'], appSecret: env['TWITTER_APP_SECRET'],
        accessToken: env['TWITTER_ACCESS_TOKEN'], accessSecret: env['TWITTER_ACCESS_SECRET'],
      }),
      new InstagramAdapter({ pageId: env['INSTAGRAM_PAGE_ID'], token: env['INSTAGRAM_TOKEN'], igUserId: env['INSTAGRAM_BUSINESS_ID'] }),
      new LinkedInAdapter({ accessToken: env['LINKEDIN_ACCESS_TOKEN'], personUrn: env['LINKEDIN_PERSON_URN'] }),
      new TelegramAdapter({ botToken: env['TELEGRAM_BOT_TOKEN'], chatId: env['TELEGRAM_CHAT_ID'] }),
    ] as { platform: BroadcastPlatform; isConfigured(): boolean; publish(s: never): Promise<{ ok: boolean; skipped?: boolean; skipped_reason?: string; ref?: string; error?: string }> }[];

    let handled = 0;
    await bus.poll(this.id, TOPIC.PUBLISHED, async (m: AgentMessage) => {
      const item = m.payload as PipelineItem;
      const baseUrl = (process.env['BV_BASE_URL'] ?? '').replace(/\/+$/, '');
      const story = {
        id: item.id,
        slug: item.slug,
        headline: item.rewritten!.headline,
        dek: item.rewritten!.dek,
        body: item.rewritten!.body,
        image: item.media[0] ?? null,
        category: item.source_category,
        keywords: item.rewritten!.keywords,
        source_label: item.source_label,
        url: baseUrl ? `${baseUrl}/news/${item.slug}` : undefined,
      };
      const { buildMessage } = await import('../lib/publisher.js');
      for (const a of adapters) {
        if (dryRun || !a.isConfigured()) {
          const reason = dryRun ? 'dry-run: no network call made' : 'credentials not configured';
          log(`  – ${a.platform}: skipped (${reason})`);
          item.broadcast[a.platform] = { platform: a.platform, ok: true, skipped: true, skipped_reason: reason, at: new Date().toISOString() };
          continue;
        }
        try {
          const res = await a.publish(story as never);
          item.broadcast[a.platform] = res as typeof item.broadcast[string];
          log(res.ok ? `  ✓ ${a.platform}: ${res.ref ?? 'ok'}` : `  ✗ ${a.platform}: ${res.error}`);
        } catch (e) {
          item.broadcast[a.platform] = { platform: a.platform, ok: false, error: e instanceof Error ? e.message : String(e), at: new Date().toISOString() };
          log(`  ✗ ${a.platform}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      item.state = 'broadcast';
      item.updated_at = new Date().toISOString();
      // buildMessage is re-exported from publisher for dry-run proof
      void buildMessage;
      log(`broadcast done #${item.id.slice(0, 8)}`);
      await bus.publish({ topic: TOPIC.BROADCAST, type: 'story.broadcast', from: this.id, to: 'supervisor', payload: item });
      handled += 1;
    });
    return handled;
  }
}

/* Small helper to avoid top-level fs imports in every agent */
function awaitImportFs(): typeof import('node:fs') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('node:fs') as typeof import('node:fs');
}
