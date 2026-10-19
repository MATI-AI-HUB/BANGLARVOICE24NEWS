import { api } from '../../../lib/api';
import { formatBnDate } from '../../../lib/bn-date';
import { cookies } from 'next/headers';
import { getLocaleFromCookie, LOCALE_COOKIE, t, translateCategory, type Locale } from '../../../lib/i18n';
import { mockFeedItems } from '../../../lib/mockData';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { AudioPlayerWidget } from '../../../components/audio-player';
import { TrustSignals } from '../../../components/trust-signals';
import { Breadcrumb } from '../../../components/breadcrumb';
import { RelatedArticles } from '../../../components/related-articles';
import { ArticleComments } from '../../../components/article-comments';
import { ShareButtons } from '../../../components/share-buttons';
import { canonicalSiteUrl } from '../../../lib/site';

export const revalidate = 60;

const BASE = canonicalSiteUrl();

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
  // DB fields (via api.ts spread)
  ai_model?: string;
  ai_confidence?: number;
  source_name?: string;
  source_url?: string;
  source_published_at?: string;
  image_credit?: string;
  image_alt_bn?: string;
  image_is_representational?: boolean;
  category_key?: string;
  verification_status?: string;
  verification_score?: number;
  ai_verified?: boolean;
  human_verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  fact_sources?: unknown;
  content_credentials?: unknown;
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

type LoadResult =
  | { status: 'ok'; article: ArticleData }
  | { status: 'missing' };

function mockArticle(slug: string): ArticleData | null {
  if (process.env.NODE_ENV === 'production') return null;
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

async function loadArticle(slug: string, _locale: Locale = 'bn'): Promise<LoadResult> {
  try {
    const a = (await api.article(slug)) as Partial<ArticleData> | null;
    if (a && a.slug && (a.title_bn || a.body_bn)) {
      return { status: 'ok', article: a as ArticleData };
    }
  } catch {
    const demo = mockArticle(slug);
    if (demo) return { status: 'ok', article: demo };
    return { status: 'missing' };
  }

  const demo = mockArticle(slug);
  if (demo) return { status: 'ok', article: demo };
  return { status: 'missing' };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE)?.value);
  const loaded = await loadArticle(slug, locale);
  if (loaded.status !== 'ok') return { title: 'পাতা নেই', robots: { index: false, follow: false } };
  const a = loaded.article;
  const displayTitle = locale === 'en' ? (a.title_en || a.title_bn) : a.title_bn;
  const displayDek = locale === 'en' ? (a.dek_en || a.dek_bn) : a.dek_bn;

  const image = a.featured_image
    ? { url: a.featured_image, alt: a.image_alt_bn || displayTitle }
    : undefined;

  return {
    title: displayTitle,
    description: displayDek || a.seo_description,
    alternates: { canonical: `${BASE}/article/${slug}` },
    openGraph: {
      title: displayTitle,
      description: displayDek,
      type: 'article',
      url: `${BASE}/article/${slug}`,
      locale: locale === 'en' ? 'en_US' : 'bn_BD',
      publishedTime: a.published_at,
      authors: a.author_name ? [a.author_name] : undefined,
      images: image ? [image] : [{ url: `${BASE}/banglar-voice-logo.png`, alt: 'বাংলার ভয়েস' }],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE)?.value);

  const loaded = await loadArticle(slug, locale);
  if (loaded.status !== 'ok' || !loaded.article?.slug || !loaded.article.title_bn) notFound();
  const a = loaded.article;

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
    author: { '@type': 'Organization', name: a.source_name || a.author_name || 'সূত্র' },
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
        <Breadcrumb category={a.category} title={displayTitle} locale={locale} />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-crimson"
        >
          <span aria-hidden="true">←</span> {t(locale, 'back_home')}
        </Link>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
        <span>{translateCategory(locale, a.category || '')}</span>
        {typeof a.bias_index === 'number' && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800">
            {t(locale, 'bias_score')} {a.bias_index}/100
          </span>
        )}
      </div>
      <h1 className="mt-2 font-serifbn text-3xl font-extrabold leading-tight md:text-4xl">{displayTitle}</h1>
      {displayDek && (
        <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">{displayDek}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        {a.author_name && <span>{t(locale, 'author_prefix')}: {a.author_name}</span>}
        {a.reading_time_min ? <span>• {a.reading_time_min} {t(locale, 'min_read')}</span> : null}
        {a.published_at ? (
          <span>• {formatBnDate(a.published_at, locale)}</span>
        ) : null}
        <span className="ml-auto">
          <ShareButtons title={displayTitle} />
        </span>
      </div>
      {a.featured_image && (
        <Image
          src={a.featured_image}
          alt={a.image_alt_bn || displayTitle}
          width={1280}
          height={720}
          className="mt-6 aspect-video w-full rounded object-cover"
          unoptimized
        />
      )}
      {a.image_is_representational ? (
        <p className="mt-2 text-xs font-semibold text-neutral-500">প্রতীকী ছবি</p>
      ) : null}
      {a.image_credit ? (
        <p className="mt-2 text-xs text-neutral-500">ছবি: {a.image_credit}</p>
      ) : null}
      <div
        className="prose mt-8 max-w-none whitespace-pre-wrap font-serifbn text-lg leading-[1.9]"
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />
      {a.source_url ? (
        <p className="mt-6 border-t border-border pt-3 text-sm text-neutral-500 dark:border-white/10">
          সূত্র: {a.source_name || 'মূল সংবাদ'}{' '}
          <a
            href={a.source_url}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="font-semibold text-primary underline"
          >
            মূল প্রতিবেদন
          </a>
        </p>
      ) : null}
      {a.tags && a.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {a.tags.map((t: string) => (
            <span key={t} className="rounded-full bg-muted px-3 py-1 text-sm">
              #{t}
            </span>
          ))}
        </div>
      )}

      <TrustSignals
        ai_model={a.ai_model}
        ai_confidence={a.ai_confidence}
        source_name={a.source_name}
        source_url={a.source_url}
        source_published_at={a.source_published_at}
        image_credit={a.image_credit}
        verification_status={a.verification_status}
        verification_score={a.verification_score}
        ai_verified={a.ai_verified}
        human_verified={a.human_verified}
        verified_at={a.verified_at}
        locale={locale}
      />

      <AudioPlayerWidget text={narrateText} title={displayTitle} locale={locale} />

      <div className="mt-10 border-t border-border pt-6 dark:border-white/10">
        <ShareButtons title={displayTitle} />
      </div>

      <ArticleComments articleSlug={a.slug} locale={locale} />
      <RelatedArticles currentSlug={a.slug} category={a.category} locale={locale} />
    </article>
  );
}
