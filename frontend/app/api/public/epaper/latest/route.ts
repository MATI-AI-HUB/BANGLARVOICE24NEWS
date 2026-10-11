import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicSupabase, fetchPublishedArticlesFeed } from '@/lib/supabase/published-articles';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase=createClient(url,anon);
  const today=new Date().toISOString().split('T')[0];
  const {data:autoEdition}=await supabase.from('epaper_editions').select('*').eq('edition_date',today).eq('is_published',true).single();
  if(autoEdition){
    return NextResponse.json({ edition:{ editionDate:autoEdition.edition_date, editionLabel:new Date(autoEdition.edition_date).toLocaleDateString('bn-BD',{dateStyle:'long'}), volume:'১', issue:1, pages:autoEdition.pages }});
  }
  try{
    const pub=createPublicSupabase();
    const rows:any[] = await fetchPublishedArticlesFeed(pub,20);
    if(!rows.length) return NextResponse.json({edition:null});
    return NextResponse.json({ edition:{ editionDate:today, editionLabel:new Date().toLocaleDateString('bn-BD',{dateStyle:'long'}), volume:'১', issue:1, pages:[{ number:1, section:'প্রথম পাতা', layout:'front', lead:{ id:rows[0].id, headline:rows[0].title_bn||rows[0].title_en, body:(rows[0].excerpt_bn||rows[0].content_bn||'').slice(0,600), image:rows[0].thumbnail_url||rows[0].featured_image||null }, articles:rows.slice(1,7).map((a:any)=>({ id:a.id, headline:a.title_bn||a.title_en, body:(a.excerpt_bn||a.content_bn||'').slice(0,400), image:a.thumbnail_url||a.featured_image||null })), briefs:rows.slice(7,14).map((a:any)=>a.title_bn||a.title_en) }] }});
  }catch(e:any){ return NextResponse.json({edition:null, error:e.message}); }
}
