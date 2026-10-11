import type { EPaperEdition } from './types';

async function safeFetch<T>(url: string, empty: T): Promise<T> {
  try {
    const r = await fetch(url, { next: { revalidate: 3600 }, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } catch { return empty; }
}

export const epaperApi = {
  async latest(): Promise<EPaperEdition | null> {
    const data = await safeFetch<{ edition: EPaperEdition | null }>(`/api/public/epaper/latest`, { edition: null });
    return data.edition;
  },
  async byDate(date: string): Promise<EPaperEdition | null> {
    const data = await safeFetch<{ edition: EPaperEdition | null }>(`/api/public/epaper/${date}`, { edition: null });
    return data.edition;
  },
  async archive(limit = 30): Promise<{ date: string; label: string }[]> {
    const data = await safeFetch<{ editions: { date: string; label: string }[] }>(`/api/public/epaper/archive?limit=${limit}`, { editions: [] });
    return data.editions;
  },
};

export function buildDemoEdition(): EPaperEdition {
  const now = new Date();
  return {
    editionDate: now.toISOString().split('T')[0],
    editionLabel: now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }),
    volume: '১',
    issue: 1,
    pages: [
      {
        number: 1,
        section: 'প্রথম পাতা',
        layout: 'front',
        lead: {
          headline: 'লাইভ নিউজ সংযোগ হচ্ছে...',
          body: 'আপনার Supabase anon key দিয়ে রিয়েল নিউজ লোড হবে। যদি এখনও পুরোনো দেখায়, তাহলে Supabase টেবিল নাম চেক করুন।',
          attribution: 'বাংলার ভয়েস',
          category: 'ব্রেকিং',
        },
        articles: [],
        briefs: ['আজকের ই-পেপার লাইভ'],
      },
    ],
  };
}
