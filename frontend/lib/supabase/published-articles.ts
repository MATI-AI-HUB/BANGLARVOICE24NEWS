import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PublishedArticleRow = {
  id: string;
  slug?: string | null;
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

// Keep the feed query exactly aligned with the live public_articles_feed view.
// Detail/source metadata belongs to public_article_detail and must not be sent
// to the feed view, otherwise PostgREST returns 400 for unknown columns.
export const PUBLISHED_ARTICLE_COLUMNS =
  'id, slug, title_bn, title_en, content_bn, content_en, excerpt_bn, thumbnail_url, category, category_key, status, published_at, created_at, featured_image';

export const PUBLIC_ARTICLE_DETAIL_COLUMNS =
  'id, slug, title_bn, title_en, content_bn, content_en, excerpt_bn, category, category_key, thumbnail_url, featured_image, status, published_at, created_at, source_name, source_url, image_credit, image_alt_bn, image_is_representational, is_fallback, canonical_url, origin';

const CORE_VIEW_COLUMNS =
  'id, title_bn, title_en, content_bn, content_en, excerpt_bn, thumbnail_url, category, category_key, status, published_at, created_at, featured_image';

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

type QueryError = { message?: string; code?: string } | null;

async function selectFirstAvailable(
  supabase: SupabaseClient,
  table: string,
  attempts: string[],
): Promise<{ rows: PublishedArticleRow[]; error: QueryError }> {
  let lastError: QueryError = null;

  for (const cols of attempts) {
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    if (!error) {
      if (cols !== attempts[0]) {
        console.warn(
          `[published-articles] ${table}: degraded to a narrower column set`,
          lastError?.message,
        );
      }
      return { rows: (data || []) as unknown as PublishedArticleRow[], error: null };
    }

    lastError = error;
  }

  return { rows: [], error: lastError };
}

export async function fetchPublishedArticlesFeed(
  supabase: SupabaseClient = createPublicSupabase(),
): Promise<PublishedArticleRow[]> {
  const attempts = [
    PUBLISHED_ARTICLE_COLUMNS,
    CORE_VIEW_COLUMNS,
    NARROW_FEED_COLUMNS,
  ];
  const feed = await selectFirstAvailable(supabase, 'public_articles_feed', [
    PUBLISHED_ARTICLE_COLUMNS,
    CORE_VIEW_COLUMNS,
    NARROW_FEED_COLUMNS,
  ]);
  if (!feed.error) return feed.rows;

  // Keep public feeds available if the feed view's grants lag behind a view
  // refresh. The detail view exposes the same published-safe article fields.
  const detail = await selectFirstAvailable(supabase, 'public_article_detail', attempts);
  if (!detail.error) {
    console.warn('[published-articles] public_articles_feed unavailable; using public_article_detail', feed.error?.message);
    return detail.rows;
  }

  throw detail.error || feed.error;
}

export async function fetchPublishedArticleById(
  id: string,
  supabase: SupabaseClient = createPublicSupabase(),
): Promise<PublishedArticleRow | null> {
  const attempts: Array<{ table: string; cols: string }> = [
    { table: 'public_article_detail', cols: PUBLIC_ARTICLE_DETAIL_COLUMNS },
    { table: 'public_article_detail', cols: CORE_VIEW_COLUMNS },
    { table: 'public_articles_feed', cols: PUBLISHED_ARTICLE_COLUMNS },
    { table: 'public_articles_feed', cols: CORE_VIEW_COLUMNS },
    { table: 'public_articles_feed', cols: NARROW_FEED_COLUMNS },
  ];

  let lastError: QueryError = null;

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from(attempt.table)
      .select(attempt.cols)
      .eq('id', id)
      .maybeSingle();

    if (!error) return (data as PublishedArticleRow | null) ?? null;

    lastError = error;
  }

  throw lastError;
}

export async function fetchPublishedArticleBySlug(
  slug: string,
  supabase: SupabaseClient = createPublicSupabase(),
): Promise<PublishedArticleRow | null> {
  const attempts: Array<{ table: string; cols: string }> = [
    { table: 'public_article_detail', cols: PUBLIC_ARTICLE_DETAIL_COLUMNS },
    { table: 'public_articles_feed', cols: PUBLISHED_ARTICLE_COLUMNS },
  ];
  let lastError: QueryError = null;
  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from(attempt.table)
      .select(attempt.cols)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (!error) return (data as PublishedArticleRow | null) ?? null;
    lastError = error;
  }
  throw lastError;
}
