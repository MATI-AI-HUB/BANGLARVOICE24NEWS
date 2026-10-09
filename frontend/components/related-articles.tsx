import Link from 'next/link';
import Image from 'next/image';
import { api } from '../lib/api';
import { mockFeedItems, type FeedArticle } from '../lib/mockData';
import { t, translateCategory, type Locale } from '../lib/i18n';

const _bn = (s: string | number): string =>
  String(s).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);

export async function RelatedArticles({
  currentSlug,
  category,
  locale = 'bn' as Locale,
}: {
  currentSlug: string;
  category?: string;
  locale?: Locale;
}) {
  let feed: FeedArticle[] = [];
  try {
    const res = await api.articles(12);
    feed = res.items ?? [];
  } catch {
    feed = [];
  }
  if (feed.length === 0) {
    if (process.env.NODE_ENV === 'production') return null;
    feed = mockFeedItems;
  }

  const sameCategory = feed.filter(
    (a) => a.slug !== currentSlug && a.category === category,
  );
  const others = feed.filter(
    (a) => a.slug !== currentSlug && a.category !== category,
  );
  const related = [...sameCategory, ...others].slice(0, 4);

  if (related.length === 0) return null;

  const displayTitle = (a: FeedArticle) =>
    locale === 'en' ? (a.title_en || a.title_bn) : a.title_bn;

  const displayReadTime = (min?: number) => {
    if (!min) return '';
    const n = locale === 'en' ? String(min) : _bn(min);
    return `${n} ${t(locale, 'min_read')}`;
  };

  return (
    <section
      aria-label={t(locale, 'more_news')}
      className="mt-12 border-t border-border pt-8"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serifbn text-2xl font-bold text-ink dark:text-paper">
          {t(locale, 'more_news')}
        </h2>
        <Link
          href="/#latest"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-crimson"
        >
          {t(locale, 'see_all')}
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
                <Image
                  src={a.featured_image}
                  alt={displayTitle(a)}
                  width={640}
                  height={360}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
              </div>
            ) : (
              <div className="aspect-video w-full bg-muted dark:bg-neutral-800" />
            )}
            <div className="flex flex-1 flex-col p-3">
              {a.category ? (
                <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                  {translateCategory(locale, a.category)}
                </span>
              ) : null}
              <h3 className="line-clamp-2 font-serifbn text-sm font-bold leading-snug text-ink dark:text-paper">
                {displayTitle(a)}
              </h3>
              {a.reading_time_min ? (
                <span className="mt-auto pt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {displayReadTime(a.reading_time_min)}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
