import { describe, expect, it } from 'vitest';
import { CANONICAL_SITE_URL, canonicalSiteUrl } from '../lib/site';

describe('canonicalSiteUrl', () => {
  it('falls back to www.banglarvoice24news.com', () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(canonicalSiteUrl()).toBe('https://www.banglarvoice24news.com');
    expect(CANONICAL_SITE_URL).toBe('https://www.banglarvoice24news.com');
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  });
});
