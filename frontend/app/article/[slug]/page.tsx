import { api } from '../../../lib/api';
import { formatBnDate } from '../../../lib/bn-date';
import { cookies } from 'next/headers';
import { getLocaleFromCookie, LOCALE_COOKIE, type Locale } from '../../../lib/i18n';
import { mockFeedItems } from '../../../lib/mockData';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AudioPlayerWidget } from '../../../components/audio-player';
import { Breadcrumb } from '../../../components/breadcrumb';
import { RelatedArticles } from '../../../components/related-articles';
import { ShareButtons } from '../../../components/share-buttons';

export const revalidate = 60;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice24news.com';

type PageProps = { params: Promise<{ slug: string }> };

type ArticleData = {
  slug: string;
  title_bn: string;
  title_en?: string;
  dek_bn?: string;
  dek_en?: string;
  body_bn?: string;
  body_en?: string;
  seo_description?: string;
  category?: string;
  featured_image?: string;
  reading_time_min?: number;
  bias_index?: number;
  published_at?: string;
  author_name?: string;
  tags?: string[];
};

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Lightweight server-safe HTML sanitizer ───
function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}

async function loadArticle(slug: string, locale: Locale = 'bn'): Promise<ArticleData | null> {
  try {
    const a = (await api.article(slug)) as Partial<ArticleData> | null;
    if (a && a.slug) return a as ArticleData;
  } catch {
    /* fall through to mock */
  }

  const m = mockFeedItems.find((x) => x.slug === slug);
  if (!m) return null;

  return {
    slug: m.slug,
    title_bn: m.title_bn,
    dek_bn: m.dek_bn,
    body_bn:
      (m.dek_bn || '') +
      '\n\n(ডেমো কনটেন্ট — ব্যাকএন্ড সংযোগ নেই।)',
    category: m.category,
    featured_image: m.featured_image,
    reading_time_min: m.reading_time_min,
    bias_index: m.bias_index,
    published_at: m.published_at,
    author_name: 'বাংলার ভয়েস ডেস্ক',
    tags: [],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE)?.value);
  const a = await loadArticle(slug, locale);
  if (!a) return { title: 'পাতা নেই' };
  const displayTitle = locale === 'en' ? (a.title_en || a.title_bn) : a.title_bn;
  const displayDek = locale === 'en' ? (a.dek_en || a.dek_bn) : a.dek_bn;

  const image = a.featured_image
    ? { url: a.featured_image, alt: displayTitle }
    : undefined;

  return {
    title: displayTitle,
    description: displayDek || a.seo_description,
    alternates: { canonical: `/article/${slug}` },
    openGraph: {
      title: displayTitle,
      description: displayDek,
      type: 'article',
      locale: locale === 'en' ? 'en_US' : 'bn_BD',
      publishedTime: a.published_at,
      authors: a.author_name ? [a.author_name] : undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE)?.value);

  const a = await loadArticle(slug, locale);
  if (!a || !a.slug) notFound();

  const displayTitle = locale === 'en' ? (a.title_en || a.title_bn) : a.title_bn;
  const displayDek = locale === 'en' ? (a.dek_en || a.dek_bn) : a.dek_bn;
  const displayBody = locale === 'en' ? (a.body_en || a.body_bn) : a.body_bn;

  const sanitizedBody = sanitizeHtml(displayBody || '');
  const narrateText = `${displayTitle}। ${displayDek || ''} ${toPlainText(displayBody || '')}`;

  const newsArticleLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: displayTitle,
    description: displayDek || a.seo_description,
    datePublished: a.published_at || undefined,
    author: { '@type': 'Person', name: a.author_name || 'বাংলার ভয়েস ডেস্ক' },
    publisher: {
      '@type': 'Organization',
      name: 'বাংলার ভয়েস',
      logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE}/article/${a.slug}` },
    image: a.featured_image || undefined,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleLd) }}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb category={a.category} title={displayTitle} />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-crimson"
        >
          <span aria-hidden="true">←</span> হোমে ফিরুন
        </Link>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
        <span>{a.category}</span>
        {typeof a.bias_index === 'number' && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800">
            বায়াস স্কোর {a.bias_index}/100
          </span>
        )}
      </div>
      <h1 className="mt-2 font-serifbn text-3xl font-extrabold leading-tight md:text-4xl">{displayTitle}</h1>
      {displayDek && (
        <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">{displayDek}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        {a.author_name && <span>লেখক: {a.author_name}</span>}
        {a.reading_time_min ? <span>• {a.reading_time_min} মিনিট পড়া</span> : null}
        {a.published_at ? (
          <span>• {formatBnDate(a.published_at, 'bn')}</span>
        ) : null}
        <span className="ml-auto">
          <ShareButtons title={displayTitle} />
        </span>
      </div>
      {a.featured_image && (
        <img src={a.featured_image} alt={displayTitle} className="mt-6 aspect-video w-full rounded object-cover" />
      )}
      <div
        className="prose mt-8 max-w-none whitespace-pre-wrap font-serifbn text-lg leading-[1.9]"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />
      {a.tags && a.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {a.tags.map((t: string) => (
            <span key={t} className="rounded-full bg-muted px-3 py-1 text-sm">
              #{t}
            </span>
          ))}
        </div>
      )}

      <AudioPlayerWidget text={narrateText} title={displayTitle} />

      <div className="mt-10 border-t border-border pt-6 dark:border-white/10">
        <ShareButtons title={displayTitle} />
      </div>

      <RelatedArticles currentSlug={a.slug} category={a.category} />
    </article>
  );
}
