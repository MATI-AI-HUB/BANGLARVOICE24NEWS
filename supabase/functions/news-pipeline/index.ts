// =============================================================================
// news-pipeline — 24/7 AI news automation.
// Triggered by pg_cron every 15 minutes.
// Flow: RSS fetch → parse → dedup → AI rewrite → insert into articles.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4";
import { handleCors, json } from "../_shared/cors.ts";
import { chat, vaultKey } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// ─── RSS Sources (Bangla categories) ──────────────────────────────────────────
const RSS_SOURCES: { category: string; url: string }[] = [
  { category: "জাতীয়", url: "https://news.google.com/rss/search?q=Bangladesh&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "রাজনীতি", url: "https://news.google.com/rss/search?q=%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%A8%E0%A7%80%E0%A6%A4%E0%A6%BF&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "অর্থনীতি", url: "https://news.google.com/rss/search?q=%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%A5%E0%A6%A8%E0%A7%80%E0%A6%A4%E0%A6%BF&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "খেলা", url: "https://news.google.com/rss/search?q=%E0%A6%96%E0%A7%87%E0%A6%B2%E0%A6%BE&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "আন্তর্জাতিক", url: "https://news.google.com/rss/search?q=world&hl=bn&gl=BD&ceid=BD:bn" },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface RawItem {
  id: string;
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  category: string;
}

function stableId(title: string, link: string): string {
  let h = 0;
  const s = `${title}|${link}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

async function fetchRSS(url: string, category: string): Promise<RawItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BanglarVoiceBot/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const doc = parser.parse(xml);
    const items = doc?.rss?.channel?.item ?? [];
    const arr = Array.isArray(items) ? items : [items];
    return arr
      .map((e: any) => {
        const title = String(e?.title ?? "").trim();
        const link = String(e?.link ?? "").trim();
        if (!title || !link) return null;
        return {
          id: stableId(title, link),
          title,
          link,
          description: String(e?.description ?? "").replace(/<[^>]*>/g, "").slice(0, 500),
          publishedAt: String(e?.pubDate ?? new Date().toISOString()),
          category,
        } as RawItem;
      })
      .filter((x: RawItem | null): x is RawItem => x !== null);
  } catch (e) {
    console.error(`RSS fetch failed for ${category}:`, e);
    return [];
  }
}

async function isDuplicate(link: string): Promise<boolean> {
  // Simple check: does an article with similar title already exist?
  const titleFragment = link.slice(-40);
  const { data } = await supabase
    .from("articles")
    .select("id")
    .ilike("content_bn", `%${titleFragment}%`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const start = Date.now();
  try {
    // Get Groq key from vault
    const groqKey = await vaultKey(supabase, "GROQ_API_KEY");
    if (!groqKey) {
      return json({ ok: false, error: "GROQ_API_KEY not in vault" }, 400);
    }

    // Fetch all RSS feeds in parallel
    const feedResults = await Promise.all(
      RSS_SOURCES.map((s) => fetchRSS(s.url, s.category)),
    );
    const allItems = feedResults.flat();

    // Dedup + limit
    const fresh = allItems.slice(0, 10); // 10 per run

    let published = 0;
    let skipped = 0;

    for (const item of fresh) {
      // Skip if description is too short (junk)
      if (item.description.length < 40) {
        skipped++;
        continue;
      }

      // AI rewrite
      const rewritten = await chat({
        baseUrl: "https://api.groq.com/openai/v1",
        model: "llama-3.3-70b-versatile",
        apiKey: groqKey,
        systemPrompt: `তুমি বাংলার ভয়েসের সিনিয়র সাংবাদিক। তুমি যেকোনো সংবাদ নিজের ভাষায়, সংক্ষেপে, নিরপেক্ষভাবে, আকর্ষণীয় হেডলাইনসহ বাংলায় রিরাইট করো।

নিয়ম:
- শিরোনাম সর্বোচ্চ ১২ শব্দ
- মূল অংশ ৩-৫ প্যারাগ্রাফ (প্রতি প্যারাগ্রাফ ৩-৪ লাইন)
- নিরপেক্ষ ভাষা, কোনো পক্ষপাতিত্ব নয়
- সূত্র উল্লেখ: "সূত্র: Google News / মূল প্রকাশনা"
- শুধু বাংলায় উত্তর দাও
- JSON ফরম্যাটে: { "title": "...", "content": "..." }

আউটপুট শুধু JSON, ব্যাখ্যা নয়।`,
        userPrompt: `মূল সংবাদ: ${item.title}\n\n${item.description}\n\nএখন এটি বাংলায় রিরাইট করো।`,
        temperature: 0.4,
        maxTokens: 800,
      });

      // Parse AI JSON response
      let title = item.title;
      let content = item.description;
      try {
        const cleaned = rewritten.replace(/```json\s*|\s*```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.title) title = parsed.title;
        if (parsed.content) content = parsed.content;
      } catch {
        // If AI didn't return JSON, use raw text as content
        content = rewritten.slice(0, 2000);
      }

      // Insert into articles
      const { error } = await supabase.from("articles").insert({
        title_bn: title.slice(0, 250),
        content_bn: content,
        title_en: "",
        content_en: "",
        thumbnail_url: "",
        category: item.category,
        status: "published",
        published_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Insert failed:", error.message);
        skipped++;
      } else {
        published++;
        // Log to ai_audit_log
        await supabase.from("ai_audit_log").insert({
          model: "llama-3.3-70b-versatile",
          provider: "groq",
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
          latency_ms: Date.now() - start,
          status: "success",
        });
      }
    }

    return json({
      ok: true,
      fetched: allItems.length,
      published,
      skipped,
      duration_ms: Date.now() - start,
    });
  } catch (e) {
    console.error("news-pipeline error:", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
