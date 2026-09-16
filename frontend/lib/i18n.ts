export type Locale = 'bn' | 'en';
export const LOCALE_COOKIE = 'bv_locale';
export const DEFAULT_LOCALE: Locale = 'bn';

export function isLocale(v: string | undefined | null): v is Locale {
  return v === 'bn' || v === 'en';
}

export function getLocaleFromCookie(cookieValue: string | undefined): Locale {
  return isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;
}

export const dict = {
  bn: {
    home: 'হোম',
    latest: 'সর্বশেষ',
    national: 'জাতীয়',
    politics: 'রাজনীতি',
    sports: 'খেলা',
    entertainment: 'বিনোদন',
    search_placeholder: 'খবর খুঁজুন...',
    language: 'ভাষা',
    read_more: 'আরও পড়ুন',
  },
  en: {
    home: 'Home',
    latest: 'Latest',
    national: 'National',
    politics: 'Politics',
    sports: 'Sports',
    entertainment: 'Entertainment',
    search_placeholder: 'Search news...',
    language: 'Language',
    read_more: 'Read more',
  },
} as const;

export function t(locale: Locale, key: keyof typeof dict.bn): string {
  return dict[locale][key] || dict.bn[key] || key;
}
