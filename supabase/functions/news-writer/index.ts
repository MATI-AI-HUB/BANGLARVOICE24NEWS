import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const AI_MODEL = "openai/gpt-oss-120b";
const AI_GATEWAY = `${SUPABASE_URL}/functions/v1/ai-gateway`;

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
  excerpt_bn: string;
  category_key: CategoryKey;
  confidence: number;
};

class TransientAiError extends Error {
  readonly retryable = true as const;

  constructor(message: string) {
    super(message);
    this.name = "TransientAiError";
  }
}

const MAX_AI_ATTEMPTS = 3;
const MAX_QUEUE_ATTEMPTS = 3;
const FRESHNESS_MS = 24 * 60 * 60 * 1000;

function isRetryableError(error: unknown): boolean {
  if (error instanceof TransientAiError) return true;

  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError" || name === "TimeoutError") return true;

  const message = error instanceof Error ? error.message : String(error);
  if (
    /AbortError|TimeoutError|timed?\s*out|network|ECONNRESET|ETIMEDOUT|fetch failed|Failed to fetch/i
      .test(message)
  ) {
    return true;
  }

  if (/AI (?:HTTP|gateway HTTP) 429\b/.test(message)) return true;
  if (/AI (?:HTTP|gateway HTTP) 5\d\d\b/.test(message)) return true;
  if (
    /AI (?:HTTP|gateway HTTP) 400\b/.test(message) &&
    /json|schema|validat|failed_generation|response_format/i.test(message)
  ) {
    return true;
  }

  return false;
}

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

