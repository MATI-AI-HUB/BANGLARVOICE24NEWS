import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/set-locale/route';

describe('POST /api/set-locale', () => {
  it('stores English and returns to the same-origin page', async () => {
    const body = new URLSearchParams({ locale: 'en' });
    const response = await POST(new Request('https://example.com/api/set-locale', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        referer: 'https://example.com/article/example-story',
      },
      body,
    }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://example.com/article/example-story');
    expect(response.headers.get('set-cookie')).toContain('bv_locale=en');
  });

  it('rejects a cross-origin return target and sends the user to the site root', async () => {
    const body = new URLSearchParams({ locale: 'bn' });
    const response = await POST(new Request('https://example.com/api/set-locale', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        referer: 'https://attacker.example/redirect',
      },
      body,
    }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://example.com/');
    expect(response.headers.get('set-cookie')).toContain('bv_locale=bn');
  });
});
