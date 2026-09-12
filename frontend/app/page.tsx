import { api } from '../lib/api';
import type { Metadata } from 'next';
import { HeroBentoGrid } from '../components/hero-bento';
import { LatestGrid } from '../components/latest-grid';
import { CategoryModules } from '../components/category-modules';
import { AudioPlayerWidget } from '../components/audio-player';
import { LiveBlog, type LiveEntry } from '../components/live-blog';
import { VideoHub, type VideoItem } from '../components/video-hub';
import { AINewsAnchor } from '../components/ai-anchor';
import { NewsletterCta } from '../components/newsletter-cta';
// Local Fallback Mock Data Engine — rich Bengali corpus used whenever the
// API is unreachable, so the homepage never renders blank/unstyled.
import { mockFeedItems, mockLiveEntries, mockVideoItems } from '../lib/mockData';
import type { FeedArticle } from '../lib/mockData';

export const revalidate = 60; // ISR — rebuild at most once per minute

export const metadata: Metadata = {
  title: 'সর্বশেষ সংবাদ',
  description: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্ভীক',
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
  let liveEntries: LiveEntry[] = [];
  let videoItems: VideoItem[] = [];

  try {
    const data = await api.articles(20);
    items = data.items || [];
  } catch (e) {
    error = e instanceof Error ? e.message : 'connection failed';
  }
  // Live-blog + video feeds come from dedicated public endpoints. On failure we
  // silently fall back to demo data so the homepage never breaks.
  try {
    const d = await api.live();
    liveEntries = d.entries || [];
  } catch {
    /* demo fallback below */
  }
  try {
    const d = await api.videos();
    videoItems = d.videos || [];
  } catch {
    /* demo fallback below */
  }

  const feed: FeedArticle[] = items.length ? items : mockFeedItems;
  const live: LiveEntry[] = liveEntries.length ? liveEntries : mockLiveEntries;
  const videos: VideoItem[] = videoItems.length ? videoItems : mockVideoItems;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-28">
      <section className="mb-10 text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-primary dark:border-white/10 dark:bg-neutral-800">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-primary" />
          বাংলার ভয়েস
        </p>
        <h1 className="font-serifbn text-2xl font-extrabold leading-tight md:text-3xl">
          স্বাধীন সংবাদ প্রচারে নির্ভীক
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
          বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা
        </p>
      </section>

      {error && (
        <div className="mx-auto mb-6 max-w-xl rounded border border-amber-300 bg-amber-50 p-4 text-center text-sm dark:bg-amber-900/30">
          ব্যাকএন্ডে সংযোগ হয়নি ({error}) — <code>NEXT_PUBLIC_API_URL</code> ঠিক করুন। ডেমো মোডে নিচে নমুনা সংবাদ দেখানো হচ্ছে।
        </div>
      )}

      {/* 60% lead + stacked secondary + tabbed right rail (সর্বশেষ/ট্রেন্ডিং) */}
      <HeroBentoGrid articles={feed.map(toBento)} />

      {/* App download banner — mobile users */}
      <section
        aria-label="অ্যাপ ডাউনলোড"
        className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-crimson/20 bg-gradient-to-r from-crimson/10 via-paper to-paper p-5 sm:flex-row sm:p-6 dark:from-crimson/20 dark:via-neutral-900 dark:to-neutral-900"
      >
        <div className="flex items-center gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-crimson text-white sm:flex" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </span>
          <div>
            <p className="font-serif text-lg font-bold text-ink dark:text-paper">বাংলার ভয়েস অ্যান্ড্রয়েড অ্যাপ</p>
            <p className="text-[13px] text-neutral-600 dark:text-neutral-400">
              ব্রেকিং নিউজ, লাইভ টিভি, শর্টস ও অডিও মোড — এখন আপনার ফোনে।
            </p>
          </div>
        </div>
        <a
          href="/download"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-crimson px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-crimson-dark"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          অ্যাপ ডাউনলোড
        </a>
      </section>

      {feed.length > 3 && (
        <section id="latest" className="mt-14 scroll-mt-24" aria-labelledby="latest-heading">
          <LatestGrid articles={feed.map(toBento)} />
        </section>
      )}

      {feed.length >= 6 && <CategoryModules articles={feed.map(toBento)} />}

      {items.length === 0 && !error && (
        <p className="py-10 text-center text-neutral-400">কোনো প্রকাশিত সংবাদ নেই।</p>
      )}

      {/* Al Jazeera-style live-blog timeline */}
      <LiveBlog entries={live} />

      {/* Dark video & podcast hub */}
      <VideoHub videos={videos} />

      {/* AI news anchor — virtual presenter with Bengali voice-over */}
      <AINewsAnchor
        script={{
          title: 'আজকের প্রধান সংবাদ — AI অ্যাংকরের সাথে',
          body: 'স্বাগতম। আজকের প্রধান সংবাদে — পদ্মা সেতু দিয়ে প্রথম দিনে রেকর্ড সংখ্যক যানবাহন পারাপার হয়েছে, টোল আদায় হয়েছে দুই কোটি টাকা। অর্থনীতিতে নতুন আশার আলো দেখছেন বিশ্লেষকরা। পাশাপাশি, জাতীয় সংসদে বাজেট অধিবেশন শুরু হয়েছে, যেখানে আগামী বছরের বাজেট নিয়ে আলোচনা চলছে। ক্রীড়া জগতে, বাংলাদেশের ক্রিকেট দল সিরিজ জয়ের পথে। বিস্তারিত থাকছে আমাদের পরবর্তী সংবাদে।',
        }}
      />

      {/* Membership / newsletter hook */}
      <NewsletterCta />

      <AudioPlayerWidget text={feed.map((a) => `${a.title_bn}। ${a.dek_bn || ''}`).join(' ')} title="আজকের প্রধান সংবাদ শুনুন" />
    </main>
  );
}