async function rewriteOnce(item: QueueItem): Promise<Rewrite> {
  const system = `তুমি বাংলার ভয়েসের সংবাদ সহকারী।

কঠোর নিয়ম:
1. শুধু প্রদত্ত উৎসের শিরোনাম ও বিবরণে থাকা তথ্য ব্যবহার করবে।
2. কোনো নতুন নাম, সংখ্যা, স্থান, সময়, অভিযোগ বা কারণ যোগ করবে না।
3. অনিশ্চিত তথ্যকে নিশ্চিত হিসেবে লিখবে না।
4. content_bn 180-400 শব্দের পূর্ণ বাংলা সংবাদ; লিড ও আরও ৩-৫ অনুচ্ছেদ; কমপক্ষে ৪৫০ বাংলা অক্ষর।
5. title_bn 8-14 শব্দ; ক্লিকবেট নয়।
6. excerpt_bn 20-40 শব্দের সারাংশ; নতুন তথ্য যোগ করবে না।
7. শেষে শুধু এই বাক্য থাকবে: "সূত্র: ${item.source_name}"
8. category_key অবশ্যই এই তালিকার একটি:
national | politics | economy | sports | entertainment | tech | health | education | international | city
9. শুধু JSON ফেরত দেবে।

JSON:
{
  "title_bn": "string",
  "content_bn": "string",
  "excerpt_bn": "string",
  "category_key": "string",
  "confidence": 0.0
}`;

  const user = `উৎস: ${item.source_name}
উৎসের শিরোনাম: ${item.title}
উৎসের বিবরণ: ${item.description}`;

  let response: Response;
  try {
    response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        task: "news_rewrite",
        model: AI_MODEL,
        temperature: 0.2,
        max_tokens: 1600,
        metadata: {
          json_mode: true,
          json_schema: {
              type: "object",
              properties: {
                title_bn: {
                  type: "string",
                  description: "Concise Bangla news headline, 8-14 words",
                },
                content_bn: {
                  type: "string",
                  description: "Complete Bangla news article body, 180-400 words",
                },
                excerpt_bn: {
                  type: "string",
                  description: "Short Bangla summary, 20-40 words",
                },
                category_key: {
                  type: "string",
                  enum: CATEGORY_ENUM,
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                },
              },
              required: [
                "title_bn",
                "content_bn",
                "excerpt_bn",
                "category_key",
                "confidence",
              ],
              additionalProperties: false,
            },
          },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(18000),
    });
  } catch (error) {
    if (isRetryableError(error)) {
      throw error instanceof TransientAiError
        ? error
        : new TransientAiError(
          error instanceof Error ? error.message : String(error),
        );
    }
    throw error;
  }

  if (!response.ok) {
    const errorBody = (await response.text()).slice(0, 800);
    const message =
      `AI gateway HTTP ${response.status}: ${errorBody}`;
    const retryableStatus =
      response.status === 429 ||
      response.status >= 500 ||
      (response.status === 400 &&
        /json|schema|validat|failed_generation|response_format/i.test(errorBody));
    if (retryableStatus) {
      throw new TransientAiError(message);
    }
    throw new Error(message);
  }

  const data = await response.json();
  const raw = String(data?.answer || "")
    .replace(/```json\s*|\s*```/g, "")
    .trim();

  let parsed: Rewrite;
  try {
    parsed = JSON.parse(raw) as Rewrite;
  } catch (error) {
    const finishReason = String(data?.error || "unknown");
    throw new TransientAiError(
      `AI gateway returned invalid JSON (finish_reason=${finishReason}, chars=${raw.length}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (
    !parsed.title_bn ||
    !parsed.content_bn ||
    parsed.content_bn.length < 450
  ) {
    throw new TransientAiError("AI output is incomplete");
  }

  parsed.excerpt_bn = String(parsed.excerpt_bn || "").trim();
  if (!parsed.excerpt_bn) {
    parsed.excerpt_bn = parsed.content_bn.slice(0, 160).trim();
  }

  if (!CATEGORY_ENUM.includes(parsed.category_key)) {
    parsed.category_key = "national";
  }

  parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));

  return parsed;
}

async function rewrite(item: QueueItem): Promise<Rewrite> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt += 1) {
    try {
      return await rewriteOnce(item);
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === MAX_AI_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

/**
 * Pexels is used only for representative media.
 *
 * A Pexels photo must never be described as the actual event photo.
 * The frontend must display image_credit with a representative-image label.
 */
const CATEGORY_MEDIA_QUERIES: Record<CategoryKey, string[]> = {
  national: [
    "bangladesh city",
    "dhaka street",
    "bangladesh people",
    "bangladesh landscape",
  ],
  politics: [
    "government building",
    "parliament building",
    "press conference",
    "official meeting",
  ],
  economy: [
    "business finance",
    "banking",
    "trade commerce",
    "stock market",
  ],
  sports: [
    "cricket match",
    "football stadium",
    "sports arena",
    "athlete running",
  ],
  entertainment: [
    "concert stage",
    "cinema theatre",
    "cultural festival",
    "music performance",
  ],
  tech: [
    "technology computer",
    "digital innovation",
    "software development",
    "smartphone technology",
  ],
  health: [
    "hospital doctor",
    "medical care",
    "health wellness",
    "medical laboratory",
  ],
  education: [
    "students classroom",
    "university library",
    "school books",
    "study desk",
  ],
  international: [
    "world news",
    "global affairs",
    "united nations",
    "international diplomacy",
  ],
  city: [
    "urban street",
    "city skyline",
    "public transport",
    "neighborhood city",
  ],
};

type PexelsImage = {
  url: string;
  credit: string;
};

const usedPexelsPhotoIds = new Set<number>();

async function imageUsedBefore(url: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("articles")
    .select("id")
    .eq("thumbnail_url", url)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("PEXELS_DUPLICATE_CHECK_FAILED", {
      message: error.message,
    });
    return false;
  }

  return Boolean(data);
}

/**
 * Returns one unused landscape Pexels image.
 *
 * This function fails closed: an unavailable secret, API, or network returns
 * null and does not block the article-writing pipeline.
 */
async function fetchPexelsImage(
  category: CategoryKey,
): Promise<PexelsImage | null> {
  const key = await vaultKey("PEXELS_API_KEY");

  if (!key) {
    console.warn("PEXELS_API_KEY_NOT_AVAILABLE");
    return null;
  }

  const queries =
    CATEGORY_MEDIA_QUERIES[category] ||
    CATEGORY_MEDIA_QUERIES.national;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const query = queries[Math.floor(Math.random() * queries.length)];
    const page = Math.floor(Math.random() * 5) + 1;

    try {
      const params = new URLSearchParams({
        query,
        per_page: "10",
        page: String(page),
        orientation: "landscape",
      });

      const response = await fetch(
        `https://api.pexels.com/v1/search?${params.toString()}`,
        {
          headers: {
            Authorization: key,
          },
          signal: AbortSignal.timeout(7000),
        },
      );

      if (!response.ok) {
        console.warn("PEXELS_HTTP_ERROR", {
          status: response.status,
        });
        continue;
      }

      const payload = await response.json();
      const photos = Array.isArray(payload?.photos)
        ? payload.photos
        : [];

      for (const photo of photos.sort(() => Math.random() - 0.5)) {
        const photoId = Number(photo?.id);
        const url = String(
          photo?.src?.large ||
          photo?.src?.original ||
          "",
        );

        if (!Number.isFinite(photoId) || !url) continue;
        if (usedPexelsPhotoIds.has(photoId)) continue;
        if (await imageUsedBefore(url)) continue;

        usedPexelsPhotoIds.add(photoId);

        const photographer = String(
          photo?.photographer || "Unknown photographer",
        ).trim();

        const photoPage = String(
          photo?.url || "https://www.pexels.com",
        );

        return {
          url,
          credit:
            `প্রতীকী ছবি — ${photographer} / Pexels (${photoPage})`,
        };
      }
    } catch (error) {
      console.warn("PEXELS_LOOKUP_FAILED", {
        message: error instanceof Error
          ? error.message
          : String(error),
      });
    }
  }

  return null;
}
Deno.serve(async () => {
  const started = Date.now();
  const now = new Date().toISOString();
  const freshSince = new Date(Date.now() - FRESHNESS_MS).toISOString();

  let processed = 0;
  let published = 0;
  let pendingReview = 0;
  let skipped = 0;
  let failed = 0;
  let claimedId: string | null = null;
  let claimedAttempts = 0;

  try {
    const { data: candidates, error: candidateError } = await supabase
      .from("news_ingest_queue")
      .select("*")
      .eq("status", "queued")
      .gte("created_at", freshSince)
      .order("created_at", { ascending: false })
      .limit(1);

    if (candidateError) {
      throw new Error(`Queue lookup failed: ${candidateError.message}`);
    }

    const item = candidates?.[0] ?? null;

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

    const queueItem = item as QueueItem;

    const { data: lockedItem, error: lockError } = await supabase
      .from("news_ingest_queue")
      .update({
        status: "processing",
        locked_at: now,
        locked_by: "news-writer",
        attempts: (queueItem.attempts || 0) + 1,
        updated_at: now,
      })
      .eq("id", queueItem.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (lockError) {
      throw new Error(`Queue lock failed: ${lockError.message}`);
    }

    if (!lockedItem) {
      return json({
        ok: true,
        stage: "writer",
        message: "Queue item was claimed by another worker",
      });
    }

    claimedId = String(lockedItem.id);
    claimedAttempts = Number(lockedItem.attempts) || Number(queueItem.attempts) || 1;
    processed = 1;

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
      const rewritten = await rewrite(queueItem);
      const publishDecision = decision(
        rewritten.title_bn,
        rewritten.content_bn,
        rewritten.category_key,
      );

      const image = await fetchPexelsImage(rewritten.category_key);

      const { data: article, error: insertError } = await supabase
        .from("articles")
        .insert({
          title_bn: rewritten.title_bn.slice(0, 250),
          title_en: "",
          content_bn: rewritten.content_bn,
          content_en: "",
          excerpt_bn: rewritten.excerpt_bn.slice(0, 400),
          category: rewritten.category_key,
          category_key: rewritten.category_key,

          status: publishDecision.status,
          editorial_status: publishDecision.editorial_status,
          verification_status:
            publishDecision.status === "published" ? "auto_verified" : "pending",
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

          thumbnail_url: image?.url || "",
          featured_image: image?.url || "",
          image_alt_bn: image
            ? `প্রতীকী ছবি: ${rewritten.title_bn.slice(0, 180)}`
            : "",
          image_credit: image?.credit || "",
          image_is_representational: Boolean(image),
          media_type: image ? "image" : "none",

          ai_model: "ai-gateway/news_rewrite",
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
        provider: "ai-gateway",
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
    const shouldRequeue =
      Boolean(claimedId) &&
      isRetryableError(error) &&
      claimedAttempts < MAX_QUEUE_ATTEMPTS;

    if (claimedId) {
      try {
        await supabase
          .from("news_ingest_queue")
          .update(
            shouldRequeue
              ? {
                status: "queued",
                locked_at: null,
                locked_by: null,
                last_error: message.slice(0, 2000),
                updated_at: new Date().toISOString(),
              }
              : {
                status: "failed",
                locked_at: null,
                locked_by: null,
                last_error: message.slice(0, 2000),
                updated_at: new Date().toISOString(),
              },
          )
          .eq("id", claimedId);
      } catch {
        // Preserve primary failure response.
      }
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
