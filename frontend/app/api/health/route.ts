import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STALE_HOURS = 6;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET() {
  const now = new Date().toISOString();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return json({
      status: 'degraded',
      timestamp: now,
      last_success_at: null,
      stale: true,
      stale_hours: STALE_HOURS,
      error: 'supabase_unconfigured',
    }, 503);
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rpcAt, error: rpcError } = await supabase.rpc('news_pipeline_last_success');
    let lastSuccessAt: string | null = typeof rpcAt === 'string' ? rpcAt : null;
    let stage: string | null = null;
    let published = 0;

    if (!lastSuccessAt) {
      const { data, error } = await supabase
        .from('news_pipeline_runs')
        .select('completed_at, created_at, status, stage, published, error_message')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && rpcError) {
        return json({
          status: 'error',
          timestamp: now,
          last_success_at: null,
          stale: true,
          stale_hours: STALE_HOURS,
          error: error.message,
        }, 503);
      }
      lastSuccessAt = data?.completed_at || data?.created_at || null;
      stage = data?.stage ?? null;
      published = data?.published ?? 0;
    }
    const ageMs = lastSuccessAt ? Date.now() - new Date(lastSuccessAt).getTime() : Number.POSITIVE_INFINITY;
    const stale = !lastSuccessAt || ageMs > STALE_HOURS * 60 * 60 * 1000;

    return json({
      status: stale ? 'stale' : 'ok',
      timestamp: now,
      last_success_at: lastSuccessAt,
      age_hours: lastSuccessAt ? Number((ageMs / 3_600_000).toFixed(2)) : null,
      stale,
      stale_hours: STALE_HOURS,
      stage,
      published,
    }, stale ? 503 : 200);
  } catch (e) {
    return json({
      status: 'error',
      timestamp: now,
      last_success_at: null,
      stale: true,
      stale_hours: STALE_HOURS,
      error: e instanceof Error ? e.message : String(e),
    }, 503);
  }
}
