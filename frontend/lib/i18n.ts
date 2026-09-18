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
    international: 'আন্তর্জাতিক',
    education: 'শিক্ষা',
    health: 'স্বাস্থ্য',
    religion: 'ধর্ম',
    science: 'বিজ্ঞান',
    technology: 'প্রযুক্তি',
    about: 'আমাদের সম্পর্কে',
    contact: 'যোগাযোগ',
    hero_title: 'স্বাধীন সংবাদ প্রচারে নির্ভীক',
    hero_subtitle: 'বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা',
    latest_news_heading: 'সর্বশেষ সংবাদ',
    advertisement: 'বিজ্ঞাপন',
    no_articles: 'কোনো প্রকাশিত সংবাদ নেই।',
    backend_error: 'ব্যাকএন্ডে সংযোগ হয়নি',
    backend_error_hint: 'ডেমো মোডে নিচে নমুনা সংবাদ দেখানো হচ্ছে।',
    all_categories: 'সব',
    app_banner_title: 'বাংলার ভয়েস অ্যান্ড্রয়েড অ্যাপ',
    app_banner_body: 'ব্রেকিং নিউজ, লাইভ টিভি, শর্টস ও অডিও মোড — এখন আপনার ফোনে।',
    app_download_cta: 'অ্যাপ ডাউনলোড',
    search_placeholder: 'খবর খুঁজুন...',
    language: 'ভাষা',
    read_more: 'আরও পড়ুন',
    more_news: 'আরও সংবাদ পড়ুন',
    see_all: 'সব দেখুন',
    min_read: 'মিনিট পড়া',
    breadcrumb_home: 'হোম',
    breadcrumb_aria: 'ব্রেডক্রাম্ব',
    back_home: 'হোমে ফিরুন',
    author_prefix: 'লেখক',
    bias_score: 'বায়াস স্কোর',
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
    international: 'International',
    education: 'Education',
    health: 'Health',
    religion: 'Religion',
    science: 'Science',
    technology: 'Technology',
    about: 'About Us',
    contact: 'Contact',
    hero_title: 'Fearless in independent journalism',
    hero_subtitle: 'Bangladesh and the world — neutral, responsible and reliable journalism',
    latest_news_heading: 'Latest News',
    advertisement: 'Advertisement',
    no_articles: 'No published articles yet.',
    backend_error: 'Backend connection failed',
    backend_error_hint: 'Showing sample articles in demo mode below.',
    all_categories: 'All',
    app_banner_title: 'Banglar Voice Android App',
    app_banner_body: 'Breaking news, live TV, shorts and audio mode — now on your phone.',
    app_download_cta: 'Download App',
    search_placeholder: 'Search news...',
    language: 'Language',
    read_more: 'Read more',
    more_news: 'More News',
    see_all: 'See All',
    min_read: 'min read',
    breadcrumb_home: 'Home',
    breadcrumb_aria: 'Breadcrumb',
    back_home: 'Back to Home',
    author_prefix: 'Author',
    bias_score: 'Bias Score',
  },
} as const;

export function t(locale: Locale, key: keyof typeof dict.bn): string {
  return dict[locale][key] || dict.bn[key] || key;
}

const CATEGORY_MAP: Record<string, keyof typeof dict.bn> = {
  'রাজনীতি': 'politics',
  'অর্থনীতি': 'economy',
  'আন্তর্জাতিক': 'international',
  'খেলা': 'sports',
  'বিনোদন': 'entertainment',
  'শিক্ষা': 'education',
  'স্বাস্থ্য': 'health',
  'ধর্ম': 'religion',
  'বিজ্ঞান': 'science',
  'প্রযুক্তি': 'technology',
  'জাতীয়': 'national',
  'সর্বশেষ': 'latest',
};

export function translateCategory(locale: Locale, bnCategory: string): string {
  const c = (bnCategory || '').trim();
  if (!c) return c;
  const key = CATEGORY_MAP[c];
  return key ? t(locale, key) : c;
}
