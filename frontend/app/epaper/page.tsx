import EPaperViewer from '../../components/epaper/EPaperViewer';
import PdfArchiveViewer from '../../components/epaper/PdfArchiveViewer';
import { createPublicSupabase, fetchPublishedArticlesFeed } from '../../lib/supabase/published-articles';
export const dynamic = 'force-dynamic';
export default async function EpaperPage() {
  let rows:any[] = [];
  try {
    rows = await fetchPublishedArticlesFeed(createPublicSupabase(), 20);
  } catch (error) {
    console.error('[epaper] failed to load published articles:', error instanceof Error ? error.message : error);
    rows = [];
  }
  let archive: { url: string; label: string } | null = null;
  try {
    const { data } = await createPublicSupabase()
      .from('epaper_editions')
      .select('title, archive_path')
      .not('archive_path', 'is', null)
      .order('edition_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    if (data?.archive_path && base) {
      archive = {
        url: `${base}/storage/v1/object/public/epaper-archives/${data.archive_path}`,
        label: `সর্বশেষ আর্কাইভ — ${data.title}`,
      };
    }
  } catch {
    archive = null;
  }
  const now = new Date();
  if(!rows.length) return <div className="p-10 text-center bg-[#f4f1ea]">কোনো প্রকাশিত সংবাদ নেই</div>;
  const edition = {
    editionDate: now.toISOString().split('T')[0],
    editionLabel: now.toLocaleDateString('bn-BD', { year:'numeric', month:'long', day:'numeric' }),
    volume:'1', issue:1,
    pages:[{
      number:1, section:'প্রথম পাতা', layout:'front',
      lead:{ id:rows[0].id, headline:rows[0].title_bn||rows[0].title_en, body:(rows[0].excerpt_bn||rows[0].content_bn||'').slice(0,600) },
      articles: rows.slice(1,6).map((a:any)=>({ id:a.id, headline:a.title_bn||a.title_en, body:(a.excerpt_bn||a.content_bn||'').slice(0,400) })),
      briefs: rows.slice(6,12).map((a:any)=>a.title_bn||a.title_en),
    }],
  };
  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <div className="mx-auto max-w-5xl px-4 pt-3"><div className="h-[3px] bg-[#1a1a1a]" />
        <div className="flex justify-between py-1.5 text-[10px] font-mono uppercase"><span>ঢাকা | {edition.editionLabel}</span><span>লাইভ • {rows.length}</span><span>banglarvoice24news.com</span></div>
        <div className="border-y-[3px] border-double bg-white py-3 text-center"><h1 className="font-serifbn text-[32px] font-black md:text-[48px]">বাংলার ভয়েস | 24NEWS</h1></div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6">{archive && <PdfArchiveViewer url={archive.url} label={archive.label} />}<EPaperViewer edition={edition as any} /></main>
    </div>
  );
}
