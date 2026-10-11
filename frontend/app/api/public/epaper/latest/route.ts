import { NextResponse } from 'next/server';
import { fetchPublishedArticlesFeed } from '../../../../lib/supabase/published-articles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toEdition(articles: any[]) {
  if (!articles || articles.length === 0) return null;
  const now = new Date();
  const sorted = [...articles].sort((a,b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());
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
        lead: {
          id: sorted[0].id,
          headline: sorted[0].title,
          body: (sorted[0].excerpt || sorted[0].content || sorted[0].description || '').slice(0, 600),
          attribution: sorted[0].author || 'বাংলার ভয়েস',
          category: sorted[0].category || 'প্রধান',
        },
        articles: sorted.slice(1, 6).map((a: any) => ({
          id: a.id,
          headline: a.title,
          body: (a.excerpt || a.content || '').slice(0, 400),
          attribution: a.author || 'ডেস্ক',
          category: a.category,
        })),
        briefs: sorted.slice(6, 13).map((a: any) => a.title),
      },
      {
        number: 2,
        section: 'জাতীয়',
        layout: 'two-column',
        articles: sorted.slice(6, 12).map((a: any) => ({
          id: a.id,
          headline: a.title,
          body: (a.excerpt || a.content || '').slice(0, 350),
          attribution: a.author,
        })),
      },
      {
        number: 3,
        section: 'খেলা ও বিনোদন',
        layout: 'grid',
        articles: sorted.slice(12, 18).map((a: any) => ({
          id: a.id,
          headline: a.title,
          body: (a.excerpt || a.content || '').slice(0, 300),
          attribution: a.author,
        })),
      },
    ],
  };
}

export async function GET() {
  try {
    const articles = await fetchPublishedArticlesFeed(30);
    const edition = toEdition(articles);
    if (!edition) return NextResponse.json({ edition: null, reason: 'no published articles' }, { status: 200 });
    return NextResponse.json({ edition });
  } catch (e: any) {
    return NextResponse.json({ edition: null, error: e.message }, { status: 200 });
  }
}
