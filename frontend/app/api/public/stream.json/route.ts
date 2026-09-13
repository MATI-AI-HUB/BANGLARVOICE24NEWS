import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090';

export const revalidate = 30;

async function tryBackend() {
  try {
    const res = await fetch(`${API_BASE}/api/public/stream.json`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function currentSlot(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'রাতের সংবাদ';
  if (hour < 9) return 'সকালের সংবাদ';
  if (hour < 12) return 'অর্থনীতি ডেস্ক';
  if (hour < 15) return 'মধ্যাহ্ন সংবাদ';
  if (hour < 18) return 'খেলাধুলা';
  if (hour < 21) return 'প্রধান সংবাদ';
  return 'রাতের সংবাদ';
}

export async function GET() {
  const backend = await tryBackend();
  const fallback = {
    stream_url: process.env.NEXT_PUBLIC_STREAM_URL || '',
    title: 'বাংলার ভয়েস ২৪/৭',
    now_playing: currentSlot(),
    is_live: true,
    thumbnail: null,
  };
  const data = backend && backend.stream_url ? backend : fallback;
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
  });
}
