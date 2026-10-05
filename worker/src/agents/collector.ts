import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";
import { BUILTIN_SOURCES, type WorkerConfig } from "../config.js";
import { FEED_ACCEPT, WORKER_UA, fetchWithRetry, sleep } from "../lib/http.js";
import { assertSafeHttpUrl } from "../lib/ssrf.js";
import { recentSourceOutcomes } from "../lib/pipeline.js";
import {
  FEED_403_DISABLE_THRESHOLD,
  PIPELINE_INTERVAL_MINUTES,
  isSourceDue,
  lastFetchAt,
  shouldDisableAfter403,
  type SourceFetchOutcome,
} from "../lib/publish-gate.js";
import type { RawItem } from "./types.js";

export { FEED_403_DISABLE_THRESHOLD };

export type CollectedSource = {
  id?: string;
  name?: string;
  url: string;
  category: string;
  enabled: boolean;
  killSwitch: boolean;
  intervalMinutes: number;
  licenceNote?: string;
};

export type CollectResult = {
  items: RawItem[];
  sources: Record<string, SourceFetchOutcome>;
  disabled: string[];
};

export function feedBrowserHeaders(): Record<string, string> {
  return {
    "User-Agent": WORKER_UA,
    Accept: FEED_ACCEPT,
    "Accept-Language": "bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
  };
}

export async function fetchFeedResponse(url: string): Promise<Response | null> {
  const init = { headers: feedBrowserHeaders() };
  let res = await fetchWithRetry(url, init, { retries: 2, timeoutMs: 8000 });
  if (res?.status === 403 || res?.status === 429) {
    await sleep(400);
    res = await fetchWithRetry(url, init, { retries: 2, timeoutMs: 8000 });
  }
  if (res?.status === 403 || res?.status === 429) {
    await sleep(1200);
    res = await fetchWithRetry(url, init, { retries: 1, timeoutMs: 8000 });
  }
  return res;
}

async function disableNewsSource(cfg: WorkerConfig, feedUrl: string, reason: string): Promise<void> {
  if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) {
    console.warn("[collector] would disable source (no supabase)", { feedUrl, reason });
    return;
  }
  const client = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client
    .from("news_sources")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("feed_url", feedUrl)
    .eq("enabled", true);
  if (error) {
    console.error("[collector] disable news_sources failed", { feedUrl, message: error.message });
    return;
  }
  console.warn("[collector] disabled news_sources after repeated 403", {
    feedUrl,
    reason,
    threshold: FEED_403_DISABLE_THRESHOLD,
  });
}

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

export function extractItems(xml: string, sourceUrl: string, category: string, licenceNote = ""): RawItem[] {
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
        licenceNote,
      } as RawItem;
    })
    .filter((x): x is RawItem => x !== null);
}

async function loadDbSources(cfg: WorkerConfig): Promise<CollectedSource[] | null> {
  if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) return null;
  const client = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("news_sources")
    .select("id, name, feed_url, enabled, kill_switch, interval_minutes, licence_note")
    .eq("enabled", true)
    .eq("kill_switch", false);
  if (error || !data) return null;
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    url: row.feed_url as string,
    category: "national",
    enabled: true,
    killSwitch: false,
    intervalMinutes: Number(row.interval_minutes) || PIPELINE_INTERVAL_MINUTES,
    licenceNote: String(row.licence_note ?? ""),
  }));
}

function envSources(cfg: WorkerConfig): CollectedSource[] {
  const list =
    cfg.newsRssUrls.length > 0
      ? cfg.newsRssUrls.map((url) => ({ category: "custom", url }))
      : BUILTIN_SOURCES;
  return list.map((src) => ({
    url: src.url,
    category: src.category,
    enabled: true,
    killSwitch: false,
    intervalMinutes: PIPELINE_INTERVAL_MINUTES,
  }));
}

export async function collectDetailed(cfg: WorkerConfig): Promise<CollectResult> {
  const dbSources = await loadDbSources(cfg);
  const sources = dbSources && dbSources.length > 0 ? dbSources : envSources(cfg);
  const previous = await recentSourceOutcomes(cfg);
  const results: RawItem[] = [];
  const outcomes: Record<string, SourceFetchOutcome> = {};
  const disabled: string[] = [];
  const nowIso = new Date().toISOString();

  for (const src of sources) {
    const key = src.id || src.url;
    try {
      if (!isSourceDue(lastFetchAt(previous, key), src.intervalMinutes)) {
        outcomes[key] = { status: "skipped_not_due", at: nowIso };
        continue;
      }
      assertSafeHttpUrl(src.url);
      const res = await fetchFeedResponse(src.url);
      if (!res) {
        outcomes[key] = { status: "error", at: nowIso };
        continue;
      }
      if (res.status === 403) {
        outcomes[key] = { status: "403", http_status: 403, at: nowIso };
        console.error("[collector] feed_fetch_http_403", { url: src.url, source_id: src.id });
        if (shouldDisableAfter403(previous, key)) {
          await disableNewsSource(cfg, src.url, "feed_fetch_http_403");
          disabled.push(key);
        }
        continue;
      }
      if (!res.ok) {
        outcomes[key] = { status: "error", http_status: res.status, at: nowIso };
        console.error("[collector] feed_fetch_http_" + res.status, { url: src.url });
        continue;
      }
      outcomes[key] = { status: "ok", http_status: res.status, at: nowIso };
      const xml = await res.text();
      results.push(...extractItems(xml, src.url, src.category, src.licenceNote));
    } catch (e) {
      outcomes[key] = { status: "error", at: nowIso };
      console.error("[collector] feed skipped", {
        url: src.url,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { items: results, sources: outcomes, disabled };
}

export async function collect(cfg: WorkerConfig): Promise<RawItem[]> {
  const result = await collectDetailed(cfg);
  return result.items;
}
