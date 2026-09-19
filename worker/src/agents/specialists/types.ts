// =============================================================================
// specialists/types.ts — shared types for section-specialist fact-check agents.
// =============================================================================

import type { DraftArticle } from "../types.js";

export type SectionKey =
  | "politics"
  | "sports"
  | "health"
  | "economics"
  | "international"
  | "national"
  | "technology"
  | "entertainment";

export interface CheckResult {
  score: number;      // 0.00 - 1.00
  reason: string;
  details?: Record<string, unknown>;
}

export interface SpecialistVerdict {
  section: SectionKey;
  specialist: string;

  // Six checks (each 0.00 - 1.00)
  multiSource: CheckResult;
  imageMatch: CheckResult;
  videoMatch: CheckResult;
  location: CheckResult;
  datetime: CheckResult;
  rewriterQuality: CheckResult;

  // Composite
  compositeScore: number;   // 0 - 100
  decision: "auto_publish" | "review" | "reject";
  decisionReason: string;

  // Meta
  providerUsed?: string;
  latencyMs: number;
  costUsd: number;
}

export interface SpecialistInput {
  draft: DraftArticle;
  section: SectionKey;
}
