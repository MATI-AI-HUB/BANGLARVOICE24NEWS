import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicSupabase, fetchPublishedArticlesFeed } from '../../../../lib/supabase/published-articles';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service=process.env.SUPABASE_SERVICE_ROLE_KEY||anon;
    const pub=createPublicSupabase();
    let rows:any[]=[];
    try{ rows=await (fetchPublishedArticlesFeed as any)(pub,30); if(!Array.isArray(rows)) rows=await (fetchPublishedArticlesFeed as any)(30); }
    catch{ rows=await (fetchPublishedArticlesFeed as any)(30); }
    if(!rows.length) return NextResponse.json({ok:false});
    const today=new Date().toISOString().split('T')[0];
    const admin=createClient(url,service);
    const pages=[{
      number:1, section:'প্রথম পাতা', layout:'front',
      lead:{ id:rows[0].id, headline:rows[0].title_bn||rows[0].title_en, body:(rows[0].excerpt_bn||rows[0].content_bn||'').slice(0,600), image: rows[0].thumbnail_url || rows[0].featured_image || null, attribution: rows[0].category },
      articles: rows.slice(1,8).map((a:any)=>({ id:a.id, headline:a.title_bn||a.title_en, body:(a.excerpt_bn||a.content_bn||'').slice(0,350), image: a.thumbnail_url || a.featured_image || null, attribution: a.category })),
      briefs: rows.slice(8,15).map((a:any)=>a.title_bn||a.title_en)
    }];
    await admin.from('epaper_editions').upsert({ edition_date:today, title:`${new Date().toLocaleDateString('bn-BD',{dateStyle:'long'})} সংস্করণ`, pages, is_published:true }, {onConflict:'edition_date'});
    return NextResponse.json({ok:true, date:today, hasImage:!!pages[0].lead.image});
  }catch(e:any){ return NextResponse.json({ok:false, error:e.message},{status:500}); }
}
