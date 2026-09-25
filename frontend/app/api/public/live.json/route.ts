import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 30;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: ticker } = await supabase
      .from('breaking_ticker')
      .select('text_bn, is_active')
      .eq('id', 1)
      .maybeSingle();

    return NextResponse.json(
      {
        ticker: ticker?.is_active ? ticker.text_bn : null,
        entries: [],
      },
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } },
    );
  } catch {
    return NextResponse.json(
      { ticker: null, entries: [], error: 'live_unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
