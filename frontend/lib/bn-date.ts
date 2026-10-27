const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const BN_MONTHS = [
  'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
];
const BANGLA_MONTHS_BN = [
  'বৈশাখ','জ্যৈষ্ঠ','আষাঢ়','শ্রাবণ','ভাদ্র','আশ্বিন',
  'কার্তিক','অগ্রহায়ণ','পৌষ','মাঘ','ফাল্গুন','চৈত্র',
];
const BANGLA_MONTHS_EN = [
  'Boishakh','Joishtho','Ashar','Srabon','Bhadra','Ashwin',
  'Kartik','Agrahayan','Poush','Magh','Falgun','Chaitra',
];

export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Format Bangladesh's 2019-revised national Bangla calendar in Asia/Dhaka time. */
export function formatBanglaCalendarDate(date: Date, locale: 'bn' | 'en' = 'bn'): string {
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const gregorianYear = value('year');
  const gregorianMonth = value('month');
  const gregorianDay = value('day');
  const startYear = gregorianMonth > 4 || (gregorianMonth === 4 && gregorianDay >= 14)
    ? gregorianYear
    : gregorianYear - 1;
  let banglaDay = Math.floor((Date.UTC(gregorianYear, gregorianMonth - 1, gregorianDay) - Date.UTC(startYear, 3, 14)) / 86_400_000) + 1;
  const nextGregorianYear = startYear + 1;
  const isLeapYear = nextGregorianYear % 4 === 0 && (nextGregorianYear % 100 !== 0 || nextGregorianYear % 400 === 0);
  const monthLengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeapYear ? 30 : 29, 30];
  let monthIndex = 0;
  while (monthIndex < monthLengths.length - 1 && banglaDay > monthLengths[monthIndex]) {
    banglaDay -= monthLengths[monthIndex];
    monthIndex += 1;
  }
  const year = startYear - 593;
  const dayText = locale === 'bn' ? toBnDigits(banglaDay) : String(banglaDay);
  const yearText = locale === 'bn' ? toBnDigits(year) : String(year);
  const monthText = locale === 'bn' ? BANGLA_MONTHS_BN[monthIndex] : BANGLA_MONTHS_EN[monthIndex];
  return `${dayText} ${monthText} ${yearText}`;
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
