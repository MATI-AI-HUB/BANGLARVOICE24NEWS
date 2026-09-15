import type { LiveEntry } from '../components/live-blog';
import type { VideoItem } from '../components/video-hub';

/**
 * Banglar Voice — Local Fallback Mock Data Engine.
 *
 * When NEXT_PUBLIC_API_URL is undefined OR the PocketBase/Supabase backend is
 * unreachable, the homepage/server components render this rich Bengali news
 * corpus instead of crashing or showing a blank page. The data is shaped to
 * match the server API responses exactly, so callers cannot tell the
 * difference (same Article / LiveEntry / VideoItem contracts).
 *
 * This is deliberately editorial, neutral sample copy — clearly non-breaking
 * demo items that a designer/editor can replace live from the CMS later.
 */

export type FeedArticle = {
  id: string;
  slug: string;
  title_bn: string;
  dek_bn?: string;
  category?: string;
  featured_image?: string;
  reading_time_min?: number;
  bias_index?: number;
  published_at?: string;
  // Bengali display strings — populated by lib/api.ts (not present in mock data)
  published_at_bn?: string;
  time_ago_bn?: string;
  reading_time_bn?: string;
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();

export const mockFeedItems: FeedArticle[] = [
  {
    id: 'demo-1',
    slug: 'padma-setu-record-traffic',
    title_bn: 'পদ্মা সেতু দিয়ে রেকর্ড যানবাহন পারাপার',
    dek_bn: 'প্রথম দিনে ৫১ হাজার যান, টোল আদায় ২ কোটি টাকা — যা যা জানা গেল।',
    category: 'অর্থনীতি',
    reading_time_min: 4,
    bias_index: 15,
    published_at: hoursAgo(2),
  },
  {
    id: 'demo-2',
    slug: 'election-commission-new-guideline',
    title_bn: 'নির্বাচন কমিশনের নতুন নির্দেশনা',
    dek_bn: 'রাজনৈতিক দলগুলোর প্রতিক্রিয়া ও বিশ্লেষণ।',
    category: 'রাজনীতি',
    reading_time_min: 3,
    bias_index: 20,
    published_at: hoursAgo(3),
  },
  {
    id: 'demo-3',
    slug: 'fuel-price-new-rate',
    title_bn: 'জ্বালানি বাজারে নতুন শুল্ক — বিশ্ববাজারে প্রভাব',
    dek_bn: 'আন্তর্জাতিক বাজার বিশ্লেষণ।',
    category: 'আন্তর্জাতিক',
    reading_time_min: 5,
    bias_index: 25,
    published_at: hoursAgo(4),
  },
  {
    id: 'demo-4',
    slug: 'gaza-ceasefire-proposal',
    title_bn: 'গাজায় যুদ্ধবিরতির নতুন প্রস্তাবে ভিন্নমত',
    dek_bn: 'কায়রো আলোচনায় যুক্তরাষ্ট্রের মধ্যস্থতা নিয়ে সংশয়।',
    category: 'আন্তর্জাতিক',
    reading_time_min: 6,
    bias_index: 40,
    published_at: hoursAgo(5),
  },
  {
    id: 'demo-5',
    slug: 'remittance-record-growth',
    title_bn: 'রপ্তানি আয়ে রেকর্ড — প্রবৃদ্ধির ধারা অব্যাহত',
    dek_bn: 'চলতি অর্থবছরের প্রথম আট মাসে প্রবৃদ্ধি ১২ শতাংশ।',
    category: 'অর্থনীতি',
    reading_time_min: 4,
    bias_index: 12,
    published_at: hoursAgo(6),
  },
  {
    id: 'demo-6',
    slug: 'cricket-final-bangladesh',
    title_bn: 'ঐতিহাসিক জয়ে উল্লাস — ফাইনালে বাংলাদেশ',
    dek_bn: 'টাইব্রেকারে নাটকীয় জয়, ফাইনালে প্রতিপক্ষ ভারত।',
    category: 'খেলা',
    reading_time_min: 3,
    bias_index: 8,
    published_at: hoursAgo(7),
  },
  {
    id: 'demo-7',
    slug: 'bd-film-international-festival',
    title_bn: 'আন্তর্জাতিক চলচ্চিত্র উৎসবে বাংলাদেশের স্বীকৃতি',
    dek_bn: 'তরুণ নির্মাতার ছবি পেল বিশেষ জুরি পুরস্কার।',
    category: 'বিনোদন',
    reading_time_min: 4,
    bias_index: 18,
    published_at: hoursAgo(8),
  },
  {
    id: 'demo-8',
    slug: 'new-curriculum-primary',
    title_bn: 'নতুন পাঠ্যক্রম চূড়ান্ত — প্রাথমিকে যা বদলাচ্ছে',
    dek_bn: 'মূল্যায়ন পদ্ধতি ও বিষয়ভিত্তিক পরিবর্তনের খসড়া চূড়ান্ত।',
    category: 'শিক্ষা',
    reading_time_min: 5,
    bias_index: 22,
    published_at: hoursAgo(9),
  },
  {
    id: 'demo-9',
    slug: 'dengue-vaccine-campaign',
    title_bn: 'ডেঙ্গুর নতুন মৌসুমের আগে টিকা নিবন্ধন শুরু',
    dek_bn: 'বিশেষ টিকাদান কর্মসূচির আওতায় প্রথম ধাপে ৫ লাখ ডোজ।',
    category: 'স্বাস্থ্য',
    reading_time_min: 4,
    bias_index: 10,
    published_at: hoursAgo(11),
  },
  {
    id: 'demo-10',
    slug: 'parliament-new-bill',
    title_bn: 'সংসদে নতুন বিল উত্থাপন — বিতর্কিত ধারা নিয়ে প্রশ্ন',
    dek_bn: 'বিরোধী দলের আপত্তি, সংশোধনীর দাবি।',
    category: 'রাজনীতি',
    reading_time_min: 6,
    bias_index: 45,
    published_at: hoursAgo(13),
  },
  {
    id: 'demo-11',
    slug: 'jummah-khutbah-language',
    title_bn: 'জুমার খুতবায় একীভূত ভাষার নির্দেশনা নিয়ে আলোচনা',
    dek_bn: 'ধর্ম মন্ত্রণালয়ের উদ্যোগে ইমামদের সম্মেলন।',
    category: 'ধর্ম',
    reading_time_min: 3,
    bias_index: 28,
    published_at: hoursAgo(15),
  },
  {
    id: 'demo-12',
    slug: 'climate-summit-commitment',
    title_bn: 'জলবায়ু সম্মেলনে বাংলাদেশের নতুন অঙ্গীকার',
    dek_bn: 'নবায়নযোগ্য জ্বালানিতে ২০৩০-এর মধ্যে ৪০ শতাংশ লক্ষ্য।',
    category: 'আন্তর্জাতিক',
    reading_time_min: 5,
    bias_index: 16,
    published_at: hoursAgo(18),
  },
];

export const mockLiveEntries: LiveEntry[] = [
  {
    id: 'lv-1',
    body_bn: 'ঢাকার বিভিন্ন এলাকায় গুঁড়ি গুঁড়ি বৃষ্টি শুরু হয়েছে; আবহাওয়া অফিস বলছে দুপুরের পর তা বাড়তে পারে।',
    author: 'বাংলার ভয়েস ডেস্ক',
    created_at: new Date(Date.now() - 12 * 60e3).toISOString(),
  },
  {
    id: 'lv-2',
    body_bn: 'মেট্রোরেল আগারগাঁও স্টেশন থেকে উত্তরা উত্তর পর্যন্ত চলাচল স্বাভাবিক; যাত্রীচাপ কিছুটা বেশি।',
    author: 'প্রতিবেদক',
    created_at: new Date(Date.now() - 34 * 60e3).toISOString(),
  },
  {
    id: 'lv-3',
    body_bn: 'জাতীয় সংসদে আজ বিকেল ৩টায় বাজেট অধিবেশন শুরু হবে; সরাসরি সম্প্রচার থাকবে আমাদের লাইভ হাবে।',
    author: 'সংসদ প্রতিবেদক',
    created_at: new Date(Date.now() - 55 * 60e3).toISOString(),
  },
  {
    id: 'lv-4',
    body_bn: 'চট্টগ্রাম বন্দরে কনটেইনার জট কমেছে; শুল্কায়ন প্রক্রিয়া ত্বরান্বিত হয়েছে।',
    author: 'বাংলার ভয়েস ডেস্ক',
    created_at: new Date(Date.now() - 90 * 60e3).toISOString(),
  },
  {
    id: 'lv-5',
    body_bn: 'শেরে বাংলা জাতীয় স্টেডিয়ামে আজ সন্ধ্যা ৬টায় ফাইনাল ম্যাচ; টিকিট প্রায় শেষ।',
    author: 'খেলা প্রতিবেদক',
    created_at: new Date(Date.now() - 120 * 60e3).toISOString(),
  },
];

export const mockVideoItems: VideoItem[] = [
  { id: 'vd-1', title_bn: 'সরাসরি: জাতীয় সংসদের বাজেট অধিবেশন', category: 'ভিডিও', is_live: true },
  { id: 'vd-2', title_bn: 'পদ্মা সেতুতে এক নজরে দিনের ছবি', category: 'ভিডিও' },
  { id: 'vd-3', title_bn: 'আন্তর্জাতিক ডেস্ক: আজকের বিশ্ব সংবাদ', category: 'ভিডিও' },
  { id: 'vd-4', title_bn: 'পডকাস্ট: অর্থনীতি ও বাজেট নিয়ে বিশ্লেষণ', category: 'পডকাস্ট' },
  { id: 'vd-5', title_bn: 'ক্রিড়া সংবাদ: ফাইনালের প্রস্তুতি', category: 'ভিডিও' },
];
