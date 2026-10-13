import type { WorkerConfig } from "../config.js";
import type { DraftArticle } from "../agents/types.js";
import { contentHash, supabaseAdmin } from "./pipeline.js";
import { computeRiskLevel } from "./publish-gate.js";

export interface PublishResult {
  ok: boolean;
  url?: string;
  error?: string;
  id?: string;
  status?: string;
  duplicate?: boolean;
}

const CATEGORY_ENUM = new Set([
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
]);

const CATEGORY_ALIAS: Record<string, string> = {
  technology: "tech",
  tech: "tech",
  business: "economy",
};

function mapCategory(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return "national";
  const aliased = CATEGORY_ALIAS[key] || key;
  return CATEGORY_ENUM.has(aliased) ? aliased : "national";
}

function mapStatus(raw: string): {
  status: "published" | "pending" | "archived";
  editorial_status: "auto_published" | "pending_review";
  published_at: string | null;
} {
  const value = raw.trim().toLowerCase();
  if (value === "published") {
    return {
      status: "published",
      editorial_status: "auto_published",
      published_at: new Date().toISOString(),
    };
  }
  if (value === "rejected" || value === "archived") {
    return {
      status: "archived",
      editorial_status: "pending_review",
      published_at: null,
    };
  }
  return {
    status: "pending",
    editorial_status: "pending_review",
    published_at: null,
  };
}

function isUniqueViolation(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("duplicate key") || m.includes("unique constraint") || m.includes("23505");
}

function articleUrl(cfg: WorkerConfig, id: string): string | undefined {
  if (!cfg.bvBaseUrl) return undefined;
  return `${cfg.bvBaseUrl}/article/${id}`;
}

export function sourceLabelFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    return host || "সূত্র";
  } catch {
    return "সূত্র";
  }
}

export async function publishViaSupabase(cfg: WorkerConfig, draft: DraftArticle): Promise<PublishResult | null> {
  const client = supabaseAdmin(cfg);
  if (!client) return null;
  const rewriteIsFallback = draft.fallback || draft.rewriteMethod === "fallback";
  if (rewriteIsFallback && draft.status === "published") {
    return { ok: false, error: "fallback_not_publishable" };
  }

  const hash = contentHash(draft.raw.link, draft.titleBn, draft.contentBn);
  const sourceUrl = draft.raw.link.trim();
  const mapped = rewriteIsFallback ? mapStatus("pending") : mapStatus(draft.status);
  const category = mapCategory(draft.raw.sourceCategory);
  const representational =
    draft.imageSource === "pexels" ||
    draft.imageSource === "brand" ||
    Boolean((draft as { imageRepresentational?: boolean }).imageRepresentational);
  const now = new Date().toISOString();
  const imageUrl =
    (draft.imageUrl || "").trim() ||
    "https://www.banglarvoice24news.com/banglar-voice-logo.png";
  const imageCredit = (draft.imageAlt || "").trim() || "বাংলার ভয়েস";

  if (sourceUrl) {
    const { data: existing } = await client
      .from("articles")
      .select("id, status")
      .eq("source_url", sourceUrl)
      .maybeSingle();
    if (existing) {
      return {
        ok: true,
        id: existing.id,
        status: existing.status,
        duplicate: true,
        url: articleUrl(cfg, existing.id),
      };
    }
  }

  const { data: hashed } = await client
    .from("articles")
    .select("id, status")
    .eq("content_hash", hash)
    .maybeSingle();
  if (hashed) {
    return {
      ok: true,
      id: hashed.id,
      status: hashed.status,
      duplicate: true,
      url: articleUrl(cfg, hashed.id),
    };
  }

  const { data, error } = await client
    .from("articles")
    .insert({
      title_bn: draft.titleBn.slice(0, 250),
      title_en: "",
      content_bn: draft.contentBn,
      content_en: "",
      excerpt_bn: draft.excerptBn.slice(0, 400),
      category,
      category_key: category,
      status: mapped.status,
      editorial_status: mapped.editorial_status,
      verification_status: mapped.status === "published" ? "auto_verified" : "pending",
      human_verified: false,
      source_type: "syndicated",
      source_language: "bn",
      source_name: sourceLabelFromUrl(sourceUrl),
      source_url: sourceUrl || null,
      canonical_url: sourceUrl || null,
      content_hash: hash,
      thumbnail_url: imageUrl,
      featured_image: imageUrl,
      image_alt_bn: imageCredit.slice(0, 250),
      image_credit: imageCredit.slice(0, 250),
      image_license: (draft.imageLicense || "").slice(0, 120),
      image_is_representational: representational,
      is_fallback: draft.imageSource === "brand" || rewriteIsFallback,
      origin: "aggregated",
      risk_level:
        draft.riskLevel ||
        computeRiskLevel(draft.titleBn, draft.contentBn, draft.raw.sourceCategory).level,
      review_reason: draft.reviewReason || null,
      media_type: imageUrl ? "image" : "none",
      ai_confidence: Math.max(0, Math.min(1, draft.aiScore / 100)),
      ai_model: draft.rewriteMethod === "ai" ? "chat" : "",
      fact_sources: sourceUrl
        ? [
            {
              name: "worker",
              url: sourceUrl,
              type: "publisher",
              checked_at: now,
              image_license: draft.imageLicense,
              image_source: draft.imageSource,
            },
          ]
        : [],
      source_published_at: draft.raw.publishedAt || null,
      published_at: mapped.published_at,
      updated_at: now,
    })
    .select("id, status")
    .single();

  if (error) {
    if (isUniqueViolation(error.message)) {
      const { data: raced } = await client
        .from("articles")
        .select("id, status")
        .eq("source_url", sourceUrl)
        .maybeSingle();
      if (raced) {
        return {
          ok: true,
          id: raced.id,
          status: raced.status,
          duplicate: true,
          url: articleUrl(cfg, raced.id),
        };
      }
      return { ok: true, duplicate: true };
    }
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: "insert failed" };
  return {
    ok: true,
    id: data.id,
    status: data.status,
    url: articleUrl(cfg, data.id),
  };
}

