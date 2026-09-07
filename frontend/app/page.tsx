import { api } from '../lib/api';
import type { Metadata } from 'next';
import { HeroBentoGrid } from '../components/hero-bento';
import { LatestGrid } from '../components/latest-grid';
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
  category: a.category,
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

      {feed.length > 3 && (
        <section id="latest" className="mt-14 scroll-mt-24">
          <LatestGrid articles={feed.map(toBento)} />
        </section>
      )}

      {items.length === 0 && !error && (
        <p className="py-10 text-center text-neutral-400">কোনো প্রকাশিত সংবাদ নেই।</p>
      )}

      <AudioPlayerWidget text={feed.map((a) => `${a.title_bn}। ${a.dek_bn || ''}`).join(' ')} title="আজকের প্রধান সংবাদ শুনুন" />
    </main>
  );
}

const demoItems: FeedArticle[] = [
  { id: 'demo-1', slug: 'demo-1', title_bn: 'পদ্মা সেতু দিয়ে রেকর্ড যানবাহন পারাপার', dek_bn: 'প্রথম দিনে ৫১ হাজার যান, টোল আদায় ২ কোটি টাকা — যা যা জানা গেল।', category: 'অর্থনীতি', reading_time_min: 4, bias_index: 15, published_at: new Date(Date.now() - 2 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd1/800/450' },
  { id: 'demo-2', slug: 'demo-2', title_bn: 'নির্বাচন কমিশনের নতুন নির্দেশনা', dek_bn: 'রাজনৈতিক দলগুলোর প্রতিক্রিয়া ও বিশ্লেষণ।', category: 'রাজনীতি', reading_time_min: 3, bias_index: 20, published_at: new Date(Date.now() - 3 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd2/800/450' },
  { id: 'demo-3', slug: 'demo-3', title_bn: 'জ্বালানি বাজারে নতুন শুল্ক — বিশ্ববাজারে প্রভাব', dek_bn: 'আন্তর্জাতিক বাজার বিশ্লেষণ।', category: 'আন্তর্জাতিক', reading_time_min: 5, bias_index: 25, published_at: new Date(Date.now() - 4 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd3/800/450' },
  { id: 'demo-4', slug: 'demo-4', title_bn: 'গাজায় যুদ্ধবিরতির নতুন প্রস্তাবে ভিন্নমত', dek_bn: 'কায়রো আলোচনায় যুক্তরাষ্ট্রের মধ্যস্থতা নিয়ে সংশয়।', category: 'আন্তর্জাতিক', reading_time_min: 6, bias_index: 40, published_at: new Date(Date.now() - 5 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd4/800/450' },
  { id: 'demo-5', slug: 'demo-5', title_bn: 'রপ্তানি আয়ে রেকর্ড — প্রবৃদ্ধির ধারা অব্যাহত', dek_bn: 'চলতি অর্থবছরের প্রথম আট মাসে প্রবৃদ্ধি ১২ শতাংশ।', category: 'অর্থনীতি', reading_time_min: 4, bias_index: 12, published_at: new Date(Date.now() - 6 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd5/800/450' },
  { id: 'demo-6', slug: 'demo-6', title_bn: 'ঐতিহাসিক জয়ে উল্লাস — ফাইনালে বাংলাদেশ', dek_bn: 'টাইব্রেকারে নাটকীয় জয়, ফাইনালে প্রতিপক্ষ ভারত।', category: 'খেলা', reading_time_min: 3, bias_index: 8, published_at: new Date(Date.now() - 7 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd6/800/450' },
  { id: 'demo-7', slug: 'demo-7', title_bn: 'আন্তর্জাতিক চলচ্চিত্র উৎসবে বাংলাদেশের স্বীকৃতি', dek_bn: 'তরুণ নির্মাতার ছবি পেল বিশেষ জুরি পুরস্কার।', category: 'বিনোদন', reading_time_min: 4, bias_index: 18, published_at: new Date(Date.now() - 8 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd7/800/450' },
  { id: 'demo-8', slug: 'demo-8', title_bn: 'নতুন পাঠ্যক্রম চূড়ান্ত — প্রাথমিকে যা বদলাচ্ছে', dek_bn: 'মূল্যায়ন পদ্ধতি ও বিষয়ভিত্তিক পরিবর্তনের খসড়া চূড়ান্ত।', category: 'শিক্ষা', reading_time_min: 5, bias_index: 22, published_at: new Date(Date.now() - 9 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd8/800/450' },
  { id: 'demo-9', slug: 'demo-9', title_bn: 'ডেঙ্গুর নতুন মৌসুমের আগে টিকা নিবন্ধন শুরু', dek_bn: 'বিশেষ টিকাদান কর্মসূচির আওতায় প্রথম ধাপে ৫ লাখ ডোজ।', category: 'স্বাস্থ্য', reading_time_min: 4, bias_index: 10, published_at: new Date(Date.now() - 11 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd9/800/450' },
  { id: 'demo-10', slug: 'demo-10', title_bn: 'সংসদে নতুন বিল উত্থাপন — বিতর্কিত ধারা নিয়ে প্রশ্ন', dek_bn: 'বিরোধী দলের আপত্তি, সংশোধনীর দাবি।', category: 'রাজনীতি', reading_time_min: 6, bias_index: 45, published_at: new Date(Date.now() - 13 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd10/800/450' },
  { id: 'demo-11', slug: 'demo-11', title_bn: 'জুমার খুতবায় একীভূত ভাষার নির্দেশনা নিয়ে আলোচনা', dek_bn: 'ধর্ম মন্ত্রণালয়ের উদ্যোগে ইমামদের সম্মেলন।', category: 'ধর্ম', reading_time_min: 3, bias_index: 28, published_at: new Date(Date.now() - 15 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd11/800/450' },
  { id: 'demo-12', slug: 'demo-12', title_bn: 'জলবায়ু সম্মেলনে বাংলাদেশের নতুন অঙ্গীকার', dek_bn: 'নবায়নযোগ্য জ্বালানিতে ২০৩০-এর মধ্যে ৪০ শতাংশ লক্ষ্য।', category: 'আন্তর্জাতিক', reading_time_min: 5, bias_index: 16, published_at: new Date(Date.now() - 18 * 3600e3).toISOString(), featured_image: 'https://picsum.photos/seed/bvd12/800/450' },
];
