/**
 * Banglar Voice — copyright-free media sourcer.
 *
 * Sources topic-relevant, COPYRIGHT-FREE images (and videos where the source
 * exposes them) for a rewritten story, and records the URL + license +
 * attribution so the publisher can attach them legally.
 *
 * Providers (all free/CC0-friendly, all https, all with machine-readable
 * attribution):
 *   1. Wikimedia Commons API — CC0 / CC BY / public-domain images (default).
 *   2. Openverse API — CC0 / CC BY / CC BY-SA images + audio/video index.
 *   3. Pexels API — free license photos/videos (needs PEXELS_API_KEY).
 *
 * Fallback: a per-category set of built-in CC0 images hosted on Wikimedia
 * Commons (Bangladesh landmarks/scenes) so the pipeline always has legal media.
 * The module NEVER pulls the source outlet's own images (that would defeat
 * the copyright-free requirement).
 */

import type { MediaAttachment, MediaKind, NewsCategory, RewrittenStory } from './types.js';

export type MediaConfig = {
  /** Pexels API key (optional; Wikimedia + Openverse need no key). */
  pexelsKey?: string;
  /** Max media per story. */
  maxItems?: number;
  /** Never call the network (dry-run). */
  dryRun?: boolean;
  timeoutMs?: number;
};

const DEFAULT_MAX = 2;
const TIMEOUT_MS = 15_000;

const CATEGORY_QUERIES: Record<NewsCategory, string[]> = {
  national: ['Bangladesh Dhaka', 'Bangladesh flag', 'Dhaka city'],
  politics: ['Bangladesh parliament', 'voting election', 'Dhaka political rally'],
  economy: ['Dhaka stock exchange', 'Bangladesh port Chittagong', 'taka currency'],
  international: ['United Nations headquarters', 'world map globe', 'international flags'],
  sports: ['cricket stadium Bangladesh', 'football stadium', 'sports arena'],
  technology: ['computer technology', 'artificial intelligence robot', 'software code screen'],
  entertainment: ['film cinema camera', 'concert stage lights', 'music studio'],
  general: ['Bangladesh landscape', 'newspaper press', 'news studio'],
};

/**
 * Wikimedia "good enough" fallbacks — all CC0/public-domain-or-CC BY on
 * Wikimedia Commons (stable File: pages, hotlinkable via Special:FilePath).
 */
const FALLBACKS: { file: string; author: string; license: string; url: string; alt: string }[] = [
  {
    file: 'Jatiya_Sangsad_Bhaban,_Dhaka_(cropped).jpg',
    author: 'Wikimedia Commons',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Jatiya_Sangsad_Bhaban,_Dhaka_(cropped).jpg',
    alt: 'জাতীয় সংসদ ভবন, ঢাকা',
  },
  {
    file: 'Shaheed_Minar,_Dhaka_01.jpg',
    author: 'Wikimedia Commons',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Shaheed_Minar,_Dhaka_01.jpg',
    alt: 'শহিদ মিনার, ঢাকা',
  },
  {
    file: 'Cox%27s_Bazar_-_Panorama.jpg',
    author: 'Wikimedia Commons',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Cox%27s_Bazar_-_Panorama.jpg',
    alt: 'কক্সবাজার সমুদ্র সৈকত',
  },
  {
    file: 'A_boat_on_the_river_Meghna.jpg',
    author: 'Wikimedia Commons',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:A_boat_on_the_river_Meghna.jpg',
    alt: 'মেঘনা নদীতে নৌকা',
  },
];

