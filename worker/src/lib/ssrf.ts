const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function ipv4Octets(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const nums = m.slice(1).map((n) => Number(n));
  if (nums.some((n) => n > 255)) return null;
  return nums;
}

export function isBlockedHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/\.$/, "");
  if (!h) return true;
  if (BLOCKED_HOSTS.has(h)) return true;
  if (h === "::1" || h.endsWith(".localhost")) return true;
  const ip = ipv4Octets(h);
  if (!ip) return false;
  const [a, b] = ip;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function assertSafeHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("blocked_protocol");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("blocked_host");
  }
  return url;
}
