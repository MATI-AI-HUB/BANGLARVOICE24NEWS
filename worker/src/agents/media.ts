// =============================================================================
// media.ts — the Media agent: sources a CC0 / license-safe image for an
// article. Tries Wikimedia Commons and Openverse (both key-free), then Pexels
// (optional key). Returns a thumbnail URL with width/height (CLS 0).
// =============================================================================

import type { WorkerConfig } from "../config.js";

export interface MediaResult {
  url: string;
  width: number;
  height: number;
  attribution: string;
}

const WIKIMEDIA_API =
  "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url|size&format=json&origin=*&gsrsearch=";

const OPENVERSE_API = "https://api.openverse.org/v1/images/?q=";

async function fromWikimedia(query: string): Promise<MediaResult | null> {
  try {
    const res = await fetch(WIKIMEDIA_API + encodeURIComponent(query));
    if (!res.ok) return null;
    const data: any = await res.json();
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
  } catch {
    return null;
  }
}

async function fromOpenverse(query: string): Promise<MediaResult | null> {
  try {
    const res = await fetch(OPENVERSE_API + encodeURIComponent(query));
    if (!res.ok) return null;
    const data: any = await res.json();
    const r = data?.results?.[0];
    if (!r?.url) return null;
    return {
      url: r.url,
      width: r.width ?? 1200,
      height: r.height ?? 675,
      attribution: `Openverse — ${r.license ?? "CC0"}`,
    };
  } catch {
    return null;
  }
}

async function fromPexels(cfg: WorkerConfig, query: string): Promise<MediaResult | null> {
  if (!cfg.pexelsApiKey) return null;
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: { Authorization: cfg.pexelsApiKey },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const p = data?.photos?.[0];
    if (!p?.src?.large) return null;
    return {
      url: p.src.large,
      width: p.width ?? 1200,
      height: p.height ?? 675,
      attribution: `Pexels — ${p.photographer ?? ""}`,
    };
  } catch {
    return null;
  }
}

export async function fetchMedia(cfg: WorkerConfig, query: string): Promise<MediaResult | null> {
  const q = query.slice(0, 60);
  return (await fromWikimedia(q)) ?? (await fromOpenverse(q)) ?? (await fromPexels(cfg, q));
}