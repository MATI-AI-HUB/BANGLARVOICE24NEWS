import type { FeedArticle } from './mockData';
import type { LiveEntry } from '../components/live-blog';
import type { VideoItem } from '../components/video-hub';
import { createClient } from '@supabase/supabase-js';

/**
 * Banglar Voice — typed API client.
 *   • articles  → Supabase (primary source)
 *   • live/videos → PocketBase (secondary feeds)
 */

const PB_BASE =
  process.env.ENABLE_LEGACY_POCKETBASE === 'true' &&
  process.env.NODE_ENV !== 'production'
    ? process.env.NEXT_PUBLIC_API_URL || ''
    : '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase =
  SUPABASE_URL && SUPABASE_ANON
    ? createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Bengali display labels for category keys — Bengali-first UX
const CATEGORY_LABELS: Record<string, string> = {
  national: 'জাতীয়',
  politics: 'রাজনীতি',
  economy: 'অর্থনীতি',
  sports: 'খেলাধুলা',
  entertainment: 'বিনোদন',
  tech: 'প্রযুক্তি',
  health: 'স্বাস্থ্য',
  education: 'শিক্ষা',
  international: 'বিশ্ব',
  city: 'নগর',
};

function categoryLabel(raw: string | null | undefined): string {
  const v = (raw || '').trim();
  if (!v) return 'সর্বশেষ';
  // If already Bengali label, return as-is
  for (const label of Object.values(CATEGORY_LABELS)) {
    if (label === v) return v;
  }
  // Otherwise map English key
  return CATEGORY_LABELS[v.toLowerCase()] || v;
}

// Bengali numerals
const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const BN_MONTHS = [
  'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
];

function toBn(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}

function bengaliDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${toBn(d.getFullYear())}`;
}

function timeAgoBn(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'এইমাত্র';
  if (mins < 60) return `${toBn(mins)} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${toBn(hrs)} ঘণ্টা আগে`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${toBn(days)} দিন আগে`;
  return bengaliDate(iso);
}

async function safeFetch<T>(url: string, timeoutMs = 4000, empty: T): Promise<T> {
  try {
    const r = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } catch {
    return empty;
  }
}

