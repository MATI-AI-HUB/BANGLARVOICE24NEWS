import { NextResponse } from 'next/server';

export const revalidate = 30;

const UNAVAILABLE = {
  stream_url: '',
  title: 'বাংলার ভয়েস ২৪/৭',
  now_playing: '',
  is_live: false,
  available: false,
  thumbnail: null,
};

function isLegacyPocketBaseEnabled(): boolean {
  return (
    process.env.ENABLE_LEGACY_POCKETBASE === 'true' &&
    process.env.NODE_ENV !== 'production'
  );
}

function isLoopbackOrPrivate(raw: string): boolean {
  try {
    const host = new URL(raw).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (/^192\.168\./.test(host) || /^10\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    return false;
  } catch {
    return true;
  }
}

async function tryBackend() {
  if (!isLegacyPocketBaseEnabled()) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  if (!apiBase || isLoopbackOrPrivate(apiBase)) return null;
  try {
    const res = await fetch(`${apiBase}/api/public/stream.json`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const backend = await tryBackend();
  const envStream = process.env.NEXT_PUBLIC_STREAM_URL || '';
  const data =
    backend && backend.stream_url
      ? backend
      : envStream
        ? {
            stream_url: envStream,
            title: 'বাংলার ভয়েস ২৪/৭',
            now_playing: '',
            is_live: true,
            available: true,
            thumbnail: null,
          }
        : UNAVAILABLE;
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
  });
}
