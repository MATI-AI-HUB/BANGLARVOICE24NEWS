import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
  try {
    const { data: ticker } = await supabase
      .from('breaking_ticker')
      .select('text_bn, is_active, updated_at')
      .eq('id', 1)
      .maybeSingle();

    const { data: entries } = await supabase
      .from('field_reports')
      .select('id, title, description, created_at')
      .in('status', ['approved_for_live', 'published'])
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json(
      {
        ticker: ticker?.is_active ? ticker.text_bn : null,
        entries: (entries || []).map((e) => ({
          id: e.id,
          body_bn: e.description || e.title,
          author: 'বাংলার ভয়েস ডেস্ক',
          created_at: e.created_at,
        })),
      },
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } },
    );
  } catch (err) {
    return NextResponse.json(
      { ticker: null, entries: [], error: String(err) },
      { status: 500 },
    );
  }
}
