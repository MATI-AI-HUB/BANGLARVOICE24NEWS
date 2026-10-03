export const CANONICAL_SITE_URL = 'https://www.banglarvoice24news.com';

export function canonicalSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) {
    try {
      const url = new URL(fromEnv);
      if (url.protocol === 'https:' && url.hostname) {
        return url.origin;
      }
    } catch {
      /* use hardcoded production origin */
    }
  }
  return CANONICAL_SITE_URL;
}
