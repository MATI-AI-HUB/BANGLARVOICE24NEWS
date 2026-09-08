import { api } from '../lib/api';
import type { Metadata } from 'next';
import { HeroBentoGrid } from '../components/hero-bento';
import { LatestGrid } from '../components/latest-grid';
import { CategoryModules } from '../components/category-modules';
import { AudioPlayerWidget } from '../components/audio-player';
import { LiveBlog, type LiveEntry } from '../components/live-blog';
import { VideoHub, type VideoItem } from '../components/video-hub';
import { NewsletterCta } from '../components/newsletter-cta';
// Local Fallback Mock Data Engine — rich Bengali corpus used whenever the
// API is unreachable, so the homepage never renders blank/unstyled.
import { mockFeedItems, mockLiveEntries, mockVideoItems } from '../lib/mockData';
import type { FeedArticle } from '../lib/mockData';

export const revalidate = 60; // ISR — rebuild at most once per minute

export const metadata: Metadata = {
  title: 'সর্বশেষ সংবাদ',
  description: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্বাক',
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
        <h1 className="font-serifbn text-4xl font-extrabold leading-tight md:text-5xl">
          স্বাধীন সংবাদ প্রচারে নির্বাক
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

      {/* Membership / newsletter hook */}
      <NewsletterCta />

      <AudioPlayerWidget text={feed.map((a) => `${a.title_bn}। ${a.dek_bn || ''}`).join(' ')} title="আজকের প্রধান সংবাদ শুনুন" />
    </main>
  );
}
