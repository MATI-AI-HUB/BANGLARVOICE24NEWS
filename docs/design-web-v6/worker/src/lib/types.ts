/**
 * Banglar Voice — shared pipeline types.
 *
 * Every collected story flows through the state machine:
 *   collected → rewritten → media_attached → pending_approval
 *            → approved → published → broadcast
 *
 * The editorial gate is human-in-the-loop: nothing is published or broadcast
 * unless (a) an editor approves it (via the Admin Console or a Telegram
 * /approve command) or (b) AUTO_PUBLISH=true is explicitly set.
 */

export type PipelineState =
  | 'collected'
  | 'rewritten'
  | 'media_attached'
  | 'pending_approval'
  | 'approved'
  | 'published'
  | 'broadcast'
  | 'rejected'
  | 'failed';

export type NewsCategory =
  | 'national'
  | 'politics'
  | 'economy'
  | 'international'
  | 'sports'
  | 'technology'
  | 'entertainment'
  | 'general';

export type MediaKind = 'image' | 'video';

export type MediaAttribution = {
  /** Human-readable creator / institution (e.g. "NASA", "Wikimedia Commons"). */
  author: string;
  /** License short name (e.g. "CC0", "CC BY 4.0", "Pexels License"). */
  license: string;
  /** Direct license / source-page URL for attribution. */
  url: string;
  /** Title of the work (may be empty). */
  title?: string;
};

export type MediaAttachment = {
  id: string;
  kind: MediaKind;
  /** Direct file URL (Wikimedia thumbs, Openverse image, Pexels photo). */
  url: string;
  /** Prefer https (CC0 providers are https-only). */
  thumbnail_url?: string;
  width?: number;
  height?: number;
  alt_text?: string;
  attribution: MediaAttribution;
  /** Query used to source it (for audit). */
  sourced_from: string;
};

/** Copyright-safe rewritten story. */
export type RewrittenStory = {
  headline: string;
  /** Standfirst / lead paragraph. */
  dek: string;
  /** Body paragraphs. */
  body: string[];
  /** Extracted topic keywords (used for media + social). */
  keywords: string[];
  /** How it was produced: 'ai' | 'fallback'. */
  method: 'ai' | 'fallback';
  /** SHA-256 of the raw source title+description (audit trail). */
  source_hash: string;
};

/** A full pipeline item (mirrors a newsroom_queue row in Supabase). */
export type PipelineItem = {
  id: string;
  slug: string;
  state: PipelineState;
  original_title?: string;
  original_link?: string;
  source_label?: string;
  source_category?: NewsCategory;
  /** AI/fallback rewritten story. */
  rewritten?: RewrittenStory;
  media: MediaAttachment[];
  /** Set when approved (editor user id or telegram). */
  approved_by?: string;
  approved_at?: string;
  published_at?: string;
  broadcast: Record<string, BroadcastResult>;
  error?: string;
  collected_at: string;
  updated_at: string;
};

export type BroadcastPlatform =
  | 'website'
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'telegram';

export type BroadcastResult = {
  platform: BroadcastPlatform;
  ok: boolean;
  /** External post id / URL when available. */
  ref?: string;
  skipped?: boolean;
  skipped_reason?: string;
  error?: string;
  at?: string;
};

/** Row shape returned by the app ingest API / newsroom_queue select. */
export type QueueRow = {
  id: string;
  slug: string;
  status: string;
  title?: string | null;
  dek?: string | null;
  category?: string | null;
  body?: unknown;
  source?: string | null;
  image_url?: string | null;
  agent?: string | null;
  created_at?: string;
};
