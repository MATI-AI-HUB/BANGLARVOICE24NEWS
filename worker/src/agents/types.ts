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
  aiScore: number; // 0-100 fact-check confidence
  aiSummary: string; // 3-bullet Bangla summary
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