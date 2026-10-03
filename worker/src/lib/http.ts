export const WORKER_UA =
  "Mozilla/5.0 (compatible; BanglarVoiceNewsBot/1.0; +https://banglarvoice24news.com/contact; banglarvoice24news@gmail.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export const FEED_ACCEPT =
  "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<Response | null> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const retries = opts.retries ?? 2;
  const headers = new Headers(init.headers);
  if (!headers.has("User-Agent")) headers.set("User-Agent", WORKER_UA);
  if (!headers.has("Accept")) headers.set("Accept", FEED_ACCEPT);
  if (!headers.has("Accept-Language")) headers.set("Accept-Language", "bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, headers, signal: ac.signal });
      clearTimeout(timer);
      if (res.status === 408 && attempt < retries) {
        await sleep(200 * 2 ** attempt);
        continue;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(200 * 2 ** attempt);
        continue;
      }
      return res;
    } catch {
      clearTimeout(timer);
      if (attempt < retries) {
        await sleep(200 * 2 ** attempt);
        continue;
      }
      return null;
    }
  }
  return null;
}
