import { cookies } from 'next/headers';
import { LOCALE_COOKIE, getLocaleFromCookie, t, type Locale } from '../lib/i18n';
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

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'সর্বশেষ সংবাদ',
  description: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্ভীক',
};

const toBento = (a: FeedArticle, locale: Locale) => ({
  id: a.id,
  slug: a.slug,
  title: locale === 'en' ? (a.title_en || a.title_bn) : a.title_bn,
  summary: locale === 'en' ? (a.dek_en || a.dek_bn) : a.dek_bn,
  category: a.category,
  image_url: a.featured_image,
  read_time: a.reading_time_min,
  bias_index: a.bias_index,
  published_at: a.published_at,
  source_name: a.source_name,
  source_url: a.source_url,
  image_credit: a.image_credit,
  origin: a.origin,
});

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE)?.value);
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

  // Demo data is local-development only; production must never show mock news.
  const demoMode = process.env.NODE_ENV !== 'production';

  const feed: FeedArticle[] =
    items.length > 0 ? items : (demoMode ? mockFeedItems : []);

  const live: LiveEntry[] =
    liveEntries.length > 0 ? liveEntries : (demoMode ? mockLiveEntries : []);

  const videos: VideoItem[] =
    videoItems.length > 0 ? videoItems : (demoMode ? mockVideoItems : []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-28">
      <section className="mb-10 text-center">
              <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-border bg-gradient-to-r from-paper via-paper to-muted px-5 py-2 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
        />
        <span className="text-base font-black uppercase tracking-widest text-primary dark:text-paper">
          বাংলার ভয়েস
        </span>
        <span aria-hidden="true" className="h-4 w-px bg-crimson/60" />
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-serifbn text-lg font-black leading-none text-crimson">
            24
          </span>
          <span className="text-xs font-black uppercase tracking-[0.22em] text-ink/70 dark:text-paper/70">
            News
          </span>
        </span>
      </div>
        <h1 className="font-serifbn text-2xl font-extrabold leading-tight md:text-3xl">
          {t(locale, "hero_title")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
          {t(locale, "hero_subtitle")}
        </p>
      </section>

      {error && (
        <div className="mx-auto mb-6 max-w-xl rounded border border-amber-300 bg-amber-50 p-4 text-center text-sm dark:bg-amber-900/30">
          {demoMode ? (
            <>
              ব্যাকএন্ডে সংযোগ হয়নি ({error}) — <code>NEXT_PUBLIC_API_URL</code> ঠিক করুন। ডেমো মোডে নিচে নমুনা সংবাদ দেখানো হচ্ছে।
            </>
          ) : (
            <>ব্যাকএন্ডে সংযোগ হয়নি ({error})। প্রকাশিত সংবাদ এই মুহূর্তে লোড করা যায়নি।</>
          )}
        </div>
      )}

      {/* 60% lead + stacked secondary + tabbed right rail (সর্বশেষ/ট্রেন্ডিং) */}
      <HeroBentoGrid articles={feed.map((a) => toBento(a, locale))} locale={locale} />

      {/* App download banner — mobile users */}
      <section
        aria-label={t(locale, 'app_download_cta')}
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
            <p className="font-serif text-lg font-bold text-ink dark:text-paper">{t(locale, 'app_banner_title')}</p>
            <p className="text-[13px] text-neutral-600 dark:text-neutral-400">
              {t(locale, 'app_banner_body')}
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
          {t(locale, 'app_download_cta')}
        </a>
      </section>

      {feed.length > 3 && (
        <section id="latest" className="mt-14 scroll-mt-24" aria-labelledby="latest-heading">
          <LatestGrid articles={feed.map((a) => toBento(a, locale))} locale={locale} />
        </section>
      )}

      {feed.length >= 6 && <CategoryModules articles={feed.map((a) => toBento(a, locale))} locale={locale} />}

      {items.length === 0 && !error && (
        <p className="py-10 text-center text-neutral-400">কোনো প্রকাশিত সংবাদ নেই।</p>
      )}

      {/* Al Jazeera-style live-blog timeline */}
      <LiveBlog entries={live} locale={locale} />

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

      <AudioPlayerWidget text={feed.map((a) => `${a.title_bn}। ${a.dek_bn || ''}`).join(' ')} title={t(locale, 'audio_today_headlines')} locale={locale} />
    </main>
  );
}
