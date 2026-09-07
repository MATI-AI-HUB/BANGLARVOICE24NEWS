/**
 * Banglar Voice — standalone news collector.
 *
 * Fetches fresh headlines from public RSS/Atom sources and normalizes them
 * into draft payloads ready for the editorial ingest API. The app is fully
 * independent: NO third-party news API, NO Lovable gateway — just standard
 * HTTPS feeds (Google News RSS is used only as a public index of publisher
 * links; full articles are always fetched from the original outlet and
 * trimmed to a short excerpt + source credit, never republished verbatim).
 */

export type Source = {
  id: string; // unique slug for dedupe
  url: string; // RSS/Atom feed URL
  lang: 'bn' | 'en' | 'both';
  category: string; // one of CATEGORIES in the ingest API
  agent: string; // label shown in the editorial queue
};

export type RawItem = {
  source: Source;
  title: string;
  link: string;
  pubDate: string | null;
  description?: string;
};

/**
 * Default source list — used when NEWS_RSS_URLS is empty.
 * Feeds are the same outlets a human desk would monitor; each story is
 * editor-approved before it is ever published.
 */
export const DEFAULT_SOURCES: Source[] = [
  // National (Bangladesh) — Google News RSS filtered by topic
  { id: 'bn-national', url: 'https://news.google.com/rss/search?q=bangladesh&hl=bn&gl=BD&ceid=BD:bn', lang: 'both', category: 'national', agent: 'collector' },
  { id: 'bn-politics', url: 'https://news.google.com/rss/search?q=%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%A8%E0%A7%80%E0%A6%A4%E0%A6%BF%20%E0%A6%AC%E0%A6%BE%E0%A82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6&hl=bn&gl=BD&ceid=BD:bn', lang: 'bn', category: 'politics', agent: 'collector' },
  { id: 'bn-economy', url: 'https://news.google.com/rss/search?q=%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%A5%E0%A6%A8%E0%A7%80%E0%A6%A4%E0%A6%BF&hl=bn&gl=BD&ceid=BD:bn', lang: 'bn', category: 'economy', agent: 'collector' },
  // International
  { id: 'en-world', url: 'https://news.google.com/rss/search?q=world&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'international', agent: 'collector' },
  // Sports
  { id: 'bn-sports', url: 'https://news.google.com/rss/search?q=%E0%A6%96%E0%A7%87%E0%A6%B2%E0%A6%BE%E0%A6%A7%E0%A7%81%E0%A6%B2%E0%A6%BE&hl=bn&gl=BD&ceid=BD:bn', lang: 'bn', category: 'sports', agent: 'collector' },
  // Technology
  { id: 'bn-tech', url: 'https://news.google.com/rss/search?q=%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%AF%E0%A7%81%E0%A6%95%E0%A7%8D%E0%A6%A4%E0%A6%BF&hl=bn&gl=BD&ceid=BD:bn', lang: 'bn', category: 'technology', agent: 'collector' },
  // Entertainment
  { id: 'bn-ent', url: 'https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BF%E0%A6%A8%E0%A7%8B%E0%A6%A6%E0%A6%A8&hl=bn&gl=BD&ceid=BD:bn', lang: 'bn', category: 'entertainment', agent: 'collector' },
];

const MAX_ITEMS_PER_SOURCE = 10;
const MAX_DESC_LENGTH = 600;
const TIMEOUT_MS = 15_000;

export function parseSourceList(envValue: string | undefined): Source[] {
  const raw = (envValue ?? '').trim();
  if (!raw) return DEFAULT_SOURCES;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url, i) => ({
      id: `custom-${i}`,
      url,
      lang: 'both' as const,
      category: 'national',
      agent: 'collector',
    }));
}

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export async function fetchSource(source: Source, signal?: AbortSignal): Promise<RawItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(source.url, {
      headers: { 'user-agent': 'BanglarVoiceCollector/2.0 (+https://banglarvoice24news.com)' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseRss(xml, source).slice(0, MAX_ITEMS_PER_SOURCE);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Minimal, dependency-free RSS/Atom parser (works for the <item> shape that
 * Google News RSS and most outlets emit). Atom entries are mapped too.
 */
export function parseRss(xml: string, source: Source): RawItem[] {
  const out: RawItem[] = [];
  const items = xml.match(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/g) ?? [];

  for (const block of items) {
    const title = decodeEntities((block.match(/<(?:title)[^>]*>([\s\S]*?)<\/(?:title)>/) ?? [])[1] ?? '').trim();
    const link = decodeEntities((block.match(/<link[^>]*href="([^"]+)"/) ?? block.match(/<link[^>]*>([\s\S]*?)<\/link>/) ?? [])[1] ?? '').trim();
    const pubDate = (block.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/) ?? [])[1]?.trim() ?? null;
    const description = decodeEntities((block.match(/<description[^>]*>([\s\S]*?)<\/description>/) ?? [])[1] ?? '').trim();

    if (!title || !link) continue;
    out.push({ source, title, link, pubDate, description: description.slice(0, MAX_DESC_LENGTH) });
  }
  return out;
}

export function isFresh(pubDate: string | null, maxAgeMs: number): boolean {
  if (!pubDate) return true; // no date → let the dedupe window decide
  const t = Date.parse(pubDate);
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= maxAgeMs;
}
