import type { WorkerConfig } from "../config.js";
import { fetchWithRetry } from "../lib/http.js";

export interface MediaResult {
  url: string;
  width: number;
  height: number;
  attribution: string;
  license: string;
  source: "wikimedia" | "openverse" | "pexels" | "rss" | "brand";
}

const WIKIMEDIA_API =
  "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*&gsrsearch=";

const OPENVERSE_API = "https://api.openverse.org/v1/images/?q=";

function searchQuery(query: string): string {
  const trimmed = query.trim().slice(0, 60);
  if (!trimmed) return "Bangladesh";
  if (/[\u0980-\u09FF]/.test(trimmed)) return `${trimmed} Bangladesh`;
  return trimmed;
}

function metaText(meta: Record<string, { value?: string }> | undefined, key: string): string {
  const v = meta?.[key]?.value;
  return typeof v === "string" ? v.trim() : "";
}

async function getJson(url: string, extraHeaders: Record<string, string> = {}): Promise<unknown | null> {
  const res = await fetchWithRetry(url, {
    headers: { Accept: "application/json", ...extraHeaders },
  });
  if (!res?.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fromWikimedia(query: string): Promise<MediaResult | null> {
  const data = (await getJson(WIKIMEDIA_API + encodeURIComponent(query))) as {
    query?: { pages?: Record<string, {
      title?: string;
      imageinfo?: Array<{
        url?: string;
        width?: number;
        height?: number;
        extmetadata?: Record<string, { value?: string }>;
      }>;
    }> };
  } | null;
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) return null;
  const license = metaText(info.extmetadata, "LicenseShortName") || "CC BY-SA";
  const artist = metaText(info.extmetadata, "Artist") || page?.title || "Wikimedia Commons";
  return {
    url: info.url,
    width: info.width ?? 1200,
    height: info.height ?? 675,
    attribution: `Wikimedia Commons — ${artist}`,
    license,
    source: "wikimedia",
  };
}

async function fromOpenverse(query: string): Promise<MediaResult | null> {
  const data = (await getJson(OPENVERSE_API + encodeURIComponent(query))) as {
    results?: Array<{
      url?: string;
      width?: number;
      height?: number;
      license?: string;
      creator?: string;
      attribution?: string;
    }>;
  } | null;
  const r = data?.results?.[0];
  if (!r?.url) return null;
  const license = r.license || "unknown";
  const creator = r.creator || r.attribution || "Openverse";
  return {
    url: r.url,
    width: r.width ?? 1200,
    height: r.height ?? 675,
    attribution: `Openverse — ${creator} (${license})`,
    license,
    source: "openverse",
  };
}

async function fromPexels(cfg: WorkerConfig, query: string): Promise<MediaResult | null> {
  if (!cfg.pexelsApiKey) return null;
  const data = (await getJson(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
    { Authorization: cfg.pexelsApiKey },
  )) as {
    photos?: Array<{
      src?: { large?: string };
      width?: number;
      height?: number;
      photographer?: string;
    }>;
  } | null;
  const p = data?.photos?.[0];
  if (!p?.src?.large) return null;
  return {
    url: p.src.large,
    width: p.width ?? 1200,
    height: p.height ?? 675,
    attribution: `Pexels — ${p.photographer ?? ""}`,
    license: "Pexels License",
    source: "pexels",
  };
}

export function rssThumbnail(url: string | undefined): MediaResult | null {
  const trimmed = (url || "").trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return {
    url: trimmed,
    width: 1200,
    height: 675,
    attribution: "Source RSS enclosure",
    license: "source",
    source: "rss",
  };
}

export function brandedFallback(): MediaResult {
  return {
    url: "https://www.banglarvoice24news.com/banglar-voice-logo.png",
    width: 1200,
    height: 675,
    attribution: "বাংলার ভয়েস",
    license: "brand",
    source: "brand",
  };
}

export async function fetchMedia(cfg: WorkerConfig, query: string): Promise<MediaResult | null> {
  const q = searchQuery(query);
  return (await fromWikimedia(q)) ?? (await fromOpenverse(q)) ?? (await fromPexels(cfg, q));
}

export async function resolvePipelineMedia(
  cfg: WorkerConfig,
  query: string,
  sourceImageUrl?: string,
): Promise<MediaResult> {
  const fromSource = rssThumbnail(sourceImageUrl);
  if (fromSource) return fromSource;
  const pexels = await fromPexels(cfg, searchQuery(query));
  if (pexels) return pexels;
  return brandedFallback();
}

export function isRepresentationalMedia(media: MediaResult): boolean {
  return media.source === "pexels" || media.source === "brand";
}

export function isFallbackMedia(media: MediaResult): boolean {
  return media.source === "brand";
}
