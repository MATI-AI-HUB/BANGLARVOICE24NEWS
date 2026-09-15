// =============================================================================
// news-pipeline v2 — World-Class AI News Automation
// Triggered by pg_cron every 15 minutes.
// Flow: RSS → dedup → AI rewrite (fact-safe) → Pexels image → insert.
//
// Guarantees:
//   • Source fidelity: source_url + source_name retained per article
//   • Fact integrity: strict prompt forbids additions/hallucinations
//   • Visual quality: Pexels landscape image + photographer credit
//   • Category enum: category_key validated against whitelist
//   • Dedup: skip articles whose source_url already exists
//   • Min length: content <300 chars rejected
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4";
import { handleCors, json } from "../_shared/cors.ts";
import { chat, vaultKey } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RSS_SOURCES = [
  { name: "প্রথম আলো",      url: "https://www.prothomalo.com/feed",          category_hint: "national" },
  { name: "বিডিনিউজ২৪",     url: "https://bangla.bdnews24.com/rss.xml",       category_hint: "national" },
  { name: "ঢাকা পোস্ট",     url: "https://www.dhakapost.com/rss.xml",         category_hint: "national" },
];

const CATEGORY_ENUM = [
  "national", "politics", "economy", "sports", "entertainment",
  "tech", "health", "education", "international", "city",
] as const;
type CategoryKey = typeof CATEGORY_ENUM[number];

const MIN_CONTENT = 300;
const MAX_PER_RUN = 8;
const AI_MODEL = "llama-3.3-70b-versatile";
const AI_BASE = "https://api.groq.com/openai/v1";

// ─── RSS ───
type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  source_name: string;
};

async function fetchRSS(url: string, sourceName: string): Promise<RssItem[]> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      console.warn(`[rss] ${sourceName}: HTTP ${r.status}`);
      return [];
    }
    const xml = await r.text();
    const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .map((item: Record<string, unknown>) => {
        const title = String(item.title || "").trim();
        const description = String(
          item.description || item.summary || item["content:encoded"] || "",
        ).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const link =
          typeof item.link === "string"
            ? item.link
            : (item.link as Record<string, string> | undefined)?.["@_href"] || "";
        const pubDate = String(item.pubDate || item.published || item.updated || "");
        return { title, link, description, pubDate, source_name: sourceName };
      })
      .filter((i: RssItem) => i.title && i.link && i.description.length >= 60);
  } catch (e) {
    console.error(`[rss] ${sourceName} failed:`, (e as Error).message);
    return [];
  }
}

// ─── Dedup ───
async function sourceUrlExists(url: string): Promise<boolean> {
  const { data } = await supabase
    .from("articles")
    .select("id")
    .eq("source_url", url)
    .maybeSingle();
  return !!data;
}

// ─── AI rewrite with strict fact-preserving prompt ───
type Rewrite = {
  title_bn: string;
  content_bn: string;
  category_key: CategoryKey;
  confidence: number;
};

async function aiRewrite(groqKey: string, item: RssItem): Promise<Rewrite | null> {
  const systemPrompt = `তুমি বাংলার ভয়েসের সিনিয়র সংবাদ সম্পাদক। নিচে একটি মূল সোর্স নিউজ দেওয়া হলো।

কঠোর নিয়ম (কোনো ব্যতিক্রম নয়):
১. শুধু সোর্সে যা আছে তাই বাংলায় রিরাইট করো। কোনো নতুন তথ্য, নাম, সংখ্যা, দেশ বা শহরের নাম যোগ করবে না।
২. সোর্সে পরস্পরবিরোধী বা অস্পষ্ট তথ্য থাকলে সেটা বাদ দাও — অনুমান করো না।
৩. শিরোনাম: ৮-১২ শব্দ, তথ্যপূর্ণ, ক্লিকবেট নয়, প্রশ্নচিহ্ন ছাড়া।
৪. মূল অংশ: ৪-৬ প্যারাগ্রাফ, প্রতি প্যারাগ্রাফ ৩-৪ লাইন, মাঝে \\n\\n।
৫. শেষ প্যারায়: "সূত্র: [সোর্স নাম]" — শুধু নাম।
৬. category_key অবশ্যই এই enum থেকে একটি:
   national | politics | economy | sports | entertainment | tech | health | education | international | city
৭. confidence: 0.0-1.0 — সোর্সের তথ্য কতটা নির্ভরযোগ্য সেই অনুযায়ী।

Output শুধু একটি JSON, অন্য কিছু নয়:
{
  "title_bn": "string",
  "content_bn": "string",
  "category_key": "string",
  "confidence": number
}`;

  const userPrompt = `সোর্স: ${item.source_name}
শিরোনাম: ${item.title}
বিবরণ: ${item.description}`;

  try {
    const raw = await chat({
      baseUrl: AI_BASE,
      model: AI_MODEL,
      apiKey: groqKey,
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Rewrite;

    if (!parsed.title_bn || !parsed.content_bn) return null;
    if (parsed.content_bn.length < MIN_CONTENT) return null;
    if (!CATEGORY_ENUM.includes(parsed.category_key)) {
      parsed.category_key = "national";
      parsed.confidence = Math.min(parsed.confidence ?? 0.5, 0.6);
    }
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.7));
    return parsed;
  } catch (e) {
    console.error(`[ai] rewrite failed for "${item.title.slice(0, 40)}":`, (e as Error).message);
    return null;
  }
}

