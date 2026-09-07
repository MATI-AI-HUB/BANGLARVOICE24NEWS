'use client';

import { useMemo, useState } from 'react';
import { ArticleCard, type Article } from './hero-bento';
import { AdSlot } from './ad-slot';

const ALL = ''; // sentinel: show every category

/**
 * LatestGrid — BBC-style category filter chips + dense responsive card grid.
 * All filtering is client-side over the server-fetched (ISR-cached) list,
 * so no extra API calls and no layout shift.
 */
export function LatestGrid({ articles }: { articles: Article[] }) {
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
  // Insert a labelled "বিজ্ঞাপন" slot after every 6 items in the feed.
  const cells: (Article | 'ad')[] = [];
  shown.forEach((a, i) => {
    cells.push(a);
    if ((i + 1) % 6 === 0 && i < shown.length - 1) cells.push('ad');
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h2 id="latest-heading" className="mr-2 font-serifbn text-2xl font-extrabold leading-none tracking-tight text-ink dark:text-paper">
          সর্বশেষ সংবাদ
        </h2>
        <div className="flex max-w-full flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActive(ALL)}
            aria-pressed={active === ALL}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              active === ALL
                ? 'border-ink bg-ink text-paper dark:border-paper dark:bg-paper dark:text-ink'
                : 'border-border bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
            }`}
          >
            সবগুলো
          </button>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              aria-pressed={active === c}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                active === c
                  ? 'border-ink bg-ink text-paper dark:border-paper dark:bg-paper dark:text-ink'
                  : 'border-border bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cells.map((c, i) =>
          c === 'ad' ? (
            <div key={`ad-${i}`} className="col-span-full my-2">
              <AdSlot format="leaderboard" />
            </div>
          ) : (
            <ArticleCard key={c.id ?? c.slug ?? c.title} article={c} href={`/article/${c.slug ?? c.id ?? ''}`} />
          ),
        )}
      </div>
    </>
  );
}
