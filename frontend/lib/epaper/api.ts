import type { EPaperEdition } from './types';

const BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

async function safeFetch<T>(url: string, timeoutMs: number, empty: T): Promise<T> {
  try {
    const r = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } catch {
    return empty;
  }
}

export const epaperApi = {
  async latest(): Promise<EPaperEdition | null> {
    const data = await safeFetch<{ edition: EPaperEdition | null }>(
      `${BASE}/api/public/epaper/latest`,
      5000,
      { edition: null },
    );
    return data.edition;
  },
  async byDate(date: string): Promise<EPaperEdition | null> {
    const data = await safeFetch<{ edition: EPaperEdition | null }>(
      `${BASE}/api/public/epaper/${date}`,
      5000,
      { edition: null },
    );
    return data.edition;
  },
  async archive(limit = 30): Promise<{ date: string; label: string }[]> {
    const data = await safeFetch<{ editions: { date: string; label: string }[] }>(
      `${BASE}/api/public/epaper/archive?limit=${limit}`,
      5000,
      { editions: [] },
    );
    return data.editions;
  },
};

export function buildDemoEdition(): EPaperEdition {
  return {
    editionDate: '2026-09-09',
    editionLabel: '০৯ সেপ্টেম্বর ২০২৬',
    volume: '১',
    issue: 1,
    pages: [
      {
        number: 1,
        section: 'প্রথম পাতা',
        layout: 'front',
        lead: {
          headline: 'পদ্মা সেতু দিয়ে প্রথম দিনে ৫১ হাজার যান পারাপার',
          body:
            'পদ্মা সেতু উদ্বোধনের প্রথম দিনে রেকর্ড সংখ্যক যানবাহন পারাপার হয়েছে। সেতু কর্তৃপক্ষ জানিয়েছে, টোল আদায় হয়েছে ২ কোটি টাকার বেশি। দক্ষিণাঞ্চলের ২১টি জেলার সাথে সরাসরি সড়ক সংযোগ স্থাপিত হওয়ায় অর্থনৈতিক কর্মকাণ্ডে নতুন গতি এসেছে বলে মনে করছেন বিশ্লেষকরা।',
          attribution: 'বাংলার ভয়েস ডেস্ক',
          category: 'অর্থনীতি',
        },
        articles: [
          {
            headline: 'নির্বাচন কমিশনের নতুন নির্দেশনা',
            body:
              'আগামী জাতীয় নির্বাচনকে সামনে রেখে ভোটার তালিকা হালনাগাদ ও কেন্দ্র পুনর্বিন্যাসের নির্দেশনা দিয়েছে নির্বাচন কমিশন।',
            attribution: 'রাজনীতি ডেস্ক',
            category: 'রাজনীতি',
          },
          {
            headline: 'ঢাকায় মেট্রোরেলের নতুন রুট উদ্বোধন',
            body:
              'ঢাকার যানজট কমাতে মেট্রোরেলের নতুন অংশ চালু হয়েছে। প্রতিদিন অতিরিক্ত দুই লাখ যাত্রী সেবা পাবেন।',
            attribution: 'নগর ডেস্ক',
            category: 'নগর',
          },
        ],
        briefs: [
          'বিশ্ব বাজারে সোনার দাম নতুন রেকর্ড',
          'চট্টগ্রাম বন্দরে কনটেইনার জট কমেছে',
          'ঢাকা বিশ্ববিদ্যালয়ে নতুন ভিসি নিয়োগ',
          'পদ্মা সেতুতে পর্যটকদের ভিড়',
          'সিলেটে নতুন আন্তর্জাতিক বিমান রুট',
        ],
      },
      {
        number: 2,
        section: 'জাতীয়',
        layout: 'two-column',
        articles: [
          {
            headline: 'শিক্ষা খাতে বাজেট বাড়ানোর সুপারিশ',
            body:
              'আগামী অর্থবছরে শিক্ষা খাতে জিডিপির অন্তত ৪ শতাংশ বরাদ্দের সুপারিশ করেছে জাতীয় শিক্ষা কমিশন। কমিশনের প্রতিবেদনে মাদ্রাসা ও কারিগরি শিক্ষার সমন্বয়ের উপর জোর দেওয়া হয়েছে।',
            attribution: 'শিক্ষা ডেস্ক',
          },
          {
            headline: 'স্বাস্থ্যসেবায় নতুন ডিজিটাল প্ল্যাটফর্ম',
            body:
              'সারাদেশে স্বাস্থ্যসেবা ডিজিটালাইজ করতে নতুন প্ল্যাটফর্ম চালু হচ্ছে। এর মাধ্যমে রোগীরা অনলাইনে অ্যাপয়েন্টমেন্ট নিতে পারবেন।',
            attribution: 'স্বাস্থ্য ডেস্ক',
          },
          {
            headline: 'কৃষিতে নতুন ভর্তুকি ঘোষণা',
            body:
              'বোরো মৌসুমে কৃষকদের জন্য নতুন ভর্তুকি ঘোষণা করেছে কৃষি মন্ত্রণালয়। সার ও বীজে বিশেষ ছাড় দেওয়া হবে।',
            attribution: 'কৃষি ডেস্ক',
          },
          {
            headline: 'বিদ্যুৎ উৎপাদনে রেকর্ড',
            body:
              'গত মাসে দেশে রেকর্ড পরিমাণ বিদ্যুৎ উৎপাদিত হয়েছে। লোডশেডিং কমেছে ৪০ শতাংশ।',
            attribution: 'জ্বালানি ডেস্ক',
          },
        ],
      },
      {
        number: 3,
        section: 'খেলা',
        layout: 'grid',
        articles: [
          {
            headline: 'বাংলাদেশ ক্রিকেট দলের সিরিজ জয়',
            body:
              'ঘরের মাঠে টানা তৃতীয় সিরিজ জিতল বাংলাদেশ। শেষ ম্যাচে ৫ উইকেটের ব্যবধানে জয় পায় টাইগাররা।',
            attribution: 'ক্রীড়া ডেস্ক',
          },
          {
            headline: 'নতুন কোচ নিয়োগের প্রক্রিয়া শুরু',
            body:
              'জাতীয় ফুটবল দলের জন্য নতুন কোচ নিয়োগের প্রক্রিয়া শুরু হয়েছে। তিনজন বিদেশি কোচের সাথে আলোচনা চলছে।',
            attribution: 'ক্রীড়া ডেস্ক',
          },
          {
            headline: 'বিশ্বকাপ বাছাইয়ে বাংলাদেশ',
            body:
              'আগামী মাসে বিশ্বকাপ বাছাইপর্বের ম্যাচে অংশ নেবে বাংলাদেশ। প্রস্তুতি ক্যাম্প শুরু হয়েছে।',
            attribution: 'ক্রীড়া ডেস্ক',
          },
        ],
      },
    ],
  };
}
