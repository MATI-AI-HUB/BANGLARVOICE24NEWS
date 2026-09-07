import { api } from '../lib/api';
import type { Metadata } from 'next';
import { HeroBentoGrid } from '../components/hero-bento';
import { AudioPlayerWidget } from '../components/audio-player';

export const revalidate = 60; // ISR — rebuild at most once per minute

export const metadata: Metadata = {
  title: 'সর্বশেষ সংবাদ',
  description: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্বাক',
};

type FeedArticle = {
  id: string;
  slug: string;
  title_bn: string;
  dek_bn?: string;
  category?: string;
  featured_image?: string;
  reading_time_min?: number;
  bias_index?: number;
  published_at?: string;
};

const toBento = (a: FeedArticle) => ({
  id: a.id,
  slug: a.slug,
  title: a.title_bn,
  summary: a.dek_bn,
  category: a.category || 'সর্বশেষ',
  image_url: a.featured_image,
  read_time: a.reading_time_min,
  bias_index: a.bias_index,
  published_at: a.published_at,
});

export default async function HomePage() {
  let items: FeedArticle[] = [];
  let error = '';

  try {
    const data = await api.articles(20);
    items = data.items || [];
  } catch (e) {
    error = e instanceof Error ? e.message : 'connection failed';
  }

  const feed: FeedArticle[] = items.length ? items : demoItems;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-28">
      <section className="mb-10 text-center">
        <h1 className="font-serifbn text-4xl font-extrabold leading-tight md:text-5xl">
          স্বাধীন সংবাদ প্রচারে নির্বাক
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
          বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নিরপেক্ষ সাংবাদিকতা
        </p>
      </section>

      {error && (
        <div className="mx-auto mb-6 max-w-xl rounded border border-amber-300 bg-amber-50 p-4 text-center text-sm dark:bg-amber-900/30">
          ব্যাকএন্ডে সংযোগ হয়নি ({error}) — <code>NEXT_PUBLIC_API_URL</code> ঠিক করুন। ডেমো মোডে নিচে নমুনা সংবাদ দেখানো হচ্ছে।
        </div>
      )}

      <HeroBentoGrid articles={feed.map(toBento)} />

      {items.length === 0 && !error && (
        <p className="py-10 text-center text-neutral-400">কোনো প্রকাশিত সংবাদ নেই।</p>
      )}

      <AudioPlayerWidget text={feed.map((a) => `${a.title_bn}। ${a.dek_bn || ''}`).join(' ')} title="আজকের প্রধান সংবাদ শুনুন" />
    </main>
  );
}

const demoItems: FeedArticle[] = [
  { id: 'demo-1', slug: 'demo-1', title_bn: 'পদ্মা সেতু দিয়ে রেকর্ড যানবাহন পারাপার', dek_bn: 'প্রথম দিনে ৫১ হাজার যান, টোল আদায় ২ কোটি টাকা — যা যা জানা গেল।', category: 'অর্থনীতি', reading_time_min: 4, bias_index: 15 },
  { id: 'demo-2', slug: 'demo-2', title_bn: 'নির্বাচন কমিশনের নতুন নির্দেশনা', dek_bn: 'রাজনৈতিক দলগুলোর প্রতিক্রিয়া ও বিশ্লেষণ।', category: 'রাজনীতি', reading_time_min: 3, bias_index: 20 },
  { id: 'demo-3', slug: 'demo-3', title_bn: 'জ্বালানি বাজারে নতুন শুল্ক — বিশ্ববাজারে প্রভাব', dek_bn: 'আন্তর্জাতিক বাজার বিশ্লেষণ।', category: 'আন্তর্জাতিক', reading_time_min: 5, bias_index: 25 },
];
