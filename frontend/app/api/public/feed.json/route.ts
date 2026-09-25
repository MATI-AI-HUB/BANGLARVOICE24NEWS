import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice24news.com';

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
  international: 'আন্তর্জাতিক',
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

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) throw error;

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
        return {
          id: a.id,
          url: `${SITE}/article/${a.id}`,
          title: a.title_bn,
          summary: (a.content_bn || '').slice(0, 200),
          content_text: a.content_bn,
          date_published: a.published_at,
          tags,
          category_key: cat.key,
          category_label: cat.label,
          authors: [{ name: 'বাংলার ভয়েস ডেস্ক' }],
          banner_image: a.thumbnail_url || '',
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
