import { describe, expect, it } from 'vitest';
import { formatBnDate, timeAgoBn, toBnDigits } from '../lib/bn-date';

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

  it('formats relative time with Bangla digits', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgoBn(recent)).toMatch(/মিনিট আগে/);
    expect(timeAgoBn(recent)).toMatch(/[০-৯]/);
  });
});
