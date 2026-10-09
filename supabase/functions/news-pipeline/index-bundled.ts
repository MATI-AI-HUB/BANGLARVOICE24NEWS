import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function vaultKey(name: string): Promise<string | null> {
  const { data: row } = await supabase
    .from("api_vault").select("key_encrypted")
    .eq("service_name", name).eq("is_active", true).maybeSingle();
  if (!row?.key_encrypted) return null;
  const { data: plain } = await supabase.rpc("decrypt_vault_secret", {
    p_secret_id: row.key_encrypted,
  });
  return (plain as string) || null;
}

const RSS_SOURCES = [
  { name: "প্রথম আলো",       url: "https://www.prothomalo.com/feed",          category_hint: "national" },
  { name: "বিডিনিউজ২৪",     url: "https://bangla.bdnews24.com/rss.xml",       category_hint: "national" },
  { name: "যুগান্তর",         url: "https://www.jugantor.com/rss",              category_hint: "national" },
  { name: "কালের কণ্ঠ",       url: "https://www.kalerkantho.com/rss.xml",       category_hint: "national" },
  { name: "ডেইলি স্টার",       url: "https://bangla.thedailystar.net/rss.xml",   category_hint: "national" },
  { name: "BBC বাংলা",       url: "https://feeds.bbci.co.uk/bengali/rss.xml", category_hint: "international" },
  { name: "DW বাংলা",        url: "https://rss.dw.com/rdf/rss-bn-all",        category_hint: "international" },
  { name: "ঢাকা পোস্ট",     url: "https://www.dhakapost.com/rss.xml",         category_hint: "sports" },
  { name: "অর্থসূচক",         url: "https://arthosuchak.com/feed",              category_hint: "economy" },
  { name: "টেকশহর",          url: "https://techshohor.com/feed",              category_hint: "tech" },
];

const CATEGORY_ENUM = [
  "national", "politics", "economy", "sports", "entertainment",
  "tech", "health", "education", "international", "city",
];

const MIN_CONTENT = 300;
const MAX_PER_RUN = 30;
const AI_MODEL = "openai/gpt-oss-120b";
const AI_BASE = "https://api.groq.com/openai/v1";

type RssItem = { title: string; link: string; description: string; source_name: string; category_hint: string };

function parseRssItems(xml: string, sourceName: string, categoryHint: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) || [];
  for (const block of blocks) {
    const grab = (tag: string): string => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      if (!m) return "";
      return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ").trim();
    };
    let link = grab("link");
    if (!link) {
      const hrefMatch = block.match(/<link[^>]*href="([^"]+)"/);
      if (hrefMatch) link = hrefMatch[1];
    }
    const title = grab("title");
    const description = grab("description") || grab("summary") || grab("content:encoded");
    if (title && link && description.length >= 60) {
      items.push({ title, link, description, source_name: sourceName, category_hint: categoryHint });
    }
  }
  return items;
}

async function fetchRSS(url: string, sourceName: string, categoryHint: string): Promise<RssItem[]> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseRssItems(xml, sourceName, categoryHint);
  } catch { return []; }
}


