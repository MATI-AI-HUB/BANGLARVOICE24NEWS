import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

    const supabase = getSupabase();
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title_bn, title_en, description_bn, category_key, thumbnail_url, video_url, embed_url, youtube_id, duration_sec, is_live, view_count, published_at')
      .in('status', ['published', 'live', 'needs_enrichment'])
      .order('is_live', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const items = (videos || []).map((v) => ({
      id: v.id,
      title_bn: v.title_bn,
      title_en: v.title_en || '',
      category: v.category_key || '',
      thumbnail_url: v.thumbnail_url || null,
      video_url: v.video_url || null,
      embed_url: v.embed_url || null,
      youtube_id: v.youtube_id || null,
      duration_sec: v.duration_sec || 0,
      is_live: Boolean(v.is_live),
      view_count: v.view_count || 0,
      published_at: v.published_at,
    }));

    return NextResponse.json(
      { videos: items, total: items.length },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { videos: [], total: 0, error: 'videos_unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
