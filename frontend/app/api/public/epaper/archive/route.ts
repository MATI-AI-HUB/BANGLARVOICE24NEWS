import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url ||!anon) return NextResponse.json({ editions: [] });
  const supa = createClient(url, anon);
  const { data } = await supa.from('articles').select('created_at').order('created_at', { ascending: false }).limit(30);
  const editions = (data || []).map((r: any) => {
    const d = new Date(r.created_at).toISOString().split('T')[0];
    return { date: d, label: new Date(r.created_at).toLocaleDateString('bn-BD', { dateStyle: 'long' }) };
  });
  const uniq = Array.from(new Map(editions.map(e => [e.date, e])).values());
  return NextResponse.json({ editions: uniq });
}
