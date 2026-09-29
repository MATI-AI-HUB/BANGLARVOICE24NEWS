import type { WorkerConfig } from "../config.js";

export interface MediaResult {
  url: string;
  width: number;
  height: number;
  attribution: string;
}

const UA = "BanglarVoice-AI/1.0 (newsroom; +https://automation-king-lcb2.vercel.app)";

const WIKIMEDIA_API =
  "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url|size&format=json&origin=*&gsrsearch=";

const OPENVERSE_API = "https://api.openverse.org/v1/images/?q=";

function searchQuery(query: string): string {
  const trimmed = query.trim().slice(0, 60);
  if (!trimmed) return "Bangladesh";
  if (/[\u0980-\u09FF]/.test(trimmed)) return `${trimmed} Bangladesh`;
  return trimmed;
}

async function getJson(url: string, extraHeaders: Record<string, string> = {}): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA, ...extraHeaders },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fromWikimedia(query: string): Promise<MediaResult | null> {
  const data = await getJson(WIKIMEDIA_API + encodeURIComponent(query));
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0] as any;
  const info = page?.imageinfo?.[0];
  if (!info?.url) return null;
  return {
    url: info.url,
    width: info.width ?? 1200,
    height: info.height ?? 675,
    attribution: `Wikimedia Commons — ${page.title ?? ""}`,
  };
}

async function fromOpenverse(query: string): Promise<MediaResult | null> {
  const data = await getJson(OPENVERSE_API + encodeURIComponent(query));
  const r = data?.results?.[0];
  if (!r?.url) return null;
  return {
    url: r.url,
    width: r.width ?? 1200,
    height: r.height ?? 675,
    attribution: `Openverse — ${r.license ?? "CC0"}`,
  };
}

async function fromPexels(cfg: WorkerConfig, query: string): Promise<MediaResult | null> {
  if (!cfg.pexelsApiKey) return null;
  const data = await getJson(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
    { Authorization: cfg.pexelsApiKey },
  );
  const p = data?.photos?.[0];
  if (!p?.src?.large) return null;
  return {
    url: p.src.large,
    width: p.width ?? 1200,
    height: p.height ?? 675,
    attribution: `Pexels — ${p.photographer ?? ""}`,
  };
}

export async function fetchMedia(cfg: WorkerConfig, query: string): Promise<MediaResult | null> {
  const q = searchQuery(query);
  return (await fromWikimedia(q)) ?? (await fromOpenverse(q)) ?? (await fromPexels(cfg, q));
}
