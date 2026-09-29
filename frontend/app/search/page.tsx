import { cookies } from 'next/headers';
import Link from 'next/link';
import { api } from '../../lib/api';
import { LOCALE_COOKIE, getLocaleFromCookie, t } from '../../lib/i18n';
import { ArticleCard } from '../../components/hero-bento';
import type { FeedArticle } from '../../lib/mockData';

export const revalidate = 60;

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE)?.value);

  let items: FeedArticle[] = [];
  try {
    const data = await api.articles(50);
    items = data.items || [];
  } catch {
    items = [];
  }

  const needle = query.toLowerCase();
  const hits = needle
    ? items.filter((a) =>
        [a.title_bn, a.dek_bn, a.source_name, a.category]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      )
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serifbn text-2xl font-extrabold">{t(locale, 'search_placeholder')}</h1>
      <form action="/search" method="get" className="mt-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          {t(locale, 'search_placeholder')}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder={t(locale, 'search_placeholder')}
          className="w-full rounded-full border border-border bg-white px-4 py-2 text-sm dark:border-white/15 dark:bg-neutral-900"
        />
        <button type="submit" className="rounded-full bg-crimson px-5 py-2 text-sm font-bold text-white">
          খুঁজুন
        </button>
      </form>
      {!query && <p className="mt-6 text-neutral-500">একটি শব্দ লিখে খুঁজুন।</p>}
      {query && hits.length === 0 && (
        <p className="mt-6 text-neutral-500">কোনো ফলাফল নেই।</p>
      )}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {hits.map((a) => (
          <ArticleCard
            key={a.id}
            locale={locale}
            article={{
              id: a.id,
              slug: a.slug,
              title: a.title_bn,
              summary: a.dek_bn,
              category: a.category,
              image_url: a.featured_image,
              image_credit: a.image_credit,
              read_time: a.reading_time_min,
              published_at: a.published_at,
              source_name: a.source_name,
              source_url: a.source_url,
            }}
            href={`/article/${a.slug}`}
          />
        ))}
      </div>
      <p className="mt-8">
        <Link href="/" className="text-sm font-semibold text-primary underline">
          {t(locale, 'back_home')}
        </Link>
      </p>
    </main>
  );
}
