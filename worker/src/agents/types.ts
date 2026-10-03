// =============================================================================
// types.ts — shared types for the Banglar Voice AI agent pipeline.
// =============================================================================

export type AgentName =
  | "collector"
  | "rewriter"
  | "media"
  | "editor"
  | "publisher"
  | "social"
  | "supervisor";

/** A raw item collected from an RSS/Atom feed. */
export interface RawItem {
  id: string; // stable hash of title+link
  sourceUrl: string;
  sourceCategory: string;
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  imageUrl?: string;
}

export interface RewriteResult {
  titleBn: string;
  contentBn: string;
  method: "ai" | "fallback";
  fallback: boolean;
  reason?: string;
}

/** A rewritten, copyright-safe Bangla article draft. */
export interface DraftArticle {
  raw: RawItem;
  titleBn: string;
  contentBn: string;
  excerptBn: string;
  tags: string[];
  imageUrl: string;
  imageAlt: string;
  imageLicense: string;
  imageSource: string;
  rewriteMethod: "ai" | "fallback";
  fallback: boolean;
  skipReason: string | null;
  aiScore: number;
  aiSummary: string;
  riskLevel?: "low" | "medium" | "high";
  reviewReason?: string | null;
  status: "draft" | "pending_review" | "approved" | "published" | "rejected";
  duplicateOf: string | null;
  verification?: import('./specialists/types.js').SpecialistVerdict;
}

/** The pipeline state machine for one item. */
export type PipelineStage = "collected" | "rewritten" | "media" | "edited" | "published" | "rejected";

export interface PipelineState {
  itemId: string;
  stage: PipelineStage;
  updatedAt: string;
  attempts: number;
  lastError?: string;
}

/** A social broadcast result. */
export interface SocialPostResult {
  platform: string;
  ok: boolean;
  error?: string;
  postId?: string;
}

/** Supervisor decision. */
export interface SupervisorDecision {
  itemId: string;
  action: "publish" | "approve" | "reject" | "wait";
  reason: string;
  score: number;
}