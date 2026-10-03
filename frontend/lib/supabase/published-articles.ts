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

// Prefer the richest column set. If the live view predates a migration the
// request 400s (PostgREST PGRST/42703) and we degrade to CORE (content-bearing)
// columns instead of the old silent fallback that dropped article bodies.
export const PUBLISHED_ARTICLE_COLUMNS =
  'id, title_bn, title_en, content_bn, content_en, excerpt_bn, category, category_key, thumbnail_url, featured_image, status, published_at, created_at, source_name, source_url, image_credit, image_alt_bn, image_is_representational, is_fallback, canonical_url, origin';

export const PUBLIC_ARTICLE_DETAIL_COLUMNS = PUBLISHED_ARTICLE_COLUMNS;

const CORE_VIEW_COLUMNS =
  'id, title_bn, title_en, content_bn, content_en, excerpt_bn, category, category_key, thumbnail_url, featured_image, status, published_at, created_at, source_name, image_credit, image_alt_bn';

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
    if (isMissingRelation(error)) break;
  }

  return { rows: [], error: lastError };
}

export async function fetchPublishedArticlesFeed(
  supabase: SupabaseClient = createPublicSupabase(),
): Promise<PublishedArticleRow[]> {
  const { rows, error } = await selectFirstAvailable(supabase, 'public_articles_feed', [
    PUBLISHED_ARTICLE_COLUMNS,
    CORE_VIEW_COLUMNS,
    NARROW_FEED_COLUMNS,
  ]);

  if (error) throw error;
  return rows;
}

export async function fetchPublishedArticleById(
  id: string,
  supabase: SupabaseClient = createPublicSupabase(),
): Promise<PublishedArticleRow | null> {
  const attempts: Array<{ table: string; cols: string }> = [
    { table: 'public_article_detail', cols: PUBLIC_ARTICLE_DETAIL_COLUMNS },
    { table: 'public_article_detail', cols: CORE_VIEW_COLUMNS },
    { table: 'public_articles_feed', cols: PUBLIC_ARTICLE_DETAIL_COLUMNS },
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
    if (isMissingRelation(error)) break;
  }

  throw lastError;
}
