import { createClient } from '@supabase/supabase-js';

export const revalidate = 300;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice24news.com').replace(/\/+$/, '');

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let items: { id: string; title_bn: string; excerpt_bn: string | null; published_at: string | null; source_name: string | null }[] = [];
  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await supabase
      .from('articles')
      .select('id, title_bn, excerpt_bn, published_at, source_name')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(30);
    items = data || [];
  }

  const rssItems = items
    .map((a) => {
      const link = `${SITE}/article/${a.id}`;
      return `<item><title>${xmlEscape(a.title_bn)}</title><link>${xmlEscape(link)}</link><guid>${xmlEscape(link)}</guid><pubDate>${a.published_at ? new Date(a.published_at).toUTCString() : ''}</pubDate><description>${xmlEscape(a.excerpt_bn || '')}</description><source>${xmlEscape(a.source_name || 'সূত্র')}</source></item>`;
    })
    .join('');

  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>বাংলার ভয়েস</title><link>${xmlEscape(SITE)}</link><language>bn</language>${rssItems}</channel></rss>`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
