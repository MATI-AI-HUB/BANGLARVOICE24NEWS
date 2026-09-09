import Link from 'next/link';
import { api } from '../lib/api';
import { mockFeedItems, type FeedArticle } from '../lib/mockData';

/**
 * Banglar Voice — "আরও সংবাদ পড়ুন" (Related / More news) section.
 * Renders up to 4 related article cards below a single article.
 *
 * Data contract: uses the existing api.articles() feed (PocketBase/Supabase)
 * with the existing mockFeedItems fallback when the backend is unreachable —
 * exactly like the homepage. No data layer changes.
 */
export async function RelatedArticles({
  currentSlug,
  category,
}: {
  currentSlug: string;
  category?: string;
}) {
  let feed: FeedArticle[] = [];
  try {
    const res = await api.articles(12);
    feed = res.items ?? [];
  } catch {
    feed = [];
  }
  if (feed.length === 0) feed = mockFeedItems;

  // Prefer same-category items first, then fill with the latest, excluding self.
  const sameCategory = feed.filter(
    (a) => a.slug !== currentSlug && a.category === category,
  );
  const others = feed.filter(
    (a) => a.slug !== currentSlug && a.category !== category,
  );
  const related = [...sameCategory, ...others].slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section
      aria-label="আরও সংবাদ পড়ুন"
      className="mt-12 border-t border-border pt-8"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serifbn text-2xl font-bold text-ink dark:text-paper">
          আরও সংবাদ পড়ুন
        </h2>
        <Link
          href="/#latest"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-crimson"
        >
          সব দেখুন
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((a) => (
          <Link
            key={a.slug}
            href={`/article/${a.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-paper transition-shadow hover:shadow-card dark:bg-ink dark:border-neutral-800"
          >
            {a.featured_image ? (
              <div className="aspect-video w-full overflow-hidden bg-muted dark:bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.featured_image}
                  alt={a.title_bn}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="aspect-video w-full bg-muted dark:bg-neutral-800" />
            )}
            <div className="flex flex-1 flex-col p-3">
              {a.category ? (
                <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                  {a.category}
                </span>
              ) : null}
              <h3 className="line-clamp-2 font-serifbn text-sm font-bold leading-snug text-ink dark:text-paper">
                {a.title_bn}
              </h3>
              {a.reading_time_min ? (
                <span className="mt-auto pt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {a.reading_time_min} মিনিট পড়া
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}