export async function publishViaHttp(cfg: WorkerConfig, draft: DraftArticle): Promise<PublishResult> {
  if (!cfg.bvBaseUrl || !cfg.newsroomIngestKey) {
    return { ok: false, error: "ingest_disabled" };
  }
  if ((draft.fallback || draft.rewriteMethod === "fallback") && draft.status === "published") {
    return { ok: false, error: "fallback_not_publishable" };
  }
  const hash = contentHash(draft.raw.link, draft.titleBn, draft.contentBn);
  const res = await fetch(`${cfg.bvBaseUrl}/api/newsroom/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.newsroomIngestKey}`,
      "x-ingest-key": cfg.newsroomIngestKey,
    },
    body: JSON.stringify({
      title: draft.titleBn,
      content: draft.contentBn,
      excerpt: draft.excerptBn,
      tags: draft.tags,
      imageUrl:
        (draft.imageUrl || "").trim() ||
        "https://www.banglarvoice24news.com/banglar-voice-logo.png",
      imageAlt: draft.imageAlt,
      imageCredit: (draft.imageAlt || "").trim() || "বাংলার ভয়েস",
      imageLicense: draft.imageLicense,
      imageSource: draft.imageSource,
      imageRepresentational:
        draft.imageSource === "pexels" ||
        draft.imageSource === "brand" ||
        Boolean((draft as { imageRepresentational?: boolean }).imageRepresentational),
      rewriteMethod: draft.rewriteMethod,
      fallback: draft.fallback,
      aiScore: draft.aiScore,
      aiSummary: draft.aiSummary,
      sourceUrl: draft.raw.link,
      sourceName: sourceLabelFromUrl(draft.raw.link),
      sourceCategory: draft.raw.sourceCategory,
      status: draft.status,
      contentHash: hash,
      sourceText: (draft as { sourceText?: string }).sourceText || draft.raw.description,
      licenceNote: (draft as { licenceNote?: string }).licenceNote || "",
      aiSensitive: false,
      aiSensitivityFailed: false,
    }),
  });
  if (!res.ok) return { ok: false, error: `ingest ${res.status}` };
  const data = (await res.json()) as {
    id?: string;
    status?: string;
    duplicate?: boolean;
  };
  return {
    ok: true,
    id: data?.id,
    status: data?.status,
    duplicate: data?.duplicate === true,
    url: data?.id ? articleUrl(cfg, data.id) : undefined,
  };
}
