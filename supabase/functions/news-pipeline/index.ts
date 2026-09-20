// Banglar Voice — Stage 1 RSS Collector
// No AI, no image lookup, no article publishing.

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RSS_SOURCES = [
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
] as const;

type RssItem = {
  title: string;
  link: string;
  description: string;
  publishedAt: string | null;
  sourceName: string;
  categoryHint: string;
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record["#text"] || record["__cdata"] || "");
  }

  return "";
}

function clean(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = "";

    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ]) {
      url.searchParams.delete(key);
    }

    return url.toString();
  } catch {
    return value.trim();
  }
}

function isoDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function readFeed(
  source: (typeof RSS_SOURCES)[number],
): Promise<RssItem[]> {
  try {
    const result = await fetch(source.url, {
      headers: {
        "User-Agent": "BanglarVoiceNewsroom/1.0",
        "Accept": "application/rss+xml,application/xml,text/xml,*/*",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!result.ok) {
      console.warn(`[rss] ${source.name}: HTTP ${result.status}`);
      return [];
    }

    const xml = await result.text();
    const parsed = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
    }).parse(xml);

    const rawItems = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .map((raw: Record<string, unknown>) => {
        const rawLink = raw.link;
        const link =
          typeof rawLink === "string"
            ? rawLink
            : asText((rawLink as Record<string, unknown>)?.["@_href"]);

        return {
          title: clean(asText(raw.title)),
          link: canonicalUrl(link),
          description: clean(
            asText(raw.description) ||
              asText(raw.summary) ||
              asText(raw["content:encoded"]),
          ),
          publishedAt: isoDate(
            asText(raw.pubDate) ||
              asText(raw.published) ||
              asText(raw.updated),
          ),
          sourceName: source.name,
          categoryHint: source.category_hint,
        };
      })
      .filter((item) =>
        item.title.length >= 8 &&
        item.link.startsWith("http") &&
        item.description.length >= 60
      )
      .slice(0, 5);
  } catch (error) {
    console.warn(`[rss] ${source.name}: ${String(error)}`);
    return [];
  }
}

Deno.serve(async () => {
  const started = Date.now();
  const startedAt = new Date().toISOString();

  let fetched = 0;
  let queued = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const results = await Promise.all(
      RSS_SOURCES.map((source) => readFeed(source)),
    );

    const all = results.flat();
    fetched = all.length;

    const known = new Set<string>();
    const unique = all.filter((item) => {
      if (known.has(item.link)) return false;
      known.add(item.link);
      return true;
    });

    for (const item of unique) {
      const { data: existing, error: lookupError } = await supabase
        .from("news_ingest_queue")
        .select("id")
        .eq("source_url", item.link)
        .maybeSingle();

      if (lookupError) {
        console.error(`[queue] lookup: ${lookupError.message}`);
        failed++;
        continue;
      }

      if (existing) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("news_ingest_queue")
        .insert({
          source_name: item.sourceName,
          source_url: item.link,
          source_published_at: item.publishedAt,
          title: item.title.slice(0, 500),
          description: item.description.slice(0, 6000),
          category_hint: item.categoryHint,
          status: "queued",
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`[queue] insert: ${insertError.message}`);
        failed++;
      } else {
        queued++;
      }
    }

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
        unique_items: unique.length,
      },
      completed_at: new Date().toISOString(),
    });

    return response({
      ok: true,
      stage: "collector",
      started_at: startedAt,
      fetched,
      unique: unique.length,
      queued,
      skipped,
      failed,
      duration_ms: durationMs,
    });
  } catch (error) {
    const message = String(error);

    await supabase.from("news_pipeline_runs").insert({
      stage: "collector",
      status: "failed",
      fetched,
      queued,
      skipped,
      failed: failed + 1,
      duration_ms: Date.now() - started,
      error_message: message.slice(0, 2000),
      completed_at: new Date().toISOString(),
    }).catch(() => undefined);

    return response(
      { ok: false, stage: "collector", error: message },
      500,
    );
  }
});
