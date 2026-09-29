import { XMLParser } from "fast-xml-parser";
import { BUILTIN_SOURCES, type WorkerConfig } from "../config.js";
import { fetchWithRetry } from "../lib/http.js";
import { assertSafeHttpUrl } from "../lib/ssrf.js";
import type { RawItem } from "./types.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function stableId(title: string, link: string): string {
  let h = 0;
  const s = `${title}|${link}`;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function attrUrl(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return /^https?:\/\//i.test(node) ? node : "";
  if (Array.isArray(node)) return attrUrl(node[0]);
  if (typeof node === "object") {
    const rec = node as Record<string, unknown>;
    for (const key of ["@_url", "url", "@_href", "href", "#text"]) {
      const v = rec[key];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
    }
  }
  return "";
}

function imageFromHtml(html: string): string {
  const m = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  return m?.[1] ?? "";
}

function extractImage(entry: Record<string, unknown>): string {
  const candidates = [
    attrUrl(entry?.enclosure),
    attrUrl(entry?.["media:content"]),
    attrUrl(entry?.["media:thumbnail"]),
    imageFromHtml(String(entry?.description ?? entry?.summary ?? "")),
  ];
  return candidates.find((u) => u.length > 0) ?? "";
}

export function extractItems(xml: string, sourceUrl: string, category: string): RawItem[] {
  const doc = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
    feed?: { entry?: unknown };
  };
  const channel = doc?.rss?.channel ?? doc?.feed ?? {};
  const rawEntries = ("item" in channel ? channel.item : undefined)
    ?? ("entry" in channel ? (channel as { entry?: unknown }).entry : undefined)
    ?? [];
  const entries: unknown[] = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
  if (entries.length === 0) return [];

  return entries
    .map((e) => {
      if (!e || typeof e !== "object") return null;
      const rec = e as Record<string, unknown>;
      const title = String(rec.title ?? "").trim();
      const link = String(rec.link ?? rec.guid ?? "").trim();
      if (!title || !link) return null;
      return {
        id: stableId(title, link),
        sourceUrl,
        sourceCategory: category,
        title,
        link,
        description: String(rec.description ?? rec.summary ?? "").trim(),
        publishedAt: String(rec.pubDate ?? rec.updated ?? new Date().toISOString()),
        imageUrl: extractImage(rec),
      } as RawItem;
    })
    .filter((x): x is RawItem => x !== null);
}

export async function collect(cfg: WorkerConfig): Promise<RawItem[]> {
  const sources =
    cfg.newsRssUrls.length > 0
      ? cfg.newsRssUrls.map((url) => ({ category: "custom", url }))
      : BUILTIN_SOURCES;

  const results: RawItem[] = [];
  for (const src of sources) {
    try {
      assertSafeHttpUrl(src.url);
      const res = await fetchWithRetry(src.url, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
      if (!res?.ok) continue;
      const xml = await res.text();
      results.push(...extractItems(xml, src.url, src.category));
    } catch {
      // skip a failing feed; never crash the whole loop
    }
  }
  return results;
}
