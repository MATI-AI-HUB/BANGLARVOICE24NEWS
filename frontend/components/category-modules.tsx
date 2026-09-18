'use client';

import { useMemo } from 'react';
import { ArticleCard, type Article } from './hero-bento';
import { AdSlot } from './ad-slot';
import { t, translateCategory, type Locale } from '@/lib/i18n';

/**
 * CategoryModules — DW/AJ-inspired data-driven "বিভাগ অনুযায়ী" rows.
 *
 * Each distinct category present in the server-fetched (ISR-cached) feed
 * becomes its own <section aria-labelledby="..."> with a kicker heading and
 * a responsive grid of ArticleCards — mirroring how DW builds separate
 * region/topic modules on its homepage and AJ renders category collections.
 *
 * Categories are shown in an editorial priority order (national first), and
 * modules with fewer than 2 items are skipped so no empty row is rendered.
 */

const PRIORITY: string[] = [
  'রাজনীতি',
  'অর্থনীতি',
  'আন্তর্জাতিক',
  'খেলা',
  'বিনোদন',
  'শিক্ষা',
  'স্বাস্থ্য',
  'ধর্ম',
  'সর্বশেষ',
];

/** Bangla category name -> ascii anchor slug (used for nav deep-links). */
export function categorySlug(name: string): string {
  const map: Record<string, string> = {
    রাজনীতি: 'politics',
    অর্থনীতি: 'economy',
    আন্তর্জাতিক: 'international',
    খেলা: 'sports',
    বিনোদন: 'entertainment',
    শিক্ষা: 'education',
    স্বাস্থ্য: 'health',
    ধর্ম: 'religion',
    বিজ্ঞান: 'science',
    প্রযুক্তি: 'technology',
    সর্বশেষ: 'latest',
  };
  return map[name.trim()] ?? `cat-${name.trim().replace(/\s+/g, '-')}`;
}

export function CategoryModules({ articles, locale = 'bn' as Locale }: { articles: Article[]; locale?: Locale }) {
  const modules = useMemo(() => {
    // Group by category, preserving editorial priority order.
    const buckets = new Map<string, Article[]>();
    for (const a of articles) {
      const c = (a.category || '').trim();
      if (!c) continue;
      const list = buckets.get(c) ?? [];
      list.push(a);
      buckets.set(c, list);
    }
    const ranked = [...buckets.entries()].sort((x, y) => {
      const xi = PRIORITY.indexOf(x[0]);
      const yi = PRIORITY.indexOf(y[0]);
      return (xi === -1 ? PRIORITY.length : xi) - (yi === -1 ? PRIORITY.length : yi);
    });
    // Skip the first bucket if it is the hero lead's own category? No — the
    // lead is a single story; a full module still adds value. Just cap rows.
    return ranked.filter(([, list]) => list.length >= 2).slice(0, 4);
  }, [articles]);

  if (modules.length === 0) return null;

  return (
    <div className="mt-16 space-y-14">
      {modules.map(([category, list], mi) => {
        const slug = categorySlug(category);
        const headingId = `h-${slug}`;
        // In-category ad divider after every 6 items (only when row has >6).
        const items = list.slice(0, 8);
        const cells: (Article | 'ad')[] = [];
        items.forEach((a, i) => {
          cells.push(a);
          if ((i + 1) % 6 === 0 && i < items.length - 1) cells.push('ad');
        });
        return (
          <section key={slug} id={`cat-${slug}`} aria-labelledby={headingId} className="scroll-mt-24">
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-3 dark:border-neutral-800">
              <span className="h-4 w-1 rounded-full bg-primary" aria-hidden />
              <h2
                id={headingId}
                className="font-serifbn text-2xl font-extrabold leading-none tracking-tight text-ink dark:text-paper"
              >
                {translateCategory(locale, category)}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cells.map((a, i) =>
                a === 'ad' ? (
                  <div key={`ad-${slug}-${i}`} className="col-span-full my-1">
                    <AdSlot format="leaderboard" />
                  </div>
                ) : (
                  <ArticleCard
                    key={a.id ?? a.slug ?? a.title}
                    article={a}
                    href={`/article/${a.slug ?? a.id ?? ''}`}
                  />
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
