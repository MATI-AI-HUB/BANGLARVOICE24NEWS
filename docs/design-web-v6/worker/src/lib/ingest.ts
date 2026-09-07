/**
 * Banglar Voice — standalone newsroom ingest client.
 *
 * Pushes collected drafts into the editorial queue via the app's own
 * POST /api/public/ingest endpoint (the exact same protected API the admin
 * console reads). Nothing is auto-published: every draft lands as
 * status='pending' and requires a human editor's approval — this matches the
 * published editorial policy and keeps the outlet fully independent.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type IngestDraft = {
  title: string;
  dek: string;
  category: string;
  body: string[];
  source: string;
  tags: string[];
  image_url: string | null;
  agent: string;
  slug: string;
};

const BATCH_SIZE = 10;
const INGEST_TIMEOUT_MS = 30_000;

function makeClient(): SupabaseClient {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — see .env.example');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Query-only client used for dedupe lookups against newsroom_queue + posts. */
export function getDbClient(): SupabaseClient {
  return makeClient();
}

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90)
  );
}

/**
 * Returns true when the slug (or its base form) already exists either in the
 * editorial queue (any status) or among previously approved/published posts.
 * newsroom_queue is RLS-locked for anon — the service-role client reads it.
 */
export async function slugExists(db: SupabaseClient, slug: string): Promise<boolean> {
  const base = slug.slice(0, 80);
  const { data: q } = await db
    .from('newsroom_queue')
    .select('slug')
    .or(`slug.eq.${slug},slug.like.${base}-%`)
    .limit(1);
  if (q && q.length > 0) return true;

  // Backstop: some flows may have mirrored approved rows into a `posts` table.
  try {
    const { data: p } = await db.from('posts').select('slug').eq('slug', slug).limit(1);
    if (p && p.length > 0) return true;
  } catch {
    /* table absent — fine */
  }
  return false;
}

function dedupeWindowHash(href: string): string {
  // Google News RSS wraps real publisher links in a redirect URL; hash the
  // first stable query part when present so the same story is not re-queued
  // on every 15-minute cycle within the dedupe window.
  const m = href.match(/[?&]url=([^&]+)/);
  const target = m ? decodeURIComponent(m[1]) : href;
  return slugify(target.split('?')[0].replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]+/g, '-')).slice(0, 80);
}

export type IngestResult = {
  ok: boolean;
  queued?: number;
  items?: { id: string; slug: string; status: string }[];
  error?: string;
  note?: string;
};

/** POST one batch of drafts to the app's own ingest API. */
export async function pushDrafts(baseUrl: string, ingestKey: string, drafts: IngestDraft[]): Promise<IngestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/public/ingest`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ingest-key': ingestKey,
      },
      body: JSON.stringify(drafts),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as IngestResult;
    if (!res.ok) {
      return { ok: false, error: body.error ?? `HTTP ${res.status}` };
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs a single collection cycle:
 *  1. loads sources (env override or defaults),
 *  2. fetches + parses feeds,
 *  3. filters fresh items, normalizes to drafts, applies the dedupe window,
 *  4. pushes to the app ingest API in batches.
 */
export type RunCycleOptions = {
  baseUrl: string;
  ingestKey: string;
  db: SupabaseClient;
  sources: { id: string; url: string; lang: 'bn' | 'en' | 'both'; category: string; agent: string }[];
  signal?: AbortSignal;
  log: (msg: string) => void;
  dryRun?: boolean;
};

export type RunCycleResult = {
  collected: number;
  fresh: number;
  queued: number;
  skipped: number;
  errors: string[];
};

export async function runCycle(opts: RunCycleOptions): Promise<RunCycleResult> {
  const { baseUrl, ingestKey, db, sources, signal, log, dryRun } = opts;
  const seen = new Set<string>();
  const errors: string[] = [];
  let skippedDup = 0;
  const allDrafts: IngestDraft[] = [];

  for (const source of sources) {
    if (signal?.aborted) break;
    try {
      const { fetchSource, isFresh } = await import('./collector.js');
      const items = await fetchSource(source, signal);
      const fresh = items.filter((it) => isFresh(it.pubDate, 1000 * 60 * 60 * 36)); // 36h window
      log(`[${source.id}] ${items.length} items, ${fresh.length} fresh`);
      for (const it of fresh) {
        if (seen.has(it.link)) continue;
        seen.add(it.link);

        const title = it.title.trim().slice(0, 160);
        const slug = dedupeWindowHash(it.link) || slugify(title);
        if (!slug || title.length < 5) continue;
        if (await slugExists(db, slug)) {
          skippedDup += 1;
          continue;
        }

        const excerpt = (it.description ?? '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 400);
        const body = excerpt
          ? [`${excerpt}\n\nবিস্তারিত: ${it.link}`.slice(0, 900)]
          : [`সম্পূর্ণ প্রতিবেদন: ${it.link}`];
        const sourceLabel = new URL(it.link).hostname.replace(/^www\./, '').slice(0, 200);
        const category = source.category ?? 'national';

        allDrafts.push({
          title,
          dek: excerpt.slice(0, 300),
          category,
          body,
          source: sourceLabel,
          tags: [],
          image_url: null,
          agent: source.agent ?? 'collector',
          slug,
        });
      }
    } catch (e) {
      errors.push(`[${source.id}] ${e instanceof Error ? e.message : String(e)}`);
      log(`[${source.id}] ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let queued = 0;
  if (!dryRun && allDrafts.length > 0) {
    for (let i = 0; i < allDrafts.length; i += BATCH_SIZE) {
      const batch = allDrafts.slice(i, i + BATCH_SIZE);
      const res = await pushDrafts(baseUrl, ingestKey, batch);
      if (res.ok) {
        queued += res.queued ?? batch.length;
        log(`queued batch ${i / BATCH_SIZE + 1}: ${res.queued ?? batch.length}`);
      } else {
        errors.push(`ingest batch failed: ${res.error ?? 'unknown'}`);
        log(`ingest batch ERROR: ${res.error}`);
      }
    }
  } else {
    log(dryRun ? `[dry-run] would queue ${allDrafts.length}` : 'no fresh drafts this cycle');
  }

  return { collected: allDrafts.length, fresh: allDrafts.length, queued, skipped: skippedDup, errors };
}
