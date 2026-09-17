import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Admin auth
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'ai_complete';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Fetch queue entries with AI verifications
  let query = sb
    .from('verification_queue')
    .select(`
      id, content_type, content_id, content_snapshot, status,
      ai_consensus_score, ai_consensus_verdict, ai_confidence,
      ai_agents_count, ai_completed_at, ai_duration_ms,
      checked_at, checker_notes, human_override,
      created_at
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: queue, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch article titles for each queue entry
  const articleIds = (queue || [])
    .filter(q => q.content_type === 'article')
    .map(q => q.content_id);

  let articlesMap: Record<string, any> = {};
  if (articleIds.length > 0) {
    const { data: articles } = await sb
      .from('articles')
      .select('id, title_bn, category_key, thumbnail_url, published_at')
      .in('id', articleIds);
    (articles || []).forEach(a => { articlesMap[a.id] = a; });
  }

  // Enrich queue with article data
  const enriched = (queue || []).map(q => ({
    ...q,
    article: articlesMap[q.content_id] || null,
  }));

  // Get stats
  const { data: stats } = await sb
    .from('verification_queue')
    .select('status')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const statusCounts: Record<string, number> = {};
  (stats || []).forEach(s => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  return NextResponse.json({
    queue: enriched,
    total: enriched.length,
    stats: statusCounts,
  });
}
