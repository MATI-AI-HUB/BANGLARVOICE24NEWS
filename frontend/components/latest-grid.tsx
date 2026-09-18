'use client';

import { useMemo, useState } from 'react';
import { ArticleCard, type Article } from './hero-bento';
import { AdSlot } from './ad-slot';
import { t, translateCategory, type Locale } from '@/lib/i18n';

const ALL = '';

export function LatestGrid({ articles, locale = 'bn' as Locale }: { articles: Article[]; locale?: Locale }) {
  const chips = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const a of articles) {
      const c = (a.category || '').trim();
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out.slice(0, 9);
  }, [articles]);

  const [active, setActive] = useState<string>(ALL);
  const list = useMemo(
    () => (active === ALL ? articles : articles.filter((a) => (a.category || '').trim() === active)),
    [articles, active],
  );
  const shown = list.slice(0, 12);
  const cells: (Article | 'ad')[] = [];
  shown.forEach((a, i) => {
    cells.push(a);
    if ((i + 1) % 6 === 0 && i < shown.length - 1) cells.push('ad');
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h2 id="latest-heading" className="mr-2 font-serifbn text-2xl font-extrabold leading-none tracking-tight text-ink dark:text-paper">
          {t(locale, 'latest_news_heading')}
        </h2>
        <div className="flex max-w-full flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActive(ALL)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              active === ALL
                ? 'border-crimson bg-crimson text-white'
                : 'border-border bg-paper text-ink/70 hover:border-crimson hover:text-crimson dark:border-white/15 dark:bg-neutral-900 dark:text-paper/70'
            }`}
          >
            {t(locale, 'all_categories')}
          </button>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                active === c
                  ? 'border-crimson bg-crimson text-white'
                  : 'border-border bg-paper text-ink/70 hover:border-crimson hover:text-crimson dark:border-white/15 dark:bg-neutral-900 dark:text-paper/70'
              }`}
            >
              {translateCategory(locale, c)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cells.map((cell, i) =>
          cell === 'ad' ? (
            <AdSlot key={`ad-${i}`} format="leaderboard" />
          ) : (
            <ArticleCard
              key={cell.id ?? cell.slug ?? cell.title}
              article={cell}
              href={`/article/${cell.slug ?? cell.id ?? ''}`}
            />
          ),
        )}
      </div>
    </>
  );
}
