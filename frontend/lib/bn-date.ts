const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const BN_MONTHS = [
  'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
];

export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function formatBnDate(
  date: Date | string,
  locale: 'bn' | 'en' = 'bn'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  if (locale === 'bn') {
    return `${toBnDigits(day)} ${BN_MONTHS[month]}, ${toBnDigits(year)}`;
  }
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function timeAgoBn(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${toBnDigits(diff)} সেকেন্ড আগে`;
  if (diff < 3600) return `${toBnDigits(Math.floor(diff / 60))} মিনিট আগে`;
  if (diff < 86400) return `${toBnDigits(Math.floor(diff / 3600))} ঘণ্টা আগে`;
  return `${toBnDigits(Math.floor(diff / 86400))} দিন আগে`;
}
