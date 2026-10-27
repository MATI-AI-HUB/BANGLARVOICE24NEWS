import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const PUBLISHED_ARTICLE_COLUMNS = 'id, slug, title_bn, title_en, content_bn, content_en, excerpt_bn, thumbnail_url, featured_image, category, status, published_at, source_name, source_url, canonical_url, created_at';

function taggedArticleFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return fetch(input, init);
  const options = {
    ...init,
    next: { revalidate: 60, tags: ['articles'] },
  } as RequestInit & { next: { revalidate: number; tags: string[] } };
  return fetch(input, options);
}

export function createPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase public credentials are not configured');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: taggedArticleFetch },
  });
}

export async function fetchPublishedArticlesFeed(supabase?: SupabaseClient | number, limit = 30): Promise<any[]> {
  let client: SupabaseClient;
  let take = limit;
  if (supabase === undefined) {
    client = createPublicSupabase();
  } else if (typeof supabase === 'number') {
    take = supabase;
    client = createPublicSupabase();
  } else {
    client = supabase as SupabaseClient;
  }
  const { data, error } = await client.from('articles').select(PUBLISHED_ARTICLE_COLUMNS).eq('status','published').order('published_at',{ascending:false}).limit(take);
  if (error) {
    const { data: d2 } = await client.from('articles').select('id, slug, title_bn, title_en, content_bn, content_en, excerpt_bn, thumbnail_url, featured_image, category, status, published_at').eq('status','published').order('published_at',{ascending:false}).limit(take);
    return (d2 || []) as any[];
  }
  return (data || []) as any[];
}

export async function fetchPublishedArticleById(id: string, supabase?: SupabaseClient) {
  const client = supabase || createPublicSupabase();
  const { data } = await client.from('articles').select(PUBLISHED_ARTICLE_COLUMNS).eq('id', id).eq('status','published').single();
  return data || null;
}

export async function fetchPublishedArticleBySlug(slug: string, supabase?: SupabaseClient) {
  const client = supabase || createPublicSupabase();
  const { data } = await client.from('articles').select(PUBLISHED_ARTICLE_COLUMNS).eq('slug', slug).eq('status','published').single();
  return data || null;
}

export async function fetchPublishedArticles(supabase?: SupabaseClient, limit=30) {
  return fetchPublishedArticlesFeed(supabase, limit);
}