type SupabaseArticle = {
  id: string;
  slug?: string | null;
  title_bn?: string | null;
  title_en?: string | null;
  content_bn?: string | null;
  content_en?: string | null;
  category?: string | null;
  category_key?: string | null;
  thumbnail_url?: string | null;
  featured_image?: string | null;
  excerpt_bn?: string | null;
  status?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  image_credit?: string | null;
  image_alt_bn?: string | null;
  image_is_representational?: boolean | null;
  is_fallback?: boolean | null;
  canonical_url?: string | null;
  origin?: string | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateReadTime(content: string): number {
  return Math.max(1, Math.round(content.length / 750));
}

function mapArticle(row: SupabaseArticle | null | undefined): FeedArticle | null {
  if (!row || typeof row.id !== 'string' || !row.id) return null;
  const body = row.content_bn || row.excerpt_bn || '';
  const summary = stripHtml(row.excerpt_bn || body).slice(0, 220);
  const pubIso = row.published_at || row.created_at || undefined;
  const readMin = estimateReadTime(body);
  const title = (row.title_bn || '').trim() || 'শিরোনাম পাওয়া যায়নি';
  return {
    id: row.id,
    slug: row.slug || row.id,
    title_bn: title,
    title_en: row.title_en || undefined,
    dek_bn: summary,
    dek_en: row.content_en ? stripHtml(row.content_en).slice(0, 220) : undefined,
    category: categoryLabel(row.category || row.category_key),
    featured_image: row.thumbnail_url || row.featured_image || '',
    reading_time_min: readMin,
    bias_index: 50,
    published_at: pubIso,
    published_at_bn: bengaliDate(pubIso),
    time_ago_bn: timeAgoBn(pubIso),
    reading_time_bn: `${toBn(readMin)} মিনিট পড়া`,
    source_name: row.source_name || '',
    source_url: row.source_url || row.canonical_url || '',
    image_credit: row.image_credit || '',
    image_alt_bn: row.image_alt_bn || undefined,
    image_is_representational: Boolean(row.image_is_representational || row.is_fallback),
    origin: row.origin === 'original' ? 'original' : 'aggregated',
  };
}

export type ArticleResponse = { items: FeedArticle[] };
export type LiveResponse = { entries: LiveEntry[] };
export type VideosResponse = { videos: VideoItem[] };


type PublicFeedItem = {
  id: string;
  url?: string;
  title?: string;
  summary?: string;
  content_text?: string;
  date_published?: string;
  category_key?: string;
  category_label?: string;
  banner_image?: string;
  source_name?: string;
  source_url?: string;
  image_credit?: string;
  image_is_representational?: boolean;
  origin?: 'aggregated' | 'original';
  external_url?: string;
};

type PublicFeedResponse = {
  items?: PublicFeedItem[];
};

export function publicFeedItemToArticle(item: PublicFeedItem): FeedArticle {
  const fallbackSlug = item.url
    ? item.url.replace(/\/+$/, '').split('/').pop() || item.id
    : item.id;
  const content = item.content_text || item.summary || '';
  const publishedAt = item.date_published || new Date(0).toISOString();
  const readingTime = estimateReadTime(content);

  return {
    id: item.id,
    slug: fallbackSlug,
    title_bn: item.title || 'শিরোনাম পাওয়া যায়নি',
    dek_bn: item.summary || stripHtml(content).slice(0, 220),
    category: categoryLabel(item.category_label || item.category_key),
    featured_image: item.banner_image || '',
    reading_time_min: readingTime,
    bias_index: 50,
    published_at: publishedAt,
    published_at_bn: bengaliDate(publishedAt),
    time_ago_bn: timeAgoBn(publishedAt),
    reading_time_bn: `${toBn(readingTime)} মিনিট পড়া`,
    source_name: item.source_name || '',
    source_url: item.source_url || item.external_url || '',
    image_credit: item.image_credit || '',
    image_is_representational: Boolean(item.image_is_representational),
    origin: item.origin === 'original' ? 'original' : 'aggregated',
  };
}

export const api = {
  base: PB_BASE,

  async articles(limit = 20): Promise<ArticleResponse> {
    try {
      const { fetchPublishedArticlesFeed } = await import('./supabase/published-articles');
      const rows = await fetchPublishedArticlesFeed();
      const items = (rows as SupabaseArticle[])
        .map(mapArticle)
        .filter((item): item is FeedArticle => item !== null)
        .slice(0, limit);
      if (items.length) return { items };
    } catch {
      /* public JSON feed fallback */
    }

    const { canonicalSiteUrl } = await import('./site');
    const siteOrigin = canonicalSiteUrl();

    const response = await fetch(`${siteOrigin}/api/public/feed.json`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/feed+json, application/json' },
    });

    if (!response.ok) {
      throw new Error(`Public feed request failed with HTTP ${response.status}`);
    }

    const feed = (await response.json()) as PublicFeedResponse;
    const sourceItems = Array.isArray(feed.items) ? feed.items : [];

    if (!sourceItems.length) {
      throw new Error('Public feed returned zero published articles');
    }

    return {
      items: sourceItems.slice(0, limit).map(publicFeedItemToArticle),
    };
  },

  async article(slug: string): Promise<Record<string, unknown>> {
    if (!UUID_RE.test(slug)) {
      return {};
    }
    if (!supabase) {
      return {};
    }
    try {
      const { fetchPublishedArticleById, fetchPublishedArticleBySlug } = await import('./supabase/published-articles');
      const data = UUID_RE.test(slug)
        ? await fetchPublishedArticleById(slug, supabase)
        : await fetchPublishedArticleBySlug(slug, supabase);
      if (!data) return {};
      const row = data as SupabaseArticle;
      const base = mapArticle(row);
      if (!base) return {};
      return {
        ...base,
        body_bn: row.content_bn || row.excerpt_bn || '',
        body_en: row.content_en || undefined,
        featured_image: row.thumbnail_url || row.featured_image || '',
        author_name: row.source_name || '',
        source_url: row.source_url || row.canonical_url || '',
        source_name: row.source_name || '',
        image_credit: row.image_credit || '',
        image_alt_bn: row.image_alt_bn || '',
        image_is_representational: Boolean(row.image_is_representational || row.is_fallback),
        tags: [] as string[],
      };
    } catch {
      return {};
    }
  },

  live(): Promise<LiveResponse> {
    return safeFetch<LiveResponse>(`/api/public/live.json`, 4500, { entries: [] });
  },

  async videos(): Promise<VideosResponse> {
    if (!supabase) return { videos: [] };
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title_bn, title_en, category_key, thumbnail_url, video_url, embed_url, youtube_id, duration_sec, is_live, view_count, published_at')
        .in('status', ['published', 'live'])
        .order('is_live', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return {
        videos: (data || []).map((v) => ({
          id: v.id,
          title_bn: v.title_bn,
          category: v.category_key || '',
          thumbnail_url: v.thumbnail_url || null,
          embed_url: v.embed_url || null,
          is_live: Boolean(v.is_live),
        })),
      };
    } catch (e) {
      console.warn('[api.videos] Supabase failed:', e);
      return { videos: [] };
    }
  },
};