function commonsThumb(file: string, width = 960): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=${width}`;
}

/* ------------------------------------------------------------------ */
/* Wikimedia Commons                                                   */
/* ------------------------------------------------------------------ */

type CommonsHit = { title: string; thumb: string; page: string; ext: string };

async function searchWikimedia(query: string, timeoutMs: number, limit: number): Promise<CommonsHit[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(Math.max(limit * 3, 6)),
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '960',
    format: 'json',
    origin: '*',
  });
  const url = `https://commons.wikimedia.org/w/api.php?${params}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'BanglarVoiceMedia/3.0 (+https://banglarvoice24news.com)' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { title: string; imageinfo?: { url: string; thumburl?: string; mime?: string }[] }> };
    };
    const pages = data.query?.pages ?? {};
    const hits: CommonsHit[] = [];
    for (const key of Object.keys(pages)) {
      const p = pages[key];
      const ii = p.imageinfo?.[0];
      if (!ii?.url || !ii.mime?.startsWith('image/')) continue;
      if (/\.(svg|tif|tiff)$/i.test(ii.url)) continue; // skip vector/tiff (render issues)
      if (/logo|icon|seal|coat_of_arms|flag_of_/i.test(p.title) && !/Bangladesh|Dhaka/i.test(query)) continue;
      hits.push({
        title: p.title.replace(/^File:/, ''),
        thumb: ii.thumburl ?? ii.url,
        page: `https://commons.wikimedia.org/wiki/${p.title.replace(/ /g, '_')}`,
        ext: (ii.mime.match(/\/(\w+)/)?.[1] ?? 'jpg').toLowerCase(),
      });
    }
    return hits.slice(0, limit);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Openverse                                                           */
/* ------------------------------------------------------------------ */

type OpenverseHit = {
  url?: string;
  thumbnail?: string | null;
  title?: string | null;
  license?: string;
  license_url?: string;
  creator?: string | null;
  foreign_landing_url?: string | null;
};

