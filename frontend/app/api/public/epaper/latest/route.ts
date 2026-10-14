import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Article = { id?: string; headline?: string; body?: string; attribution?: string; image?: string | null };
type Page = { lead?: Article; articles?: Article[]; briefs?: string[]; [key: string]: unknown };

function hydrate(pages: Page[], rows: any[]): Page[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const mapArticle = (article?: Article) => {
    if (!article) return article;
    const row = article.id ? byId.get(article.id) : undefined;
    if (!row) return article;
    return { ...article, headline: row.title_bn || row.title_en || article.headline, body: (row.excerpt_bn || row.content_bn || article.body || '').slice(0, 1200), attribution: row.source_name || article.attribution || 'বাংলার ভয়েস ডেস্ক', image: row.thumbnail_url || row.featured_image || article.image || null };
  };
  return pages.map((page) => ({ ...page, lead: mapArticle(page.lead), articles: (page.articles || []).map((article) => mapArticle(article) || article) }));
}

export async function GET() {
  try {
    const client = db();
    const { data, error } = await client.from('epaper_editions')
      .select('id,edition_date,title,pages,pdf_url,article_count,created_at,updated_at')
      .eq('is_published', true)
      .gt('article_count', 0)
      .order('edition_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ edition: null });
    const pages = Array.isArray(data.pages) ? data.pages as Page[] : [];
    const ids = pages.flatMap((page) => [page.lead?.id, ...(page.articles || []).map((article) => article.id)]).filter((id): id is string => Boolean(id)).slice(0, 40);
    const { data: articles } = ids.length ? await client.from('articles').select('id,title_bn,title_en,content_bn,excerpt_bn,source_name,thumbnail_url,featured_image').in('id', ids).limit(40) : { data: [] };
    return NextResponse.json({ edition: { editionDate: data.edition_date, editionLabel: data.title, volume: '১', issue: 1, pages: hydrate(pages, articles || []), pdfUrl: data.pdf_url || '' } });
  } catch {
    return NextResponse.json({ edition: null, error: 'epaper_unavailable' }, { status: 503 });
  }
}
