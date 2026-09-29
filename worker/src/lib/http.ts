export const WORKER_UA =
  "BanglarVoiceNewsBot/1.0 (newsroom; +https://banglarvoice24news.com/contact; banglarvoice24news@gmail.com)";

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
