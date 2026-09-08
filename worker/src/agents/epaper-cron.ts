// =============================================================================
// epaper-cron.ts — Daily e-paper auto-generation (23:00–00:00 window).
//
// Runs once per day at 23:30 (cron "30 23 * * *"). It pulls the day's top
// articles from the backend, builds a printable HTML e-paper (and, when a
// headless renderer is configured, a PDF), and archives the edition into the
// `epaper_editions` table via the backend ingest endpoint. No secrets are
// hardcoded — everything comes from the environment.
// =============================================================================

import { loadConfig, type WorkerConfig } from "../config.js";

export interface EPaperEdition {
  edition_date: string; // YYYY-MM-DD
  title: string;
  html: string; // printable HTML body
  pdf_url: string; // empty when PDF rendering is not configured
  article_count: number;
  created_at: string;
}

const CRON_EXPRESSION = "30 23 * * *"; // 23:30 daily (within the 23:00–00:00 window)

/** Build a compact, print-friendly HTML e-paper from the day's articles. */
export function buildEpaperHtml(
  editionDate: string,
  articles: { headline: string; body: string; attribution?: string }[],
): string {
  const items = articles
    .map(
      (a, i) => `
      <article class="item">
        <h2>${escapeHtml(a.headline)}</h2>
        ${a.attribution ? `<p class="attr">${escapeHtml(a.attribution)}</p>` : ""}
        <p>${escapeHtml(a.body)}</p>
      </article>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<title>বাংলার ভয়েস — ই-পেপার ${escapeHtml(editionDate)}</title>
<style>
  body { font-family: 'Noto Serif Bengali', serif; color: #0F0F0F; background: #FFFEFB; max-width: 720px; margin: 0 auto; padding: 24px; }
  header { border-bottom: 3px solid #C41E1E; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 28px; margin: 0; color: #C41E1E; }
  .date { color: #666; font-size: 13px; }
  .item { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #E5E2DE; }
  .item h2 { font-size: 18px; margin: 0 0 6px; }
  .attr { color: #C41E1E; font-size: 12px; margin: 0 0 6px; }
  .item p { font-size: 14px; line-height: 1.7; margin: 0; }
</style>
</head>
<body>
  <header>
    <h1>বাংলার ভয়েস</h1>
    <p class="date">ই-পেপার — ${escapeHtml(editionDate)}</p>
  </header>
  ${items}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fetch the day's top articles from the backend public feed. */
async function fetchTopArticles(cfg: WorkerConfig, date: string): Promise<{ headline: string; body: string; attribution?: string }[]> {
  const url = `${cfg.bvBaseUrl}/api/public/articles?limit=12`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`epaper: articles fetch failed ${res.status}`);
  const data = (await res.json()) as { items?: { title?: string; excerpt?: string; author?: string }[] };
  return (data.items ?? []).map((a) => ({
    headline: a.title ?? "শিরোনামহীন",
    body: a.excerpt ?? "",
    attribution: a.author ? `লেখক: ${a.author}` : undefined,
  }));
}

/** Archive the edition into the backend `epaper_editions` table. */
export async function archiveEpaper(cfg: WorkerConfig, edition: EPaperEdition): Promise<{ ok: boolean; id?: string }> {
  const res = await fetch(`${cfg.bvBaseUrl}/api/newsroom/epaper`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ingest-key": cfg.newsroomIngestKey,
    },
    body: JSON.stringify(edition),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`epaper archive failed ${res.status}`);
  return (await res.json()) as { ok: boolean; id?: string };
}

/** Run one e-paper generation cycle. */
export async function runEpaperCycle(cfg: WorkerConfig): Promise<{ edition: EPaperEdition; archived: boolean }> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const articles = await fetchTopArticles(cfg, date);
  const html = buildEpaperHtml(date, articles);
  const edition: EPaperEdition = {
    edition_date: date,
    title: `বাংলার ভয়েস ই-পেপার — ${date}`,
    html,
    pdf_url: "",
    article_count: articles.length,
    created_at: now.toISOString(),
  };
  const archived = await archiveEpaper(cfg, edition);
  return { edition, archived: archived.ok };
}

export { CRON_EXPRESSION };