import type { Locale } from './i18n';

export type TickerQueryResult<T> = {
  data: T[] | null;
  error?: unknown;
};

export type BreakingTickerQueries = {
  activeTicker: () => Promise<TickerQueryResult<{ text_bn?: string | null }>>;
  breakingArticles: () => Promise<TickerQueryResult<{ title_bn?: string | null; title_en?: string | null }>>;
  recentArticles: () => Promise<TickerQueryResult<{ title_bn?: string | null; title_en?: string | null }>>;
};

export const FALLBACK_TICKER_TEXT: Record<Locale, string> = {
  bn: 'এআই অটোমেশন এর মাধ্যমে পরিচালিত বাংলার ভয়েস এর পরীক্ষামূলক সম্প্রচার চলছে।',
  en: 'Banglar Voice is running an experimental broadcast powered by AI automation.',
};

const SEEDED_DEMO_TICKER = FALLBACK_TICKER_TEXT.bn;

function localizedArticleTitles(
  rows: Array<{ title_bn?: string | null; title_en?: string | null }>,
  locale: Locale,
): string[] {
  return rows
    .map((row) => locale === 'en' ? (row.title_en || row.title_bn || '') : (row.title_bn || row.title_en || ''))
    .map((title) => title.trim())
    .filter(Boolean);
}

/** Resilient hierarchy: active editorial ticker → breaking articles → latest published → local copy. */
export async function resolveBreakingTicker(
  queries: BreakingTickerQueries,
  locale: Locale,
): Promise<string[]> {
  if (locale === 'bn') {
    try {
      const result = await queries.activeTicker();
      if (!result.error) {
        const active = (result.data || [])
          .map((row) => (row.text_bn || '').trim())
          .filter((text) => text && text !== SEEDED_DEMO_TICKER);
        if (active.length) return active;
      }
    } catch {
      // The ticker table may not be available in a local or partially configured environment.
    }
  }

  try {
    const result = await queries.breakingArticles();
    const headlines = result.error ? [] : localizedArticleTitles(result.data || [], locale);
    if (headlines.length) return headlines.slice(0, 5);
  } catch {
    // Continue to the published-article fallback.
  }

  try {
    const result = await queries.recentArticles();
    const headlines = result.error ? [] : localizedArticleTitles(result.data || [], locale);
    if (headlines.length) return headlines.slice(0, 5);
  } catch {
    // Use local copy below.
  }

  return [FALLBACK_TICKER_TEXT[locale]];
}
