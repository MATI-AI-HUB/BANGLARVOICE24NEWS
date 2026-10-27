import { describe, expect, it } from 'vitest';
import { formatBanglaCalendarDate, formatBnDate, timeAgoBn, toBnDigits } from '../lib/bn-date';

describe('Bangla time formatting', () => {
  it('uses Bangla digits', () => {
    expect(toBnDigits(12)).toBe('১২');
    expect(toBnDigits('2026')).toBe('২০২৬');
  });

  it('formats a calendar date in Bangla', () => {
    const out = formatBnDate(new Date('2026-09-29T12:00:00Z'), 'bn');
    expect(out).toMatch(/সেপ্টেম্বর/);
    expect(out).toMatch(/[০-৯]/);
  });

  it('formats the revised Bangla New Year boundary in Dhaka time', () => {
    expect(formatBanglaCalendarDate(new Date('2026-04-13T17:59:00Z'))).toBe('৩০ চৈত্র ১৪৩২');
    expect(formatBanglaCalendarDate(new Date('2026-04-13T18:00:00Z'))).toBe('১ বৈশাখ ১৪৩৩');
  });

  it('uses the revised 2019 calendar month lengths and Gregorian leap year rule', () => {
    expect(formatBanglaCalendarDate(new Date('2026-10-27T18:00:00Z'))).toBe('১২ কার্তিক ১৪৩৩');
    expect(formatBanglaCalendarDate(new Date('2024-02-14T18:00:00Z'))).toBe('২ ফাল্গুন ১৪৩০');
    expect(formatBanglaCalendarDate(new Date('2024-03-14T18:00:00Z'))).toBe('১ চৈত্র ১৪৩০');
  });

  it('formats relative time with Bangla digits', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgoBn(recent)).toMatch(/মিনিট আগে/);
    expect(timeAgoBn(recent)).toMatch(/[০-৯]/);
  });
});
