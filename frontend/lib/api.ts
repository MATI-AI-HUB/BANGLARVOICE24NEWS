import type { FeedArticle } from './mockData';
import type { LiveEntry } from '../components/live-blog';
import type { VideoItem } from '../components/video-hub';
import { createClient } from '@supabase/supabase-js';

/**
 * Banglar Voice — typed API client.
 *   • articles  → Supabase (primary source)
 *   • live/videos → PocketBase (secondary feeds)
 */

const PB_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase =
  SUPABASE_URL && SUPABASE_ANON
    ? createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  title_bn: string;
  content_bn: string;
  category: string | null;
  thumbnail_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  source_url: string | null;
  source_name: string | null;
  image_credit: string | null;
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

function mapArticle(row: SupabaseArticle): FeedArticle {
  const summary = stripHtml(row.content_bn).slice(0, 220);
  return {
    id: row.id,
    slug: row.id,
    title_bn: row.title_bn,
    dek_bn: summary,
    category: row.category || 'national',
    featured_image: row.thumbnail_url || '',
    reading_time_min: estimateReadTime(row.content_bn),
    bias_index: 50,
    published_at: row.published_at || row.created_at,
  };
}

export type ArticleResponse = { items: FeedArticle[] };
export type LiveResponse = { entries: LiveEntry[] };
export type VideosResponse = { videos: VideoItem[] };

export const api = {
  base: PB_BASE,

  async articles(limit = 20): Promise<ArticleResponse> {
    if (!supabase) {
      console.warn('[api.articles] Supabase not configured — returning empty');
      return { items: [] };
    }
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title_bn, content_bn, category, thumbnail_url, status, published_at, created_at, source_url, source_name, image_credit')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { items: (data as SupabaseArticle[] | null || []).map(mapArticle) };
    } catch (e) {
      console.warn('[api.articles] Supabase failed:', e);
      return { items: [] };
    }
  },

  async article(slug: string): Promise<Record<string, unknown>> {
    if (!supabase) return {};
    if (!UUID_RE.test(slug)) {
      // Legacy mock slug — caller will fall back to mock data
      return {};
    }
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return {};
      const row = data as SupabaseArticle;
      const base = mapArticle(row);
      return {
        ...base,
        body_bn: row.content_bn,
        author_name: row.source_name || 'Banglar Voice',
        source_url: row.source_url || '',
        source_name: row.source_name || '',
        image_credit: row.image_credit || '',
        tags: [] as string[],
      };
    } catch (e) {
      console.warn('[api.article] Supabase failed:', e);
      return {};
    }
  },

  live(): Promise<LiveResponse> {
    return safeFetch<LiveResponse>(`${PB_BASE}/api/public/live.json`, 4500, { entries: [] });
  },

  videos(): Promise<VideosResponse> {
    return safeFetch<VideosResponse>(`${PB_BASE}/api/public/videos.json`, 6000, { videos: [] });
  },
};
