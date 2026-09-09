import { describe, it, expect } from 'vitest';
import { buildEpaperHtml } from './epaper-cron.js';

describe('epaper-cron', () => {
  it('builds a printable HTML e-paper with the edition date', () => {
    const html = buildEpaperHtml('2026-09-09', [
      { headline: 'শিরোনাম', body: 'বিস্তারিত', attribution: 'লেখক: রহিমা' },
    ]);
    expect(html).toContain('বাংলার ভয়েস');
    expect(html).toContain('2026-09-09');
    expect(html).toContain('শিরোনাম');
    expect(html).toContain('লেখক: রহিমা');
  });

  it('escapes HTML in article content', () => {
    const html = buildEpaperHtml('2026-09-09', [{ headline: '<b>x</b>', body: '<script>alert(1)</script>' }]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('handles an empty article list', () => {
    const html = buildEpaperHtml('2026-09-09', []);
    expect(html).toContain('বাংলার ভয়েস');
  });
});