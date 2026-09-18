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
    politics: 'রাজনীতি',
    economy: 'অর্থনীতি',
    trending: 'ট্রেন্ডিং',
    app: 'অ্যাপ',
    national: 'জাতীয়',
    sports: 'খেলা',
    entertainment: 'বিনোদন',
    search_placeholder: 'খবর খুঁজুন...',
    language: 'ভাষা',
    read_more: 'আরও পড়ুন',
    hero_title: 'স্বাধীন সংবাদ প্রচারে নির্ভীক',
    hero_subtitle: 'বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা',
    about: 'আমাদের সম্পর্কে',
    contact: 'যোগাযোগ',
  },
  en: {
    home: 'Home',
    latest: 'Latest',
    politics: 'Politics',
    economy: 'Economy',
    trending: 'Trending',
    app: 'App',
    national: 'National',
    sports: 'Sports',
    entertainment: 'Entertainment',
    search_placeholder: 'Search news...',
    language: 'Language',
    read_more: 'Read more',
    hero_title: 'Fearless in independent journalism',
    hero_subtitle: 'Bangladesh and the world — neutral, responsible and reliable journalism',
    about: 'About Us',
    contact: 'Contact',
  },
} as const;

export function t(locale: Locale, key: keyof typeof dict.bn): string {
  return dict[locale][key] || dict.bn[key] || key;
}
