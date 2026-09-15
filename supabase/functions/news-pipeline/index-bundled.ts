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
const MAX_PER_RUN = 10;
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

async function sourceUrlExists(url: string): Promise<boolean> {
  const { data } = await supabase.from("articles").select("id").eq("source_url", url).maybeSingle();
  return !!data;
}

// ── AI returns sensitivity as part of rewrite ──
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

কাজ ৪ — Confidence (০.০ - ১.০): তথ্যের নির্ভরযোগ্যতা।

Output শুধু JSON:
{
  "title_bn": "string",
  "content_bn": "string",
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
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.title_bn || !parsed.content_bn) return null;
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

async function fetchPexelsImage(query: string) {
  const key = await vaultKey("PEXELS_API_KEY");
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
  } catch { return null; }
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
    const fresh = unique.slice(0, MAX_PER_RUN);
    let published = 0, pending = 0, duplicates = 0, skipped = 0;

    for (const item of fresh) {
      if (await sourceUrlExists(item.link)) { duplicates++; continue; }
      const rewritten = await aiRewrite(groqKey, item);
      if (!rewritten) { skipped++; continue; }

      const isSensitive = rewritten.sensitivity >= SENSITIVITY_THRESHOLD || rewritten.category_key === "politics";
      const finalStatus = isSensitive ? "pending" : "published";
      const image = await fetchPexelsImage(`${rewritten.category_key} bangladesh`);

      const { error } = await supabase.from("articles").insert({
        title_bn: rewritten.title_bn.slice(0, 250),
        title_en: "", content_bn: rewritten.content_bn, content_en: "",
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
