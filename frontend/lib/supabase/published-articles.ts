import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PublishedArticleRow = {
  id: string;
  title_bn?: string | null;
  title_en?: string | null;
  content_bn?: string | null;
  content_en?: string | null;
  excerpt_bn?: string | null;
  category?: string | null;
  category_key?: string | null;
  thumbnail_url?: string | null;
  featured_image?: string | null;
  status?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  image_credit?: string | null;
  image_alt_bn?: string | null;
  image_is_representational?: boolean | null;
  is_fallback?: boolean | null;
  canonical_url?: string | null;
  origin?: string | null;
};

export const PUBLISHED_ARTICLE_COLUMNS =
  'id, title_bn, content_bn, excerpt_bn, category, category_key, thumbnail_url, featured_image, status, published_at, source_name, source_url, image_credit, image_alt_bn, image_is_representational, is_fallback, canonical_url, origin';

export const PUBLIC_ARTICLE_DETAIL_COLUMNS =
  'id, title_bn, title_en, content_bn, content_en, excerpt_bn, category, category_key, thumbnail_url, featured_image, status, published_at, created_at, source_name, source_url, image_credit, image_alt_bn, image_is_representational, is_fallback, canonical_url, origin';

const NARROW_FEED_COLUMNS =
  'id, title_bn, category, published_at, thumbnail_url, status';

export function createPublicSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars not configured');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  const message = (error?.message || '').toLowerCase();
  const code = error?.code || '';
  return (
    code === '42P01' ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
}

export async function fetchPublishedArticlesFeed(
  supabase: SupabaseClient = createPublicSupabase(),
): Promise<PublishedArticleRow[]> {
  const viewFull = await supabase
    .from('public_articles_feed')
    .select(PUBLISHED_ARTICLE_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  if (!viewFull.error) return (viewFull.data || []) as PublishedArticleRow[];

  const viewNarrow = await supabase
    .from('public_articles_feed')
    .select(NARROW_FEED_COLUMNS)
    .order('published_at', { ascending: false })
    .limit(50);

  if (viewNarrow.error && !isMissingRelation(viewNarrow.error) && !isMissingRelation(viewFull.error)) {
    throw viewNarrow.error;
  }
  if (viewNarrow.error) throw viewFull.error || viewNarrow.error;
  return (viewNarrow.data || []) as PublishedArticleRow[];
}

export async function fetchPublishedArticleById(
  id: string,
  supabase: SupabaseClient = createPublicSupabase(),
): Promise<PublishedArticleRow | null> {
  const detail = await supabase
    .from('public_article_detail')
    .select(PUBLIC_ARTICLE_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (!detail.error && detail.data) return detail.data as PublishedArticleRow;
  if (!detail.error && detail.data === null) return null;

  const viewFull = await supabase
    .from('public_articles_feed')
    .select(PUBLISHED_ARTICLE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (!viewFull.error) return (viewFull.data as PublishedArticleRow | null) ?? null;
  if (viewFull.error && !isMissingRelation(viewFull.error) && !isMissingRelation(detail.error)) {
    throw viewFull.error;
  }

  const viewNarrow = await supabase
    .from('public_articles_feed')
    .select(NARROW_FEED_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (viewNarrow.error) throw viewNarrow.error;
  return (viewNarrow.data as PublishedArticleRow | null) ?? null;
}
