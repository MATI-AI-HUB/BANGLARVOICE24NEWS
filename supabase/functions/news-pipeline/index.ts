// =============================================================================
// Banglar Voice — Stage 1 Collector
// Purpose: RSS/allowed feed -> durable news_ingest_queue
// No AI model call. No image call. No article publication.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4";
import { handleCors, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Source = {
  name: string;
  url: string;
  category_hint: string;
};

type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  source_name: string;
  category_hint: string;
};

const RSS_SOURCES: Source[] = [
  {
    name: "প্রথম আলো",
    url: "https://www.prothomalo.com/feed",
    category_hint: "national",
  },
  {
    name: "বিডিনিউজ২৪",
    url: "https://bangla.bdnews24.com/rss.xml",
    category_hint: "national",
  },
  {
    name: "ঢাকা পোস্ট",
    url: "https://www.dhakapost.com/rss.xml",
    category_hint: "national",
  },
];

const MAX_ITEMS_PER_SOURCE = 5;

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as Record<string, unknown>)["#text"] || "");
  }
  return "";
}

function cleanHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return value.trim();
  }
}

function parseDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchRSS(source: Source): Promise<RssItem[]> {
  try {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "BanglarVoiceNewsroom/1.0 (+https://banglarvoice24news.com)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      console.warn(`[collector] ${source.name}: HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();

    if (xml.length < 100) {
      console.warn(`[collector] ${source.name}: empty/short response`);
      return [];
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
    });

    const parsed = parser.parse(xml);
    const raw = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    const items = Array.isArray(raw) ? raw : [raw];

    return items
      .map((item: Record<string, unknown>) => {
        const rawLink = item.link;
        const link =
          typeof rawLink === "string"
            ? rawLink
            : text((rawLink as Record<string, unknown>)?.["@_href"]);

        const title = cleanHtml(text(item.title));
        const description = cleanHtml(
          text(item.description) ||
          text(item.summary) ||
          text(item["content:encoded"]),
        );

        return {
          title,
          link: normalizeUrl(link),
          description,
          pubDate: text(item.pubDate) || text(item.published) || text(item.updated),
          source_name: source.name,
          category_hint: source.category_hint,
        };
      })
      .filter((item) =>
        item.title.length >= 8 &&
        item.link.startsWith("http") &&
        item.description.length >= 60
      )
      .slice(0, MAX_ITEMS_PER_SOURCE);
  } catch (error) {
    console.warn(`[collector] ${source.name}: ${String(error)}`);
    return [];
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startedAt = new Date().toISOString();
  const started = Date.now();

  let fetched = 0;
  let queued = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const result = await Promise.allSettled(
      RSS_SOURCES.map((source) => fetchRSS(source)),
    );

    const items = result.flatMap((entry) =>
      entry.status === "fulfilled" ? entry.value : [],
    );

    fetched = items.length;

    const seen = new Set<string>();
    const uniqueItems = items.filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    });

    for (const item of uniqueItems) {
      const { error } = await supabase
        .from("news_ingest_queue")
        .upsert(
          {
            source_name: item.source_name,
            source_url: item.link,
            source_published_at: parseDate(item.pubDate),
            title: item.title.slice(0, 500),
            description: item.description.slice(0, 6000),
            category_hint: item.category_hint,
            status: "queued",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "source_url",
            ignoreDuplicates: true,
          },
        );

      if (error) {
        console.error(`[collector] queue failed: ${error.message}`);
        failed++;
      } else {
        queued++;
      }
    }

    skipped = fetched - uniqueItems.length;

    const durationMs = Date.now() - started;

    await supabase.from("news_pipeline_runs").insert({
      stage: "collector",
      status: failed > 0 ? "partial" : "success",
      fetched,
      queued,
      skipped,
      failed,
      duration_ms: durationMs,
      details: {
        sources: RSS_SOURCES.length,
        unique_items: uniqueItems.length,
      },
      completed_at: new Date().toISOString(),
    });

    return json({
      ok: true,
      stage: "collector",
      fetched,
      unique: uniqueItems.length,
      queued,
      skipped,
      failed,
      duration_ms: durationMs,
    });
  } catch (error) {
    const errorMessage = String(error);

    await supabase.from("news_pipeline_runs").insert({
      stage: "collector",
      status: "failed",
      fetched,
      queued,
      skipped,
      failed: failed + 1,
      duration_ms: Date.now() - started,
      error_message: errorMessage.slice(0, 2000),
      completed_at: new Date().toISOString(),
    }).catch(() => undefined);

    return json(
      {
        ok: false,
        stage: "collector",
        error: errorMessage,
        started_at: startedAt,
      },
      500,
    );
  }
});
