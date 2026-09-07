/**
 * Banglar Voice — fully autonomous 24/7 newsroom pipeline entrypoint.
 *
 * Runs the endless loop:
 *   collect → rewrite (copyright-free) → source CC0 media
 *         → editorial gate (human / Telegram OR auto-publish)
 *         → publish to website + broadcast to social + Telegram
 *
 *   npm run worker            # normal mode (endless)
 *   npm run worker:dry        # dry-run demo of the whole graph, no writes
 *   npm run worker:once       # one full live cycle, then exit
 *
 * Env: see worker/.env.example.
 */

import { runPipelineCycle, sampleItem, processDraft, type SocialEnv } from './lib/orchestrator.js';
import { getDbClient } from './lib/ingest.js';
import { parseSourceList } from './lib/collector.js';
import { sourceMedia } from './lib/media.js';
import { rewriteItem, type RewriteConfig } from './lib/rewriter.js';
import { parseCommand } from './lib/telegram.js';
import type { RawItem } from './lib/collector.js';
import type { PipelineItem } from './lib/types.js';

const DEFAULT_INTERVAL_MIN = 15;
const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';

function iso(ts = Date.now()): string {
  return new Date(ts).toISOString();
}

function envStr(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function readCfg(dryRun: boolean) {
  const log = (m: string) => console.log(`${iso()} ${m}`);
  const baseUrl = (envStr('BV_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const ingestKey = envStr('NEWSROOM_INGEST_KEY') ?? '';
  const social: SocialEnv = {
    FACEBOOK_PAGE_ID: envStr('FACEBOOK_PAGE_ID'),
    FACEBOOK_PAGE_TOKEN: envStr('FACEBOOK_PAGE_TOKEN'),
    TWITTER_APP_KEY: envStr('TWITTER_APP_KEY'),
    TWITTER_APP_SECRET: envStr('TWITTER_APP_SECRET'),
    TWITTER_ACCESS_TOKEN: envStr('TWITTER_ACCESS_TOKEN'),
    TWITTER_ACCESS_SECRET: envStr('TWITTER_ACCESS_SECRET'),
    INSTAGRAM_PAGE_ID: envStr('INSTAGRAM_PAGE_ID'),
    INSTAGRAM_BUSINESS_ID: envStr('INSTAGRAM_BUSINESS_ID'),
    INSTAGRAM_TOKEN: envStr('INSTAGRAM_TOKEN'),
    LINKEDIN_ACCESS_TOKEN: envStr('LINKEDIN_ACCESS_TOKEN'),
    LINKEDIN_PERSON_URN: envStr('LINKEDIN_PERSON_URN'),
    TELEGRAM_BOT_TOKEN: envStr('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_CHAT_ID: envStr('TELEGRAM_CHAT_ID'),
  };
  const rewriteCfg: RewriteConfig = {
    baseUrl: envStr('CHAT_AI_BASE_URL') ?? 'https://api.openai.com/v1',
    apiKey: envStr('CHAT_AI_KEY') ?? '',
    model: envStr('CHAT_AI_MODEL') ?? 'gpt-4o-mini',
    dryRun,
  };
  const mediaCfg = {
    pexelsKey: envStr('PEXELS_API_KEY'),
    dryRun,
  };
  const autoPublish = envStr('AUTO_PUBLISH') === 'true';
  const pollTelegram = Boolean(social.TELEGRAM_BOT_TOKEN);
  return { log, baseUrl, ingestKey, social, rewriteCfg, mediaCfg, autoPublish, pollTelegram };
}

function readStateFile(): string | undefined {
  return envStr('PIPELINE_STATE_FILE');
}

/* ------------------------------------------------------------------ */
/* Dry-run demo: exercise the WHOLE graph on a sample item + print     */
/* ------------------------------------------------------------------ */

async function demoDryRun(): Promise<void> {
  console.log(`\n${iso()} === Banglar Voice pipeline — DRY-RUN demo ===`);
  const { log, rewriteCfg, mediaCfg, autoPublish } = readCfg(true);

  console.log('\n[1/5] COLLECT  — sample item (no network)');
  const item = sampleItem();
  console.log(`  • ${item.original_title}`);
  console.log(`  • category=${item.source_category}, slug=${item.slug}`);

  console.log('\n[2/5] REWRITE  — copyright-free Bangla (AI key present? ' + (rewriteCfg.apiKey ? 'yes → AI' : 'no → deterministic fallback') + ')');
  const raw: RawItem = {
    source: { id: 'demo', url: item.original_link!, lang: 'bn', category: item.source_category!, agent: 'demo' },
    title: item.original_title!,
    link: item.original_link!,
    pubDate: item.collected_at,
    description:
      'ঢাকা মেট্রোরেল কর্তৃপক্ষ আজ নতুন লাইন উদ্বোধনের ঘোষণা দিয়েছে। যাত্রীদের জন্য আগামী সপ্তাহ থেকে পরীক্ষামূলক চালু হবে বলে জানানো হয়েছে।',
  };
  const rw = await rewriteItem(raw, { ...rewriteCfg, dryRun: true });
  console.log(`  ✓ headline: ${rw.story?.headline}`);
  console.log(`  ✓ dek: ${rw.story?.dek}`);
  for (const p of (rw.story?.body ?? []).slice(0, 2)) console.log(`  ✓ ¶ ${p.slice(0, 110)}…`);
  console.log(`  ✓ method: ${rw.story?.method}`);
  console.log(`  ✓ source_hash: ${rw.story?.source_hash}`);

  console.log('\n[3/5] MEDIA  — CC0 sourcing (no network)');
  const med = await sourceMedia(rw.story!, item.source_category!, { dryRun: true });
  for (const m of med.media) {
    console.log(`  ✓ ${m.kind}: ${m.url}`);
    console.log(`    attribution: ${m.attribution.author} • ${m.attribution.license} • ${m.attribution.url}`);
  }

  console.log('\n[4/5] TELEGRAM COMMAND PARSER  (pure, no network)');
  const samples = ['/publish q_abc12345', '/approve demo_00000001', '/status', '/pause', '/media demo_00000001', '/bogus'];
  for (const s of samples) {
    const c = parseCommand(s);
    console.log(`  • ${s.padEnd(28)} → ${JSON.stringify(c)}`);
  }

  console.log('\n[5/5] PUBLISH + BROADCAST  (simulated — every adapter reports skip)');
  const demoState = { items: {} as Record<string, PipelineItem> };
  await processDraft({
    item,
    rewriteCfg: { ...rewriteCfg, dryRun: true },
    mediaCfg: { dryRun: true },
    autoPublish,
    dryRun: true,
    state: demoState,
    log,
    save: () => undefined,
  });

  console.log(`\n${iso()} === dry-run complete: zero network writes were made ===`);
}

/* ------------------------------------------------------------------ */
/* Live loop                                                           */
/* ------------------------------------------------------------------ */

export async function runLive(opts: { once?: boolean }): Promise<void> {
  const { log, baseUrl, ingestKey, social, rewriteCfg, mediaCfg, autoPublish, pollTelegram } = readCfg(false);
  const intervalMin = Number(envStr('INTERVAL_MINUTES') ?? DEFAULT_INTERVAL_MIN);
  if (!ingestKey) throw new Error('Missing NEWSROOM_INGEST_KEY — see worker/.env.example');
  // Validate Supabase env up front so a misconfig fails fast instead of at 3am.
  getDbClient();

  log(`Banglar Voice autonomous pipeline starting (interval=${intervalMin}m, base=${baseUrl})`);
  log(`mode: ${autoPublish ? 'AUTO-PUBLISH (no human gate)' : 'human-in-the-loop (default)'}`);
  log(`telegram control: ${pollTelegram ? 'enabled' : 'not configured (no TELEGRAM_BOT_TOKEN)'}`);
  const platforms = [
    social.FACEBOOK_PAGE_ID ? 'facebook' : null,
    social.TWITTER_ACCESS_TOKEN ? 'twitter' : null,
    social.INSTAGRAM_TOKEN ? 'instagram' : null,
    social.LINKEDIN_ACCESS_TOKEN ? 'linkedin' : null,
    social.TELEGRAM_BOT_TOKEN ? 'telegram' : null,
  ].filter(Boolean);
  log(`social broadcast targets: ${platforms.length ? platforms.join(', ') : 'none configured (see .env.example)'}`);

  const stateFile = readStateFile();
  const controller = new AbortController();
  const onSig = () => controller.abort();
  process.on('SIGINT', onSig);
  process.on('SIGTERM', onSig);

  try {
    while (true) {
      const sources = parseSourceList(envStr('NEWS_RSS_URLS'));
      log(`cycle: ${sources.length} sources`);
      const result = await runPipelineCycle({
        cfg: {
          baseUrl,
          ingestKey,
          dryRun: false,
          log,
          stateFile,
        },
        rewriteCfg,
        mediaCfg,
        social,
        autoPublish,
        pollTelegram,
        stateFile,
      });
      log(
        `cycle done: collected=${result.collected} rewrote=${result.rewrote} ` +
          `pending=${result.pending} autoPublished=${result.autoPublished} errors=${result.errors.length}`,
      );
      if (result.errors.length > 0) log(`errors: ${result.errors.slice(0, 5).join(' | ')}`);
      if (opts.once) break;
      log(`sleeping ${intervalMin} minutes…`);
      await sleep(intervalMin * 60_000, controller.signal);
    }
  } finally {
    process.off('SIGINT', onSig);
    process.off('SIGTERM', onSig);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// CLI entry
const args = process.argv.slice(2);
const isDry = args.includes('--dry-run');
const isOnce = args.includes('--once');

if (isDry) {
  demoDryRun().then(
    () => process.exit(0),
    (e) => {
      console.error(`${iso()} fatal:`, e);
      process.exit(1);
    },
  );
} else {
  runLive({ once: isOnce }).then(
    () => process.exit(0),
    (e) => {
      console.error(`${iso()} fatal:`, e);
      process.exit(1);
    },
  );
}
