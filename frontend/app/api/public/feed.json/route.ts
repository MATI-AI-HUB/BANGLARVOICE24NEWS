import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice24news.com';

export const revalidate = 60;

// Lazy — env vars runtime-এ load হয়, build-এ নয়
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
      .order('published_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    const feed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'বাংলার ভয়েস',
      home_page_url: SITE,
      feed_url: `${SITE}/api/public/feed.json`,
      description: 'বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা',
      language: 'bn',
      items: (articles || []).map((a) => ({
        id: a.id,
        url: `${SITE}/article/${a.id}`,
        title: a.title_bn,
        summary: '',
        content_text: a.content_bn,
        date_published: a.published_at,
        tags: a.category ? [a.category] : [],
        authors: [{ name: 'বাংলার ভয়েস ডেস্ক' }],
        banner_image: a.thumbnail_url || '',
      })),
    };

    return NextResponse.json(feed, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { version: 'https://jsonfeed.org/version/1.1', title: 'বাংলার ভয়েস', items: [], error: String(err) },
      { status: 200 },
    );
  }
}
