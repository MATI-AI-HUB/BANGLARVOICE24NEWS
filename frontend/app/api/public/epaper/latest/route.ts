import { NextResponse } from 'next/server';
import { createPublicSupabase, fetchPublishedArticlesFeed } from '../../../../../lib/supabase/published-articles';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET() {
  try {
    const supabase = createPublicSupabase();
    // Try both signatures: (supabase, limit) or (limit) — handle both
    let rows: any[] = [];
    try {
      // @ts-ignore
      rows = await (fetchPublishedArticlesFeed as any)(supabase, 30);
      if (!Array.isArray(rows)) rows = await (fetchPublishedArticlesFeed as any)(30);
    } catch {
      // @ts-ignore
      rows = await (fetchPublishedArticlesFeed as any)(30);
    }
    if (!rows ||!rows.length) return NextResponse.json({ edition: null });
    const now = new Date();
    return NextResponse.json({
      edition: {
        editionDate: now.toISOString().split('T')[0],
        editionLabel: now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }),
        volume: '1', issue: 1,
        pages: [{
          number: 1, section: 'প্রথম পাতা', layout: 'front',
          lead: { id: rows[0].id, headline: rows[0].title_bn || rows[0].title_en, body: (rows[0].excerpt_bn || rows[0].content_bn || '').slice(0, 600) },
          articles: rows.slice(1,7).map((a:any)=>({ id:a.id, headline:a.title_bn||a.title_en, body:(a.excerpt_bn||a.content_bn||'').slice(0,400) })),
          briefs: rows.slice(7,14).map((a:any)=>a.title_bn||a.title_en),
        }],
      }
    });
  } catch(e:any){ return NextResponse.json({ edition:null, error:e.message }); }
}
