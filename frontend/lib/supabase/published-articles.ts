import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

export async function fetchPublishedArticlesFeed(
  supabase: SupabaseClient = createPublicSupabase(),
) {
  const { data, error } = await supabase.from('public_articles_feed').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchPublishedArticleById(
  id: string,
  supabase: SupabaseClient = createPublicSupabase(),
) {
  const { data, error } = await supabase
    .from('public_articles_feed')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