async function titleTooSimilar(titleBn: string): Promise<boolean> {
  // Normalize: only Bengali letters, first 15 chars = topic fingerprint
  const fp = titleBn.replace(/[^\u0980-\u09FF]/g, "").slice(0, 15);
  if (fp.length < 8) return false;
  const { data } = await supabase
    .from("articles")
    .select("id, title_bn")
    .in("status", ["published", "pending"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (!data) return false;
  // Compare fingerprints
  for (const row of data) {
    const rowFp = String(row.title_bn || "").replace(/[^\u0980-\u09FF]/g, "").slice(0, 15);
    if (rowFp === fp) return true;
  }
  return false;
}

async function sourceUrlExists(url: string): Promise<boolean> {
  const { data } = await supabase.from("articles").select("id").eq("source_url", url).maybeSingle();
  return !!data;
}

// ── AI returns sensitivity as part of rewrite ──
async function getOpenRouterKey(): Promise<string | null> {
  const { data: row } = await supabase
    .from("api_vault").select("key_encrypted")
    .eq("service_name", "OPENROUTER_API_KEY")
    .eq("is_active", true).maybeSingle();
  if (!row?.key_encrypted) return null;
  const { data: plain } = await supabase.rpc("decrypt_vault_secret", {
    p_secret_id: row.key_encrypted,
  });
  return (plain as string) || null;
}

async function tryOpenRouter(orKey: string, systemPrompt: string, userPrompt: string) {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + orKey,
        "HTTP-Referer": "https://YOUR_DOMAIN",
        "X-Title": "Banglar Voice",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        temperature: 0.3,
        max_tokens: 3000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) {
      console.error("[openrouter] HTTP", r.status);
      return null;
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[openrouter] failed:", (e as Error).message);
    return null;
  }
}

async function aiRewrite(groqKey: string, item: RssItem) {
  const systemPrompt = `তুমি বাংলার ভয়েসের সিনিয়র সংবাদ সম্পাদক। নিচে একটি মূল সোর্স নিউজ দেওয়া হলো।

কাজ ১ — সংবাদ রিরাইট (বাংলায়):
- শুধু সোর্সে যা আছে তাই লিখো। নতুন তথ্য, নাম, সংখ্যা, দেশ বা শহরের নাম যোগ করবে না।
- অস্পষ্ট বা পরস্পরবিরোধী তথ্য বাদ দাও — অনুমান করো না।
- শিরোনাম: ৮-১২ শব্দ, তথ্যপূর্ণ, ক্লিকবেট নয়।
- মূল অংশ: ৪-৬ প্যারাগ্রাফ, প্রতি প্যারাগ্রাফ ৩-৪ লাইন, মাঝে নতুন লাইন।
- শেষ প্যারায়: "সূত্র: [সোর্স নাম]"।

কাজ ২ — Category নির্ধারণ (একটি বেছে নাও):
national | politics | economy | sports | entertainment | tech | health | education | international | city

কাজ ৩ — Sensitivity rating (০.০ - ১.০):
এই সংবাদটি সম্পাদকীয় অনুমোদন প্রয়োজন কিনা সেটা নির্ণয় করো।
উচ্চ sensitivity (০.৭+): রাজনীতি, ধর্ম, অপরাধ, যুদ্ধ, মৃত্যু, দুর্নীতি, নির্বাচন, সংঘর্ষ
মাঝারি (০.৪-০.৭): আন্তর্জাতিক ঘটনা, দুর্ঘটনা, স্বাস্থ্য সংকট
কম (০.০-০.৪): খেলা, বিনোদন, প্রযুক্তি, শিক্ষা, সিটি লাইফ, অর্থনীতি

কাজ ৪ — English translation (for dual-language platform):
- Produce an accurate, natural English translation of the Bengali title and content.
- Keep proper nouns (names, places) in their standard English form (e.g. Dhaka, Sheikh Hasina).
- News-wire style: neutral, factual, no editorializing.
- Same paragraph structure as Bengali. Include the source line at the end as "Source: [source name]".

কাজ ৫ — Confidence (০.০ - ১.০): তথ্যের নির্ভরযোগ্যতা।

Output শুধু JSON:
{
  "title_bn": "string",
  "content_bn": "string",
  "title_en": "string",
  "content_en": "string",
  "category_key": "string",
  "sensitivity": number,
  "sensitivity_reason": "string (সংক্ষেপে বাংলায় কেন sensitive)",
  "confidence": number
}`;

  const userPrompt = `সোর্স: ${item.source_name}\nশিরোনাম: ${item.title}\nবিবরণ: ${item.description}`;

  try {
    const res = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: AI_MODEL, temperature: 0.3, max_tokens: 1800,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.error("[groq] HTTP", res.status, "— trying OpenRouter fallback");
      const orKey = await getOpenRouterKey();
      if (!orKey) return null;
      const orParsed = await tryOpenRouter(orKey, systemPrompt, userPrompt);
      if (!orParsed) return null;
      if (!orParsed.title_bn || !orParsed.content_bn) return null;
      if (!orParsed.title_en) orParsed.title_en = orParsed.title_bn;
      if (!orParsed.content_en) orParsed.content_en = orParsed.content_bn;
      if (orParsed.content_bn.length < MIN_CONTENT) return null;
      if (!CATEGORY_ENUM.includes(orParsed.category_key)) {
        orParsed.category_key = item.category_hint || "national";
        orParsed.confidence = Math.min(orParsed.confidence ?? 0.5, 0.6);
      }
      orParsed.confidence = Math.max(0, Math.min(1, orParsed.confidence ?? 0.7));
      orParsed.sensitivity = Math.max(0, Math.min(1, orParsed.sensitivity ?? 0.5));
      return orParsed;
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.title_bn || !parsed.content_bn) return null;
    // Graceful fallback: if English missing, mirror Bengali (backfill will fix later)
    if (!parsed.title_en) parsed.title_en = parsed.title_bn;
    if (!parsed.content_en) parsed.content_en = parsed.content_bn;
    if (parsed.content_bn.length < MIN_CONTENT) return null;
    if (!CATEGORY_ENUM.includes(parsed.category_key)) {
      parsed.category_key = item.category_hint || "national";
      parsed.confidence = Math.min(parsed.confidence ?? 0.5, 0.6);
    }
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.7));
    parsed.sensitivity = Math.max(0, Math.min(1, parsed.sensitivity ?? 0.5));
    return parsed;
  } catch { return null; }
}

