// =============================================================================
// collector.ts — the Collector agent. Fetches RSS/Atom feeds (custom
// NEWS_RSS_URLS or the built-in 7-category Google News index), parses them,
// and returns raw news items. Runs every INTERVAL_MINUTES.
// =============================================================================

import { XMLParser } from "fast-xml-parser";
import { BUILTIN_SOURCES, type WorkerConfig } from "../config.js";
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

function extractImage(entry: any): string {
  const candidates = [
    attrUrl(entry?.enclosure),
    attrUrl(entry?.["media:content"]),
    attrUrl(entry?.["media:thumbnail"]),
    imageFromHtml(String(entry?.description ?? entry?.summary ?? "")),
  ];
  return candidates.find((u) => u.length > 0) ?? "";
}

function extractItems(xml: string, sourceUrl: string, category: string): RawItem[] {
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel ?? doc?.feed ?? {};
  const rawEntries = channel?.item ?? channel?.entry ?? [];
  const entries: unknown[] = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
  if (entries.length === 0) return [];

  return entries
    .map((e: any) => {
      const title = String(e?.title ?? "").trim();
      const link = String(e?.link ?? e?.guid ?? "").trim();
      if (!title || !link) return null;
      return {
        id: stableId(title, link),
        sourceUrl,
        sourceCategory: category,
        title,
        link,
        description: String(e?.description ?? e?.summary ?? "").trim(),
        publishedAt: String(e?.pubDate ?? e?.updated ?? new Date().toISOString()),
        imageUrl: extractImage(e),
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
      const res = await fetch(src.url, {
        headers: { "User-Agent": "BanglarVoice-AI/1.0" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      results.push(...extractItems(xml, src.url, src.category));
    } catch {
      // skip a failing feed; never crash the whole loop
    }
  }
  return results;
}