import { NextResponse } from 'next/server';
import { mockVideoItems } from '@/lib/mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090';

export const revalidate = 300;

async function tryBackend(): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/videos.json`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.videos) ? data.videos : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const backendVideos = await tryBackend();
  const videos: any[] =
    backendVideos && backendVideos.length > 0
      ? backendVideos
      : (mockVideoItems as any[]);

  return NextResponse.json(
    {
      videos: videos.map((v) => ({
        id: String(v.id ?? ''),
        title_bn: v.title_bn ?? '',
        category: v.category ?? '',
        thumbnail_url: v.thumbnail_url ?? null,
        embed_url: v.embed_url ?? null,
        is_live: Boolean(v.is_live),
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    },
  );
}