// ── Category → English keyword bank (for varied Pexels queries) ──
const CATEGORY_QUERIES: Record<string, string[]> = {
  national:      ["bangladesh city", "dhaka street", "bangladesh people", "bangladesh landscape"],
  politics:      ["government building", "parliament", "press conference", "official meeting"],
  international: ["world news", "global affairs", "united nations", "diplomacy"],
  economy:       ["business finance", "stock market", "trade commerce", "banking"],
  sports:        ["cricket match", "football stadium", "athlete running", "sports arena"],
  entertainment: ["concert stage", "cinema theatre", "cultural festival", "music performance"],
  tech:          ["technology computer", "digital innovation", "software code", "smartphone"],
  health:        ["hospital doctor", "medical care", "health wellness", "laboratory"],
  education:     ["students classroom", "university library", "school books", "study desk"],
  city:          ["urban street", "city skyline", "public transport", "neighborhood"],
};

const usedPhotoIds = new Set<number>();

async function photoUsedBefore(photoUrl: string): Promise<boolean> {
  const { data } = await supabase
    .from("articles")
    .select("id")
    .eq("thumbnail_url", photoUrl)
    .maybeSingle();
  return !!data;
}

async function fetchPexelsImage(categoryKey: string): Promise<{ url: string; credit: string } | null> {
  const key = await vaultKey("PEXELS_API_KEY");
  if (!key) return null;

  const queries = CATEGORY_QUERIES[categoryKey] || CATEGORY_QUERIES.national;

  // Try up to 3 different queries for uniqueness
  for (let attempt = 0; attempt < 3; attempt++) {
    const query = queries[Math.floor(Math.random() * queries.length)];
    const page = Math.floor(Math.random() * 5) + 1; // random page 1-5
    try {
      const r = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&page=${page}&orientation=landscape`,
        { headers: { Authorization: key }, signal: AbortSignal.timeout(5000) },
      );
      if (!r.ok) continue;
      const data = await r.json();
      const photos = data.photos || [];

      // Shuffle and find an unused photo
      const shuffled = photos.sort(() => Math.random() - 0.5);
      for (const photo of shuffled) {
        if (!photo?.id) continue;
        if (usedPhotoIds.has(photo.id)) continue;
        const url = photo.src?.large || photo.src?.original || "";
        if (!url) continue;
        // DB check for cross-run duplicates
        if (await photoUsedBefore(url)) continue;
        usedPhotoIds.add(photo.id);
        return {
          url,
          credit: `${photo.photographer || "Unknown"} / Pexels`,
        };
      }
    } catch { continue; }
  }
  return null;
}

const SENSITIVITY_THRESHOLD = 0.7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const start = Date.now();
  try {
    const groqKey = await vaultKey("GROQ_API_KEY");
    if (!groqKey) return json({ ok: false, error: "GROQ_API_KEY not in vault" }, 400);

    const feedResults = await Promise.all(
      RSS_SOURCES.map((s) => fetchRSS(s.url, s.name, s.category_hint)),
    );
    const allItems = feedResults.flat();

    const seen = new Set<string>();
    const unique = allItems.filter((i) => {
      if (seen.has(i.link)) return false;
      seen.add(i.link);
      return true;
    });
    // Take a diverse slice — skip the first 10 (likely already processed),
    // then blend in first 10 for safety.
    const fresh = [
      ...unique.slice(10, 10 + MAX_PER_RUN),  // deeper items
      ...unique.slice(0, 10),                  // recent items (backup)
    ].slice(0, MAX_PER_RUN);
    let published = 0, pending = 0, duplicates = 0, skipped = 0;

    for (const item of fresh) {
      if (await sourceUrlExists(item.link)) { duplicates++; continue; }
      // (title check happens after rewrite, since title is AI-generated)
      const rewritten = await aiRewrite(groqKey, item);
      if (!rewritten) { skipped++; continue; }
      if (await titleTooSimilar(rewritten.title_bn)) { duplicates++; continue; }

      const isSensitive = rewritten.sensitivity >= SENSITIVITY_THRESHOLD || rewritten.category_key === "politics";
      const finalStatus = isSensitive ? "pending" : "published";
      const image = await fetchPexelsImage(rewritten.category_key);

      const { error } = await supabase.from("articles").insert({
        title_bn: rewritten.title_bn.slice(0, 250),
        title_en: (rewritten.title_en || "").slice(0, 250),
        content_bn: rewritten.content_bn,
        content_en: rewritten.content_en || "",
        thumbnail_url: image?.url || "", image_credit: image?.credit || "",
        category: rewritten.category_key, category_key: rewritten.category_key,
        status: finalStatus,
        published_at: finalStatus === "published" ? new Date().toISOString() : null,
        source_url: item.link, source_name: item.source_name,
        ai_model: AI_MODEL, ai_confidence: rewritten.confidence,
      });
      if (error) { skipped++; continue; }

      if (finalStatus === "published") published++;
      else pending++;

      await supabase.from("ai_audit_log").insert({
        model: AI_MODEL, provider: "groq",
        input_tokens: 0, output_tokens: 0, cost_usd: 0,
        latency_ms: Date.now() - start,
        status: isSensitive ? `pending:s${rewritten.sensitivity.toFixed(2)}` : "success",
      });
    }

    return json({
      ok: true, fetched: allItems.length, unique: unique.length,
      published, pending, duplicates, skipped,
      duration_ms: Date.now() - start,
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
