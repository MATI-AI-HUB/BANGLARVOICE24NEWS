import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type PageArticle = { id?: string; headline?: string; body?: string; attribution?: string; category?: string };
type Page = { lead?: PageArticle; articles?: PageArticle[]; briefs?: string[]; [key: string]: unknown };

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalize(row: any) {
  return row ? {
    editionDate: row.edition_date,
    editionLabel: row.title,
    volume: '',
    issue: 1,
    pages: Array.isArray(row.pages) ? row.pages : [],
    pdfUrl: row.pdf_url || '',
  } : null;
}

function collectIds(pages: Page[]): string[] {
  const ids = new Set<string>();
  for (const page of pages) {
    if (page.lead?.id) ids.add(page.lead.id);
    for (const article of page.articles || []) if (article.id) ids.add(article.id);
  }
  return [...ids].slice(0, 30);
}

function hydratePages(pages: Page[], rows: any[]): Page[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const hydrate = (article?: PageArticle): PageArticle | undefined => {
    if (!article) return article;
    const row = article.id ? byId.get(article.id) : undefined;
    if (!row) return article;
    return {
      ...article,
      headline: row.title_bn || article.headline || 'শিরোনামহীন',
      body: (row.content_bn || row.excerpt_bn || article.body || '').slice(0, 1200),
      attribution: row.source_name || article.attribution || 'বাংলার ভয়েস ডেস্ক',
    };
  };
  return pages.map((page) => ({
    ...page,
    lead: hydrate(page.lead),
    articles: (page.articles || []).map((article) => hydrate(article) || article),
  }));
}

export async function GET() {
  try {
    const client = db();
    const { data, error } = await client
      .from('epaper_editions')
      .select('id,edition_date,title,pages,pdf_url,article_count,created_at,updated_at')
      .gt('article_count', 0)
      .order('edition_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const edition = normalize(data);
    if (edition && edition.pages.length) {
      const ids = collectIds(edition.pages);
      if (ids.length) {
        const { data: articles } = await client
          .from('articles')
          .select('id,title_bn,content_bn,excerpt_bn,source_name')
          .in('id', ids)
          .limit(30);
        edition.pages = hydratePages(edition.pages, articles || []);
      }
    }
    return NextResponse.json({ edition });
  } catch {
    return NextResponse.json({ edition: null, error: 'epaper_unavailable' }, { status: 503 });
  }
}
