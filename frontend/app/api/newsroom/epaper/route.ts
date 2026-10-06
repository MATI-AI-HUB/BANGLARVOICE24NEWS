import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchPublishedArticlesFeed } from '../../../../lib/supabase/published-articles';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials are not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function authorized(request: Request): boolean {
  const key = process.env.NEWSROOM_INGEST_KEY;
  if (!key) return false;
  const supplied = request.headers.get('x-ingest-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  return supplied === key;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}

function dhakaDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('bn-BD', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${date}T00:00:00+06:00`));
}

function buildHtml(date: string, articles: Array<{ title_bn: string; content_bn?: string; excerpt_bn?: string; source_name?: string; source_url?: string }>): string {
  const items = articles.map((article) => `<article class="item">
    <h2>${escapeHtml(article.title_bn || 'শিরোনামহীন')}</h2>
    <p class="meta">${escapeHtml(article.source_name || 'বাংলার ভয়েস ডেস্ক')}</p>
    <p>${escapeHtml((article.excerpt_bn || article.content_bn || '').slice(0, 1200))}</p>
    ${article.source_url ? `<p class="source">সূত্র: <a href="${escapeHtml(article.source_url)}">${escapeHtml(article.source_url)}</a></p>` : ''}
  </article>`).join('\n');
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>বাংলার ভয়েস — ই-পেপার ${escapeHtml(date)}</title><style>body{font-family:serif;max-width:900px;margin:auto;padding:32px;color:#111;background:#fffdf8}header{border-bottom:4px solid #b91c1c;margin-bottom:24px}h1{color:#b91c1c;margin:0 0 6px}.date{color:#666}.item{border-bottom:1px solid #ddd;padding:0 0 18px;margin:0 0 18px}.item h2{font-size:22px;margin:0 0 6px}.item p{line-height:1.8}.meta,.source{font-size:12px;color:#8b1e1e}.source a{color:#555}</style></head><body><header><h1>বাংলার ভয়েস</h1><p class="date">দৈনিক ই-পেপার — ${escapeHtml(dateLabel(date))}</p></header>${items || '<p>এই তারিখে প্রকাশিত সংবাদ পাওয়া যায়নি।</p>'}</body></html>`;
}

function buildPages(articles: Array<{ id?: string; title_bn: string; content_bn?: string; excerpt_bn?: string; source_name?: string }>) {
  const mapped = articles.map((article) => ({
    id: article.id,
    headline: article.title_bn || 'শিরোনামহীন',
    body: (article.excerpt_bn || article.content_bn || '').slice(0, 1200),
    attribution: article.source_name || 'বাংলার ভয়েস ডেস্ক',
  }));
  const lead = mapped[0];
  const rest = mapped.slice(1);
  return [{ number: 1, section: 'প্রথম পাতা', layout: 'front', lead, articles: rest.slice(0, 5), briefs: rest.slice(5, 11).map((article) => article.headline) }, ...Array.from({ length: Math.ceil(rest.slice(11).length / 8) }, (_, pageIndex) => ({ number: pageIndex + 2, section: 'সংবাদ', layout: 'two-column', articles: rest.slice(11 + pageIndex * 8, 19 + pageIndex * 8) }))];
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const requestedDate = typeof body?.edition_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.edition_date) ? body.edition_date : dhakaDate();
    const rows = await fetchPublishedArticlesFeed();
    const daily = rows.filter((row) => String(row.published_at || '').slice(0, 10) === requestedDate).slice(0, 24);
    const articles = (daily.length ? daily : rows.slice(0, 24)).map((row) => ({
      id: row.id,
      title_bn: row.title_bn || 'শিরোনামহীন',
      content_bn: row.content_bn || '',
      excerpt_bn: row.excerpt_bn || '',
      source_name: row.source_name || 'বাংলার ভয়েস ডেস্ক',
      source_url: row.source_url || row.canonical_url || '',
    }));
    const supabase = admin();
    const now = new Date().toISOString();
    const payload = {
      edition_date: requestedDate,
      title: `বাংলার ভয়েস ই-পেপার — ${dateLabel(requestedDate)}`,
      html: buildHtml(requestedDate, articles),
      pages: buildPages(articles),
      pdf_url: '',
      article_count: articles.length,
      updated_at: now,
    };
    const { data, error } = await supabase.from('epaper_editions').upsert(payload, { onConflict: 'edition_date' }).select('id,edition_date,article_count').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, edition: data, used_daily_articles: daily.length > 0 });
  } catch (error) {
    return NextResponse.json({ error: 'epaper_generation_failed', detail: error instanceof Error ? error.message : 'unknown error' }, { status: 500 });
  }
}