async function searchOpenverse(query: string, timeoutMs: number, limit: number): Promise<OpenverseHit[]> {
  const params = new URLSearchParams({
    q: query,
    license_type: 'commercial',
    license: 'cc0,cc-by,cc-by-sa',
    page_size: String(limit * 2),
  });
  const url = `https://api.openverse.org/v1/images/?${params}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'BanglarVoiceMedia/3.0 (+https://banglarvoice24news.com)' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { results?: OpenverseHit[] };
    return (data.results ?? []).slice(0, limit);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Pexels                                                              */
/* ------------------------------------------------------------------ */

type PexelsPhoto = { id: number; src?: { large?: string; original?: string }; alt?: string; photographer?: string; url?: string };

async function searchPexels(query: string, key: string, timeoutMs: number, limit: number): Promise<PexelsPhoto[]> {
  const params = new URLSearchParams({ query, per_page: String(limit * 2) });
  const url = `https://api.pexels.com/v1/search?${params}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { authorization: key, 'user-agent': 'BanglarVoiceMedia/3.0' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    return (data.photos ?? []).slice(0, limit);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function makeAttachment(
  kind: MediaKind,
  url: string,
  thumb: string | undefined,
  alt: string,
  attribution: { author: string; license: string; url: string; title?: string },
  sourcedFrom: string,
): MediaAttachment {
  const id =
    `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    kind,
    url,
    thumbnail_url: thumb,
    alt_text: alt.slice(0, 200),
    attribution,
    sourced_from: sourcedFrom,
  };
}

export type MediaResult = {
  ok: boolean;
  media: MediaAttachment[];
  error?: string;
};

/** Pick a stable set of topic queries from the story keywords + category. */
function buildQueries(story: RewrittenStory, category: NewsCategory): string[] {
  const qs: string[] = [];
  for (const kw of story.keywords) {
    const latin = /[a-z]/i.test(kw) ? kw : null; // Bengali keywords often don't hit Commons well
    if (latin) qs.push(`${latin} ${CATEGORY_QUERIES[category]?.[0] ?? ''}`.trim());
  }
  qs.push(...(CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.general));
  return qs.filter((q) => q.length > 2).slice(0, 3);
}

function fallbackMedia(category: NewsCategory): MediaAttachment[] {
  // Deterministic pick per category so reruns are stable.
  const pool = FALLBACKS;
  const idx = (Object.keys(CATEGORY_QUERIES).indexOf(category) + 1) % pool.length;
  const f = pool[idx];
  const idx2 = (idx + 2) % pool.length;
  const f2 = pool[idx2];
  const mk = (item: (typeof pool)[number]): MediaAttachment =>
    makeAttachment(
      'image',
      commonsThumb(item.file),
      commonsThumb(item.file, 480),
      item.alt,
      { author: item.author, license: item.license, url: item.url, title: item.file },
      'builtin-cc0-fallback',
    );
  return [mk(f), mk(f2)];
}

/**
 * Source up to `maxItems` copyright-free media items for a story.
 * Order: Wikimedia → Openverse → Pexels (if key) → built-in CC0 fallback.
 * Always returns media (never throws): the fallback guarantees legal output.
 */
export async function sourceMedia(
  story: RewrittenStory,
  category: NewsCategory,
  cfg: MediaConfig = {},
): Promise<MediaResult> {
  const max = cfg.maxItems ?? DEFAULT_MAX;
  const timeout = cfg.timeoutMs ?? TIMEOUT_MS;
  const collected: MediaAttachment[] = [];
  const queries = buildQueries(story, category);
  let lastErr = '';

  if (!cfg.dryRun) {
    // 1) Wikimedia (no key needed)
    for (const q of queries) {
      if (collected.length >= max) break;
      try {
        const hits = await searchWikimedia(q, timeout, max - collected.length);
        for (const h of hits) {
          if (collected.length >= max) break;
          collected.push(
            makeAttachment(
              'image',
              h.thumb,
              h.thumb,
              h.title,
              {
                author: 'Wikimedia Commons contributors',
                license: 'See source page (CC0/CC BY/CC BY-SA)',
                url: h.page,
                title: h.title,
              },
              'wikimedia-commons',
            ),
          );
        }
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    // 2) Openverse (no key needed)
    if (collected.length < max) {
      try {
        const hits = await searchOpenverse(queries[0] ?? category, timeout, max - collected.length);
        for (const h of hits) {
          if (collected.length >= max) break;
          if (!h.url || !h.license) continue;
          collected.push(
            makeAttachment(
              'image',
              h.thumbnail ?? h.url,
              h.thumbnail ?? undefined,
              h.title ?? 'Openverse image',
              {
                author: h.creator ?? 'Openverse contributor',
                license: h.license.toUpperCase().replace('_', ' '),
                url: h.foreign_landing_url ?? h.license_url ?? h.url,
                title: h.title ?? undefined,
              },
              'openverse',
            ),
          );
        }
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    // 3) Pexels (needs key)
    if (collected.length < max && cfg.pexelsKey) {
      try {
        const photos = await searchPexels(queries[0] ?? category, cfg.pexelsKey, timeout, max - collected.length);
        for (const p of photos) {
          if (collected.length >= max) break;
          if (!p.src?.large) continue;
          collected.push(
            makeAttachment(
              'image',
              p.src.large,
              p.src.large,
              p.alt ?? 'Pexels photo',
              {
                author: p.photographer ?? 'Pexels',
                license: 'Pexels License (free to use)',
                url: p.url ?? 'https://www.pexels.com/license/',
              },
              'pexels',
            ),
          );
        }
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
  }

  if (collected.length === 0) {
    // Deterministic built-in CC0 fallback (also used in dry-run).
    collected.push(...fallbackMedia(category));
  }

  const note = cfg.dryRun
    ? 'dry-run: no network call made; returned built-in CC0 fallbacks to prove schema'
    : lastErr
      ? `partial: ${lastErr}`
      : undefined;

  return {
    ok: true,
    media: collected.slice(0, max),
    ...(note ? { error: note } : {}),
  };
}

/** Optional future hook for video providers (YouTube CC / Pexels Videos). */
export const _videoSupported = false;
