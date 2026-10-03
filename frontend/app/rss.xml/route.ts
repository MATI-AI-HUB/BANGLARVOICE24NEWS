import { fetchPublishedArticlesFeed } from '../../lib/supabase/published-articles';
import { canonicalSiteUrl } from '../../lib/site';

export const revalidate = 300;

const SITE = canonicalSiteUrl();

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  let items: { id: string; title_bn: string; excerpt_bn: string | null; published_at: string | null; source_name: string | null }[] = [];
  try {
    const rows = await fetchPublishedArticlesFeed();
    items = [...rows]
      .sort((a, b) => {
        const at = new Date(a.published_at || 0).getTime();
        const bt = new Date(b.published_at || 0).getTime();
        return bt - at;
      })
      .slice(0, 30)
      .map((a) => ({
        id: a.id,
        title_bn: a.title_bn || '',
        excerpt_bn: a.excerpt_bn ?? null,
        published_at: a.published_at ?? null,
        source_name: a.source_name ?? null,
      }));
  } catch {
    items = [];
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
