import { NextResponse } from 'next/server';
import { mockFeedItems } from '@/lib/mockData';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice24news.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090';

export const revalidate = 60;

async function tryBackend(): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/articles?limit=30`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const backendItems = await tryBackend();
  const items: any[] =
    backendItems && backendItems.length > 0 ? backendItems : (mockFeedItems as any[]);

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'বাংলার ভয়েস',
    home_page_url: SITE,
    feed_url: `${SITE}/api/public/feed.json`,
    description:
      'বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা',
    language: 'bn',
    items: items.map((a) => ({
      id: String(a.id ?? a.slug ?? ''),
      url: `${SITE}/article/${a.slug ?? a.id ?? ''}`,
      title: a.title_bn ?? '',
      summary: a.dek_bn ?? '',
      content_text: a.body_bn ?? a.dek_bn ?? '',
      date_published: a.published_at ?? new Date().toISOString(),
      tags: a.category ? [a.category] : [],
      authors: [
        { name: a.author_name ?? a.author ?? 'বাংলার ভয়েস ডেস্ক' },
      ],
      banner_image: a.featured_image ?? '',
      bias_index: typeof a.bias_index === 'number' ? a.bias_index : undefined,
      reading_time:
        typeof a.reading_time_min === 'number'
          ? a.reading_time_min
          : undefined,
    })),
  };

  return NextResponse.json(feed, {
    headers: {
      'Cache-Control':
        'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
