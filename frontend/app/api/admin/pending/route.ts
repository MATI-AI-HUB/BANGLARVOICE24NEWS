import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin creds missing');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  try {
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('articles')
      .select('id, title_bn, content_bn, category_key, source_name, source_url, thumbnail_url, ai_confidence, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const items = (data || []).map((a) => ({
      id: a.id,
      slug: a.id,
      title_bn: a.title_bn,
      summary: (a.content_bn || '').slice(0, 200),
      category: a.category_key || 'national',
      reporter_name: a.source_name || 'AI Pipeline',
      source_url: a.source_url,
      thumbnail_url: a.thumbnail_url,
      ai_score: Math.round((a.ai_confidence ?? 0.7) * 100),
      submitted_at: a.created_at,
    }));

    return NextResponse.json(
      { items, total: items.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e), items: [] },
      { status: 500 },
    );
  }
}