// ─── Pexels image ───
type ImageResult = { url: string; credit: string };

async function fetchPexelsImage(
  supabaseClient: typeof supabase,
  query: string,
): Promise<ImageResult | null> {
  const key = await vaultKey(supabaseClient, "PEXELS_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(5000) },
    );
    if (!r.ok) return null;
    const data = await r.json();
    const photo = data.photos?.[0];
    if (!photo) return null;
    return {
      url: photo.src?.large || photo.src?.original || "",
      credit: `${photo.photographer || "Unknown"} / Pexels`,
    };
  } catch {
    return null;
  }
}

// ─── Main ───
Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const start = Date.now();
  try {
    const groqKey = await vaultKey(supabase, "GROQ_API_KEY");
    if (!groqKey) {
      return json({ ok: false, error: "GROQ_API_KEY not in vault" }, 400);
    }

    // Fetch all feeds in parallel
    const feedResults = await Promise.all(
      RSS_SOURCES.map((s) => fetchRSS(s.url, s.name)),
    );
    const allItems = feedResults.flat();

    // Dedup within this batch by URL (first occurrence wins)
    const seen = new Set<string>();
    const unique = allItems.filter((i) => {
      if (seen.has(i.link)) return false;
      seen.add(i.link);
      return true;
    });

    // Fresh items only, limited
    const fresh = unique.slice(0, MAX_PER_RUN);

    let published = 0;
    let duplicates = 0;
    let skipped = 0;

    for (const item of fresh) {
      // Dedup against DB
      if (await sourceUrlExists(item.link)) {
        duplicates++;
        continue;
      }

      // AI rewrite
      const rewritten = await aiRewrite(groqKey, item);
      if (!rewritten) {
        skipped++;
        continue;
      }

      // Pexels image (category-aware query, Bangladesh context)
      const image = await fetchPexelsImage(
        supabase,
        `${rewritten.category_key} bangladesh`,
      );

      const { error } = await supabase.from("articles").insert({
        title_bn: rewritten.title_bn.slice(0, 250),
        title_en: "",
        content_bn: rewritten.content_bn,
        content_en: "",
        thumbnail_url: image?.url || "",
        image_credit: image?.credit || "",
        category: rewritten.category_key,
        category_key: rewritten.category_key,
        status: "published",
        published_at: new Date().toISOString(),
        source_url: item.link,
        source_name: item.source_name,
        ai_model: AI_MODEL,
        ai_confidence: rewritten.confidence,
      });

      if (error) {
        console.error("[insert] failed:", error.message);
        skipped++;
        continue;
      }

      published++;

      // Audit log
      await supabase.from("ai_audit_log").insert({
        model: AI_MODEL,
        provider: "groq",
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        latency_ms: Date.now() - start,
        status: "success",
      });
    }

    return json({
      ok: true,
      fetched: allItems.length,
      unique: unique.length,
      published,
      duplicates,
      skipped,
      duration_ms: Date.now() - start,
    });
  } catch (e) {
    console.error("news-pipeline error:", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
