// =============================================================================
// multisource.ts — find corroborating sources via Google News RSS.
// Returns up to 3 distinct domains reporting the same story.
// =============================================================================

export interface CorroboratingSource {
  name: string;
  url: string;
  snippet: string;
}

export async function findCorroboratingSources(
  titleBn: string,
  primaryDomain: string,
  max = 3,
): Promise<CorroboratingSource[]> {
  const q = titleBn.split(/\s+/).slice(0, 8).join(" ");
  if (q.length < 8) return [];

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=bn&gl=BD&ceid=BD:bn`;

  try {
    const res = await fetch(rssUrl, { headers: { "User-Agent": "BanglarVoice/1.0" } });
    if (!res.ok) return [];
    const xml = await res.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const sources: CorroboratingSource[] = [];
    const seenDomains = new Set<string>([primaryDomain]);

    for (const item of items) {
      const title = item[1].match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
      const link = item[1].match(/<link>([^<]*)<\/link>/)?.[1] ?? "";
      const srcName = item[1].match(/<source[^>]*>([^<]*)<\/source>/)?.[1] ?? "";

      let domain = "";
      try {
        domain = new URL(link).hostname;
      } catch {
        continue;
      }
      if (!domain || seenDomains.has(domain)) continue;
      seenDomains.add(domain);

      sources.push({ name: srcName || domain, url: link, snippet: title });
      if (sources.length >= max) break;
    }
    return sources;
  } catch {
    return [];
  }
}
