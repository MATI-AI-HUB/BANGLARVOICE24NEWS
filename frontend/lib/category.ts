const SLUG_BY_LABEL: Record<string, string> = {
  রাজনীতি: 'politics',
  অর্থনীতি: 'economy',
  আন্তর্জাতিক: 'international',
  খেলা: 'sports',
  খেলাধুলা: 'sports',
  বিনোদন: 'entertainment',
  শিক্ষা: 'education',
  স্বাস্থ্য: 'health',
  ধর্ম: 'religion',
  বিজ্ঞান: 'science',
  প্রযুক্তি: 'technology',
  জাতীয়: 'national',
  নগর: 'city',
  সর্বশেষ: 'latest',
};

const SLUGS = new Set([
  'politics',
  'economy',
  'international',
  'sports',
  'entertainment',
  'education',
  'health',
  'religion',
  'science',
  'technology',
  'national',
  'city',
  'latest',
]);

export function categorySlug(name: string): string {
  const raw = (name || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (SLUGS.has(lower)) return lower;
  return SLUG_BY_LABEL[raw] ?? `cat-${raw.replace(/\s+/g, '-')}`;
}

export function isKnownCategorySlug(slug: string): boolean {
  return SLUGS.has((slug || '').trim().toLowerCase());
}