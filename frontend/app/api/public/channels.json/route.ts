import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  let channels: any[] = [];
  try {
    const { data } = await sb
      .from('channels')
      .select('id, name_bn, name_en, stream_url, type, logo, is_live')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (data && data.length > 0) channels = data;
  } catch {}

  if (channels.length === 0) {
    const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || 'https://www.youtube.com/@banglarvoice-d6d6g/live';
    channels = [
      { id: 'main', name_bn: 'প্রধান চ্যানেল', name_en: 'Main Channel', stream_url: STREAM_URL, type: 'video', logo: null, is_live: true },
      { id: 'audio', name_bn: 'অডিও ২৪/৭', name_en: 'Audio 24/7', stream_url: STREAM_URL, type: 'audio', logo: null, is_live: false },
    ];
  }

  return NextResponse.json(
    { channels, total: channels.length },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120' } }
  );
}
