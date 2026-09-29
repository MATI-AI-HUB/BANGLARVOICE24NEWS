export const NEWSROOM_CONTRACT_VERSION = '1.0.0' as const;

export const PLATFORM_ROLES = ['reader', 'reporter', 'editor', 'admin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ARTICLE_WORKFLOW = [
  'draft',
  'submitted',
  'approved',
  'published',
  'retracted',
] as const;
export type ArticleWorkflowStatus = (typeof ARTICLE_WORKFLOW)[number];

export const ARTICLE_ORIGINS = ['aggregated', 'original'] as const;
export type ArticleOrigin = (typeof ARTICLE_ORIGINS)[number];

export interface SourceRecord {
  id: string;
  name: string;
  logo_url: string;
  feed_url: string;
  licence_note: string;
  enabled: boolean;
  interval_minutes: number;
  etag: string | null;
  last_modified: string | null;
  kill_switch: boolean;
}

export interface PublicArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image_url: string;
  image_credit: string;
  image_license: string;
  source_id: string | null;
  source_name: string;
  source_logo_url: string;
  source_url: string;
  canonical_url: string;
  published_at: string | null;
  status: ArticleWorkflowStatus | string;
  origin: ArticleOrigin;
  is_fallback: boolean;
}

export interface HealthPayload {
  status: 'ok' | 'stale' | 'error' | 'degraded';
  timestamp: string;
  last_success_at: string | null;
  published: number;
  stale: boolean;
  ingest_configured: boolean;
  supabase_configured: boolean;
}

export const PUBLIC_ARTICLE_FIELDS = [
  'id',
  'title',
  'excerpt',
  'category',
  'image_url',
  'image_credit',
  'image_license',
  'source_id',
  'source_name',
  'source_logo_url',
  'source_url',
  'canonical_url',
  'published_at',
  'status',
  'origin',
  'is_fallback',
] as const;
