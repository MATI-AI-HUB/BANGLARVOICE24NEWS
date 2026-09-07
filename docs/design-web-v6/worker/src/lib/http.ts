/**
 * Banglar Voice — shared HTTP helper for social adapters.
 * Small JSON fetch wrapper with timeout + retry-once for transient errors.
 */

const DEFAULT_TIMEOUT_MS = 25_000;

export async function jsonFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const { method = 'GET', headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await res.text().catch(() => '');
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text.slice(0, 500) };
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/** One retry for 429/5xx after a short backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; delayMs?: number; log?: (m: string) => void } = {},
): Promise<T> {
  const { retries = 1, delayMs = 2000, log } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        log?.(`retry ${attempt + 1}/${retries} after ${delayMs}ms: ${e instanceof Error ? e.message : String(e)}`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
