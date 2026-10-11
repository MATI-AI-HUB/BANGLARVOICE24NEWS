import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url ||!anon) return null;
  return createClient(url, anon);
}

function buildFromRealNews(articles: any[]) {
  if (!articles || articles.length === 0) return null;
  const now = new Date();
  return {
    editionDate: now.toISOString().split('T')[0],
    editionLabel: now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }),
    volume: '১',
    issue: 1,
    pages: [
      {
        number: 1,
        section: 'প্রথম পাতা',
        layout: 'front',
        lead: articles[0]? { id: articles[0].id, headline: articles[0].title || articles[0].headline, body: (articles[0].excerpt || articles[0].content || '').slice(0, 500), attribution: articles[0].author || 'বাংলার ভয়েস', category: articles[0].category } : undefined,
        articles: articles.slice(1, 5).map((a: any) => ({ id: a.id, headline: a.title || a.headline, body: (a.excerpt || a.content || '').slice(0, 350), attribution: a.author, category: a.category })),
        briefs: articles.slice(5, 12).map((a: any) => a.title || a.headline),
      },
      {
        number: 2,
        section: 'জাতীয়',
        layout: 'two-column',
        articles: articles.slice(5, 10).map((a: any) => ({ id: a.id, headline: a.title || a.headline, body: (a.excerpt || a.content || '').slice(0, 350), attribution: a.author })),
      },
    ],
  };
}

export async function GET() {
  const supabase = getClient();
  if (!supabase) {
    return NextResponse.json({ edition: null }, { status: 200 });
  }

  // Try all possible table names - your real news is in one of these
  const tables = ['news', 'articles', 'posts', 'contents'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(15);
      if (!error && data && data.length > 0) {
        const edition = buildFromRealNews(data);
        return NextResponse.json({ edition });
      }
    } catch {}
  }

  return NextResponse.json({ edition: null });
}
