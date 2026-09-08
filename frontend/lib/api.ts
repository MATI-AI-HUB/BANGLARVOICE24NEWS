import type { FeedArticle } from './mockData';
import type { LiveEntry } from '../components/live-blog';
import type { VideoItem } from '../components/video-hub';

/**
 * Banglar Voice — typed API client.
 *
 * Robustness contract: every fetch carries a hard timeout and every network
 * error is swallowed into an empty-but-valid shape. Callers decide the
 * fallback (the homepage binds rich Bengali mock data when the backend is
 * unreachable), so a dead PocketBase/Supabase URL never crashes a render.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090';

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

export type ArticleResponse = { items: FeedArticle[] };
export type LiveResponse = { entries: LiveEntry[] };
export type VideosResponse = { videos: VideoItem[] };

export const api = {
  base: BASE,
  /** Latest article feed */
  articles(limit = 20): Promise<ArticleResponse> {
    return safeFetch<ArticleResponse>(
      `${BASE}/api/public/articles?limit=${limit}`,
      6000,
      { items: [] },
    );
  },
  /** Single article — caller guards on slug presence for 404 semantics */
  article(slug: string): Promise<Record<string, unknown>> {
    return safeFetch<Record<string, unknown>>(
      `${BASE}/api/public/article/${slug}`,
      6000,
      {},
    );
  },
  /** Live-blog timeline — { entries: [{ id, body_bn, author, created_at }] } */
  live(): Promise<LiveResponse> {
    return safeFetch<LiveResponse>(`${BASE}/api/public/live.json`, 4500, { entries: [] });
  },
  /** Video hub — { videos: [{ id, title_bn, category, ... }] } */
  videos(): Promise<VideosResponse> {
    return safeFetch<VideosResponse>(`${BASE}/api/public/videos.json`, 6000, { videos: [] });
  },
};
