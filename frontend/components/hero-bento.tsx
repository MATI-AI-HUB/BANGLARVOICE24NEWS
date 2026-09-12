'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type Article = {
  id?: string;
  slug?: string;
  title: string;
  summary?: string;
  category?: string;
  image_url?: string;
  read_time?: number;
  bias_index?: number;
  published_at?: string;
  author?: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
  return `${Math.round(hrs / 24)} দিন আগে`;
}

function biasBadge(bias?: number) {
  if (bias === undefined || bias === null) return null;
  const v = Math.max(0, Math.min(100, bias));
  const tone = v < 35 ? 'বস্তুনিষ্ঠ' : v < 65 ? 'সুষম' : 'পক্ষপাত-ঝুঁকি';
  const cls =
    v < 35
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
      : v < 65
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-[#CC0000]/10 text-[#CC0000] dark:bg-[#CC0000]/25 dark:text-[#CC0000]';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
      title={`বায়াস ইনডেক্স স্কোর: ${v}/১০০`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {tone} {v}
    </span>
  );
}

function placeholderGradient(seed = ''): string {
  // Deterministic subtle gradient from any seed — no external images, no CLS.
  const palettes = [
    'from-[#E5E2DE] via-[#F5F2ED] to-[#C5A880]/30',
    'from-sky-100 via-indigo-50 to-blue-100',
    'from-emerald-100 via-teal-50 to-lime-100',
    'from-violet-100 via-purple-50 to-fuchsia-100',
    'from-amber-100 via-yellow-50 to-orange-100',
    'from-cyan-100 via-sky-50 to-blue-100',
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

function ZeroClsImg({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  // Zero-CLS image: fixed aspect container + object-cover.
  // No src (or load error) => deterministic gradient art + category glyph stays.
  const grad = placeholderGradient(alt);
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${grad} dark:from-neutral-800 dark:via-neutral-800 dark:to-neutral-700 ${className ?? 'aspect-[16/9] w-full'}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || undefined}
        alt={alt}
        loading="lazy"
        className={`relative z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${src ? 'opacity-100' : 'opacity-0'}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      {!src && (
        <span
          aria-hidden
          className="absolute inset-0 grid select-none place-items-center font-serifbn text-4xl font-extrabold text-black/20 dark:text-white/15"
        >
          {(alt || 'বাংলার ভয়েস').slice(0, 1)}
        </span>
      )}
    </div>
  );
}

/** Big lead card for the bento grid (featured article). */
export function LeadCard({ article, href }: { article: Article; href: string }) {
  return (
    <a
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition-shadow hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
    >
      <ZeroClsImg
        src={article.image_url}
        alt={article.title}
        className="aspect-[16/10] w-full"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <span>{article.category || 'সর্বশেষ'}</span>
          {biasBadge(article.bias_index)}
        </div>
        <h3 className="font-serifbn text-2xl font-extrabold leading-snug text-ink group-hover:text-primary dark:text-paper md:text-3xl">
          {article.title}
        </h3>
        {article.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {article.summary}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
          <span>{article.author || 'বাংলার ভয়েস'}</span>
          {article.read_time ? <span>• {article.read_time} মিনিট পড়া</span> : null}
          <span>• {timeAgo(article.published_at)}</span>
        </div>
      </div>
    </a>
  );
}

/** Compact card used in the secondary grid. */
export function ArticleCard({ article, href }: { article: Article; href: string }) {
  return (
    <a
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
    >
      <ZeroClsImg src={article.image_url} alt={article.title} className="aspect-[16/9] w-full" />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {article.category || 'সর্বশেষ'}
          </span>
          {biasBadge(article.bias_index)}
        </div>
        <h3 className="font-serifbn text-lg font-bold leading-snug text-ink group-hover:text-primary dark:text-paper">
          {article.title}
        </h3>
        <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-neutral-500 dark:text-neutral-400">
          {article.read_time ? <span>{article.read_time} মিনিট</span> : null}
          <span>•</span>
          <span>{timeAgo(article.published_at)}</span>
        </div>
      </div>
    </a>
  );
}

/** Ranked list item for the "ট্রেন্ডিং" column. */
export function TrendingItem({ rank, article, href }: { rank?: number; article: Article; href: string }) {
  return (
    <a
      href={href}
      className="group flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-muted dark:hover:bg-neutral-800"
    >
      {rank !== undefined && (
        <span className="font-serifbn text-2xl font-extrabold leading-none text-neutral-300 dark:text-neutral-600">
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <div className="min-w-0">
        <h4 className="line-clamp-2 text-sm font-bold leading-snug text-ink group-hover:text-primary dark:text-paper">
          {article.title}
        </h4>
        <span className="mt-1 block text-[11px] text-neutral-500">{timeAgo(article.published_at)}</span>
      </div>
    </a>
  );
}

/**
 * HeroBentoGrid — 1 large lead + 2 secondary + trending column.
 * Reads articles from the same server-side data the page already fetched
 * (passed as props) so ISR caching applies once.
 */
export function HeroBentoGrid({ articles }: { articles: Article[] }) {
  // Tabbed right rail: "সর্বশেষ" (recency) vs "ট্রেন্ডিং" (by bias, desc).
  const [tab, setTab] = useState<'latest' | 'trending'>('latest');
  const lead = articles[0];
  const secondary = articles.slice(1, 3);
  const sortedByTime = [...articles].sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
    return tb - ta;
  });
  const railItems =
    tab === 'trending'
      ? [...articles]
          .sort((a, b) => (b.bias_index ?? 50) - (a.bias_index ?? 50))
          .slice(3, 9)
      : sortedByTime.slice(1, 7);

  if (!lead) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-10 text-center text-neutral-500">
        কোনো সংবাদ এখনও প্রকাশিত হয়নি — API সংযোগ নেই?
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Large lead */}
      <div className="lg:col-span-2">
        <LeadCard article={lead} href={`/article/${lead.slug ?? lead.id ?? ''}`} />
      </div>
      {/* Right rail: 2 secondary stacked + trending */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {secondary.map((a) => (
            <ArticleCard key={a.id ?? a.slug ?? a.title} article={a} href={`/article/${a.slug ?? a.id ?? ''}`} />
          ))}
        </div>
        <div
          id="trending"
          className="scroll-mt-24 rounded-2xl border border-border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div
            role="tablist"
            aria-label="পাশের কলাম"
            className="mb-2 flex gap-1 rounded-full bg-muted p-1 dark:bg-neutral-800"
          >
            {(
              [
                ['latest', 'সর্বশেষ'],
                ['trending', 'ট্রেন্ডিং'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  tab === key
                    ? 'bg-white text-ink shadow-sm dark:bg-neutral-900 dark:text-paper'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {railItems.map((a, i) => (
              <TrendingItem
                key={a.id ?? a.slug ?? a.title}
                rank={tab === 'trending' ? i + 1 : undefined}
                article={a}
                href={`/article/${a.slug ?? a.id ?? ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
