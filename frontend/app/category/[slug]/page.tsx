import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { LOCALE_COOKIE, getLocaleFromCookie, t, translateCategory } from '../../../lib/i18n';
import { ArticleCard } from '../../../components/hero-bento';
import { FallbackFeed } from '../../../components/feed/FallbackFeed';
import { categorySlug, isKnownCategorySlug } from '../../../lib/category';
import type { FeedArticle } from '../../../lib/mockData';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE)?.value);

  let items: FeedArticle[] = [];
  try {
    const data = await api.articles(50, locale);
    items = data.items || [];
  } catch {
    items = [];
  }

  if (!isKnownCategorySlug(slug)) notFound();
  const matches = items.filter((a) => categorySlug(a.category || '') === slug);
  const label = translateCategory(locale, matches[0]?.category || slug);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serifbn text-3xl font-extrabold">{label}</h1>
      {matches.length === 0 ? (
        <FallbackFeed category={label} locale={locale} candidates={items} />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((a) => (
            <ArticleCard
              key={a.id}
              locale={locale}
              article={{
                id: a.id,
                slug: a.slug,
                title: locale === 'en' ? (a.title_en || a.title_bn) : a.title_bn,
                summary: locale === 'en' ? (a.dek_en || a.dek_bn) : a.dek_bn,
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
      )}
      <p className="mt-8">
        <Link href="/" className="text-sm font-semibold text-primary underline">
          {t(locale, 'back_home')}
        </Link>
      </p>
    </main>
  );
}
