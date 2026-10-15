import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicSupabase, fetchPublishedArticlesFeed } from '@/lib/supabase/published-articles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials are not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.NEWSROOM_INGEST_KEY;
  if (!secret) return false;
  const authorization = request.headers.get('authorization') || '';
  return authorization === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret;
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

type Article = { id: string; title_bn?: string; title_en?: string; content_bn?: string; excerpt_bn?: string; source_name?: string; source_url?: string; thumbnail_url?: string | null; featured_image?: string | null };

function buildPages(rows: Article[]) {
  const items = rows.map((article) => ({
    id: article.id,
    headline: article.title_bn || article.title_en || 'শিরোনামহীন',
    body: (article.excerpt_bn || article.content_bn || '').slice(0, 1200),
    attribution: article.source_name || 'বাংলার ভয়েস ডেস্ক',
    image: article.thumbnail_url || article.featured_image || null,
  }));
  return Array.from({ length: Math.max(1, Math.ceil(items.length / 12)) }, (_, index) => ({
    number: index + 1,
    section: index === 0 ? 'প্রথম পাতা' : 'সংবাদ',
    layout: index === 0 ? 'front' : 'two-column',
    lead: index === 0 ? items[0] : undefined,
    articles: index === 0 ? items.slice(1, 8) : items.slice(index * 12, index * 12 + 12),
    briefs: index === 0 ? items.slice(8, 12).map((item) => item.headline) : [],
  }));
}

function buildHtml(date: string, rows: Article[]): string {
  const items = rows.map((article) => `<article class="item"><h2>${escapeHtml(article.title_bn || article.title_en || 'শিরোনামহীন')}</h2><p class="meta">${escapeHtml(article.source_name || 'বাংলার ভয়েস ডেস্ক')}</p><p>${escapeHtml((article.excerpt_bn || article.content_bn || 'বিস্তারিত সংবাদটি ওয়েবসাইটে পড়ুন।').slice(0, 1600))}</p>${article.source_url ? `<p class="source">সূত্র: <a href="${escapeHtml(article.source_url)}">${escapeHtml(article.source_url)}</a></p>` : ''}</article>`).join('\n');
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>বাংলার ভয়েস — ই-পেপার ${escapeHtml(date)}</title><style>body{font-family:system-ui,serif;max-width:960px;margin:auto;padding:32px;color:#111;background:#fffdf8}header{border-bottom:4px solid #b91c1c;margin-bottom:24px}h1{color:#b91c1c}.item{border-bottom:1px solid #ddd;padding:0 0 18px;margin:0 0 18px}.item h2{font-size:22px;margin:0 0 6px}.item p{line-height:1.8}.meta,.source{font-size:12px;color:#8b1e1e}.source a{color:#555}</style></head><body><header><h1>বাংলার ভয়েস</h1><p>দৈনিক ই-পেপার — ${escapeHtml(dateLabel(date))}</p></header>${items}</body></html>`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const dryRun = new URL(request.url).searchParams.get('dry_run') === '1';
    const date = dhakaDate();
    const rows = (await fetchPublishedArticlesFeed(createPublicSupabase(), 30)) as Article[];
    if (!rows.length) return NextResponse.json({ ok: false, error: 'no_published_articles' }, { status: 503 });
    const pages = buildPages(rows);
    const html = buildHtml(date, rows);
    if (html.length < 1000 || pages.flatMap((page) => page.articles || []).length < 1) {
      return NextResponse.json({ ok: false, error: 'epaper_quality_gate_failed' }, { status: 503 });
    }
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        http_status: 200,
        would_create: { edition_date: date },
        edition_date: date,
        html_length: html.length,
        page_count: pages.length,
        article_count: rows.length,
      });
    }
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.banglarvoice24news.com').replace(/\/+$/, '');
    const { data, error } = await admin().from('epaper_editions').upsert({
      edition_date: date,
      title: `বাংলার ভয়েস ই-পেপার — ${dateLabel(date)}`,
      pages,
      html,
      pdf_url: `${site}/api/public/epaper/${date}/print`,
      article_count: rows.length,
      is_published: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'edition_date' }).select('id,edition_date,article_count,pdf_url').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, edition: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'epaper_failed' }, { status: 500 });
  }
}
