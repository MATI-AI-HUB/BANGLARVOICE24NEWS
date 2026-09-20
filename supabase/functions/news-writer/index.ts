import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const AI_MODEL = "llama-3.3-70b-versatile";
const AI_BASE = "https://api.groq.com/openai/v1";

type CategoryKey =
  | "national"
  | "politics"
  | "economy"
  | "sports"
  | "entertainment"
  | "tech"
  | "health"
  | "education"
  | "international"
  | "city";

type QueueItem = {
  id: string;
  source_name: string;
  source_url: string;
  source_published_at: string | null;
  title: string;
  description: string;
  category_hint: string | null;
  attempts: number;
};

type Rewrite = {
  title_bn: string;
  content_bn: string;
  category_key: CategoryKey;
  confidence: number;
};

type Decision = {
  risk_level: "low" | "high" | "critical";
  status: "published" | "pending";
  editorial_status: "auto_published" | "pending_review";
  review_reason: string | null;
};

const CATEGORY_ENUM: CategoryKey[] = [
  "national",
  "politics",
  "economy",
  "sports",
  "entertainment",
  "tech",
  "health",
  "education",
  "international",
  "city",
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function decision(title: string, content: string, category: CategoryKey): Decision {
  const text = `${title} ${content}`.toLowerCase();

  const critical = [
    "ধর্ষণ",
    "যৌন নির্যাতন",
    "শিশু নির্যাতন",
    "শিশুকে হত্যা",
    "আত্মহত্যা",
    "সাম্প্রদায়িক",
    "সাম্প্রদায়িক",
    "গণহত্যা",
    "যুদ্ধাপরাধ",
  ];

  const high = [
    "হত্যা",
    "নিহত",
    "মৃত",
    "মৃত্যু",
    "যুদ্ধ",
    "হামলা",
    "বিস্ফোরণ",
    "বোমা",
    "ককটেল",
    "গ্রেপ্তার",
    "আদালত",
    "রায়",
    "রায়",
    "জামিন",
    "নির্বাচন",
    "ভোট",
    "মহামারি",
    "হাম",
    "স্বাস্থ্য",
    "আক্রান্ত",
    "ব্যাংক",
    "মুদ্রা",
    "নিষেধাজ্ঞা",
  ];

  if (critical.some((term) => text.includes(term))) {
    return {
      risk_level: "critical",
      status: "pending",
      editorial_status: "pending_review",
      review_reason: "Critical or sensitive subject requires senior human review",
    };
  }

  if (
    ["national", "politics", "health", "economy", "international"].includes(category) ||
    high.some((term) => text.includes(term))
  ) {
    return {
      risk_level: "high",
      status: "pending",
      editorial_status: "pending_review",
      review_reason: "High-impact subject requires human editorial review",
    };
  }

  return {
    risk_level: "low",
    status: "published",
    editorial_status: "auto_published",
    review_reason: null,
  };
}

async function vaultKey(serviceName: string): Promise<string | null> {
  const { data: row } = await supabase
    .from("api_vault")
    .select("key_encrypted")
    .eq("service_name", serviceName)
    .eq("is_active", true)
    .maybeSingle();

  if (!row?.key_encrypted) return null;

  const { data } = await supabase.rpc("decrypt_vault_secret", {
    p_secret_id: row.key_encrypted,
  });

  return typeof data === "string" && data.length > 0 ? data : null;
}

async function rewrite(groqKey: string, item: QueueItem): Promise<Rewrite> {
  const system = `তুমি বাংলার ভয়েসের সংবাদ সহকারী।

কঠোর নিয়ম:
1. শুধু প্রদত্ত উৎসের শিরোনাম ও বিবরণে থাকা তথ্য ব্যবহার করবে।
2. কোনো নতুন নাম, সংখ্যা, স্থান, সময়, অভিযোগ বা কারণ যোগ করবে না।
3. অনিশ্চিত তথ্যকে নিশ্চিত হিসেবে লিখবে না।
4. 120-220 শব্দের মধ্যে সংক্ষিপ্ত বাংলা সংবাদ লিখবে।
5. শিরোনাম 8-14 শব্দ; ক্লিকবেট নয়।
6. শেষে শুধু এই বাক্য থাকবে: "সূত্র: ${item.source_name}"
7. category_key অবশ্যই এই তালিকার একটি:
national | politics | economy | sports | entertainment | tech | health | education | international | city
8. শুধু JSON ফেরত দেবে।

JSON:
{
  "title_bn": "string",
  "content_bn": "string",
  "category_key": "string",
  "confidence": 0.0
}`;

  const user = `উৎস: ${item.source_name}
উৎসের শিরোনাম: ${item.title}
উৎসের বিবরণ: ${item.description}`;

  const response = await fetch(`${AI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(18000),
  });

  if (!response.ok) {
    throw new Error(`AI HTTP ${response.status}`);
  }

  const data = await response.json();
  const raw = String(data?.choices?.[0]?.message?.content || "")
    .replace(/```json\s*|\s*```/g, "")
    .trim();

  const parsed = JSON.parse(raw) as Rewrite;

  if (
    !parsed.title_bn ||
    !parsed.content_bn ||
    parsed.content_bn.length < 180
  ) {
    throw new Error("AI output is incomplete");
  }

  if (!CATEGORY_ENUM.includes(parsed.category_key)) {
    parsed.category_key = "national";
  }

  parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));

  return parsed;
}

Deno.serve(async () => {
  const started = Date.now();
  const now = new Date().toISOString();

  let processed = 0;
  let published = 0;
  let pendingReview = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const { data: item, error: claimError } = await supabase
      .from("news_ingest_queue")
      .update({
        status: "processing",
        locked_at: now,
        locked_by: "news-writer",
        attempts: 1,
        updated_at: now,
      })
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .select("*")
      .limit(1)
      .maybeSingle();

    if (claimError) throw new Error(`Queue claim failed: ${claimError.message}`);

    if (!item) {
      await supabase.from("news_pipeline_runs").insert({
        stage: "writer",
        status: "success",
        duration_ms: Date.now() - started,
        details: { message: "No queued items" },
        completed_at: new Date().toISOString(),
      });

      return json({ ok: true, stage: "writer", message: "No queued items" });
    }

    processed = 1;

    const queueItem = item as QueueItem;

    const { data: existing } = await supabase
      .from("articles")
      .select("id")
      .eq("source_url", queueItem.source_url)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("news_ingest_queue")
        .update({
          status: "skipped",
          article_id: existing.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueItem.id);

      skipped = 1;
    } else {
      const groqKey = await vaultKey("GROQ_API_KEY");

      if (!groqKey) {
        throw new Error("GROQ_API_KEY not available in api_vault");
      }

      const rewritten = await rewrite(groqKey, queueItem);
      const publishDecision = decision(
        rewritten.title_bn,
        rewritten.content_bn,
        rewritten.category_key,
      );

      const { data: article, error: insertError } = await supabase
        .from("articles")
        .insert({
          title_bn: rewritten.title_bn.slice(0, 250),
          title_en: "",
          content_bn: rewritten.content_bn,
          content_en: "",
          category: rewritten.category_key,
          category_key: rewritten.category_key,

          status: publishDecision.status,
          editorial_status: publishDecision.editorial_status,
          verification_status: "pending",
          human_verified: false,
          risk_level: publishDecision.risk_level,
          review_reason: publishDecision.review_reason,

          source_type: "syndicated",
          source_language: "bn",
          source_name: queueItem.source_name,
          source_url: queueItem.source_url,
          canonical_url: queueItem.source_url,
          source_published_at: queueItem.source_published_at,

          fact_sources: [
            {
              name: queueItem.source_name,
              url: queueItem.source_url,
              type: "publisher",
              checked_at: new Date().toISOString(),
              claim_scope: "RSS source item",
            },
          ],
          claims: [],
          context_blocks: [],

          thumbnail_url: "",
          featured_image: "",
          image_alt_bn: "",
          image_credit: "",
          image_is_representational: false,
          media_type: "none",

          ai_model: AI_MODEL,
          ai_confidence: rewritten.confidence,

          published_at:
            publishDecision.status === "published"
              ? new Date().toISOString()
              : null,
        })
        .select("id")
        .single();

      if (insertError) throw new Error(`Article insert failed: ${insertError.message}`);

      await supabase
        .from("news_ingest_queue")
        .update({
          status:
            publishDecision.status === "published"
              ? "published"
              : "pending_review",
          article_id: article.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueItem.id);

      await supabase.from("ai_audit_log").insert({
        model: AI_MODEL,
        provider: "groq",
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        latency_ms: Date.now() - started,
        status: "success",
      });

      if (publishDecision.status === "published") {
        published = 1;
      } else {
        pendingReview = 1;
      }
    }

    await supabase.from("news_pipeline_runs").insert({
      stage: "writer",
      status: "success",
      processed,
      published,
      pending_review: pendingReview,
      skipped,
      failed,
      duration_ms: Date.now() - started,
      completed_at: new Date().toISOString(),
    });

    return json({
      ok: true,
      stage: "writer",
      processed,
      published,
      pending_review: pendingReview,
      skipped,
    });
  } catch (error) {
    const message = String(error);
    failed = 1;

    try {
      await supabase
        .from("news_ingest_queue")
        .update({
          status: "failed",
          last_error: message.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq("status", "processing")
        .eq("locked_by", "news-writer");
    } catch {
      // Preserve primary failure response.
    }

    try {
      await supabase.from("news_pipeline_runs").insert({
        stage: "writer",
        status: "failed",
        processed,
        published,
        pending_review: pendingReview,
        skipped,
        failed,
        duration_ms: Date.now() - started,
        error_message: message.slice(0, 2000),
        completed_at: new Date().toISOString(),
      });
    } catch {
      // Preserve primary failure response.
    }

    return json({ ok: false, stage: "writer", error: message }, 500);
  }
});
