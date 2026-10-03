import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { fetchPublishedArticlesFeed } from '../../../../lib/supabase/published-articles';
import { canonicalSiteUrl } from '../../../../lib/site';

const SITE = canonicalSiteUrl();

export const revalidate = 60;

const KEY_TO_LABEL: Record<string, string> = {
  national: 'জাতীয়',
  politics: 'রাজনীতি',
  economy: 'অর্থনীতি',
  sports: 'খেলাধুলা',
  entertainment: 'বিনোদন',
  tech: 'প্রযুক্তি',
  health: 'স্বাস্থ্য',
  education: 'শিক্ষা',
  international: 'বিশ্ব',
  city: 'নগর',
};

const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_LABEL).map(([k, v]) => [v, k])
);

function resolveCategory(raw: string | null | undefined): { key: string; label: string } {
  const value = (raw || '').trim();
  if (!value) return { key: '', label: '' };
  if (KEY_TO_LABEL[value]) return { key: value, label: KEY_TO_LABEL[value] };
  if (LABEL_TO_KEY[value]) return { key: LABEL_TO_KEY[value], label: value };
  return { key: value, label: value };
}

export async function GET() {
  try {
    const rows = await fetchPublishedArticlesFeed();
    const articles = [...rows]
      .sort((a, b) => {
        const at = new Date(a.published_at || 0).getTime();
        const bt = new Date(b.published_at || 0).getTime();
        return bt - at;
      })
      .slice(0, 50);

    const feed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'বাংলার ভয়েস',
      home_page_url: SITE,
      feed_url: `${SITE}/api/public/feed.json`,
      description: 'বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা',
      language: 'bn',
      items: (articles || []).map((a) => {
        const cat = resolveCategory(a.category_key || a.category);
        const tags = [cat.key, cat.label].filter((x) => x);
        const sourceName = a.source_name || 'সূত্র';
        return {
          id: a.id,
          url: `${SITE}/article/${a.id}`,
          title: a.title_bn,
          summary: (a.excerpt_bn || a.content_bn || '').slice(0, 200),
          content_text: a.origin === 'original' ? a.content_bn : (a.excerpt_bn || '').slice(0, 400),
          date_published: a.published_at,
          tags,
          category_key: cat.key,
          category_label: cat.label,
          authors: [{ name: sourceName }],
          banner_image: a.thumbnail_url || a.featured_image || '',
          source_name: sourceName,
          source_url: a.source_url || a.canonical_url || '',
          image_credit: a.image_credit || '',
          image_is_representational: Boolean(a.image_is_representational || a.is_fallback),
          origin: a.origin === 'original' ? 'original' : 'aggregated',
          external_url: a.source_url || a.canonical_url || '',
        };
      }),
    };

    return NextResponse.json(feed, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json(
      {
        version: 'https://jsonfeed.org/version/1.1',
        title: 'বাংলার ভয়েস',
        items: [],
        error: 'feed_unavailable',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
