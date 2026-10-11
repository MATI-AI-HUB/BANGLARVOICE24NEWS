import EPaperViewer from '../../components/epaper/EPaperViewer';
import { fetchPublishedArticlesFeed } from '../../lib/supabase/published-articles';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function EpaperPage() {
  const articles = await fetchPublishedArticlesFeed(20);
  const now = new Date();
  const edition = {
    editionDate: now.toISOString().split('T')[0],
    editionLabel: now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }),
    volume: '১',
    issue: 1,
    pages: articles.length? [
      {
        number: 1,
        section: 'প্রথম পাতা',
        layout: 'front',
        lead: { id: articles[0].id, headline: articles[0].title, body: (articles[0].excerpt || articles[0].content || '').slice(0, 600), attribution: articles[0].author || 'বাংলার ভয়েস' },
        articles: articles.slice(1, 6).map((a: any) => ({ id: a.id, headline: a.title, body: (a.excerpt || a.content || '').slice(0, 400), attribution: a.author })),
        briefs: articles.slice(6, 13).map((a: any) => a.title),
      },
    ] : [],
  };

  if (edition.pages.length === 0) {
    return <div className="p-10 text-center">কোনো প্রকাশিত সংবাদ পাওয়া যায়নি — Admin > Articles থেকে published করুন</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <div className="border-b bg-[#f4f1ea]">
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <div className="h-[3px] bg-[#1a1a1a]" />
          <div className="flex justify-between py-1.5 text-[10px] font-mono uppercase">
            <span>ঢাকা | {edition.editionLabel}</span>
            <span>লাইভ • {articles.length}টি সংবাদ</span>
            <span>banglarvoice24news.com</span>
          </div>
          <div className="border-y-[3px] border-double border-[#2d2a26] bg-white py-3 text-center">
            <h1 className="font-serifbn text-[32px] font-black md:text-[48px]">বাংলার ভয়েস <span className="ml-1 text-[14px] align-super">| 24NEWS</span></h1>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <EPaperViewer edition={edition as any} />
      </main>
    </div>
  );
}
