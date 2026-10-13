import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicSupabase, fetchPublishedArticlesFeed } from '@/lib/supabase/published-articles';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service=process.env.SUPABASE_SERVICE_ROLE_KEY||anon;
    const pub=createPublicSupabase();
    const rows:any[] = await fetchPublishedArticlesFeed(pub,30);
    if(!rows.length) return NextResponse.json({ok:false, msg:'no published'});
    const today=new Date().toISOString().split('T')[0];
    const admin=createClient(url,service);
    const pages=[{
      number:1, section:'প্রথম পাতা', layout:'front',
      lead:{ id:rows[0].id, headline:rows[0].title_bn||rows[0].title_en, body:(rows[0].excerpt_bn||rows[0].content_bn||rows[0].content_en||'বিস্তারিত ভেতরে').slice(0,600), image: rows[0].thumbnail_url || rows[0].featured_image || null },
      articles: rows.slice(1,8).map((a:any)=>({ id:a.id, headline:a.title_bn||a.title_en, body:(a.excerpt_bn||a.content_bn||a.content_en||'').slice(0,350), image: a.thumbnail_url || a.featured_image || null })),
      briefs: rows.slice(8,15).map((a:any)=>a.title_bn||a.title_en)
    }];
    const site=(process.env.NEXT_PUBLIC_SITE_URL||'https://www.banglarvoice24news.com').replace(/\/+$/,'');
    const html=`<h1>${pages[0].lead.headline}</h1>`;
    const payload:any = { edition_date:today, title:`${new Date().toLocaleDateString('bn-BD',{dateStyle:'long'})} সংস্করণ`, pages, is_published:true, html, pdf_url:`${site}/api/public/epaper/${today}/print` };
    const {error}=await admin.from('epaper_editions').upsert(payload, {onConflict:'edition_date'});
    if(error) throw new Error(error.message);
    return NextResponse.json({ok:true, date:today, count:rows.length});
  }catch(e:any){ return NextResponse.json({ok:false, error:e.message},{status:500}); }
}
