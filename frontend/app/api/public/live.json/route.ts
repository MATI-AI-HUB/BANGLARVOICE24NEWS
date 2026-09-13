import { NextResponse } from 'next/server';
import { mockLiveEntries } from '@/lib/mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090';

export const revalidate = 30;

async function tryBackend(): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/live.json`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.entries) ? data.entries : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const backendEntries = await tryBackend();
  const entries: any[] =
    backendEntries && backendEntries.length > 0
      ? backendEntries
      : (mockLiveEntries as any[]);

  return NextResponse.json(
    {
      entries: entries.map((e) => ({
        id: String(e.id ?? ''),
        body_bn: e.body_bn ?? '',
        author: e.author ?? 'বাংলার ভয়েস ডেস্ক',
        image_url: e.image_url ?? null,
        created_at: e.created_at ?? new Date().toISOString(),
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=30',
      },
    },
  );
}
