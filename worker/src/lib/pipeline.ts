import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "../config.js";

export const MAX_PUBLISH_PER_CYCLE = 20;
export const MAX_PROCESS_PER_CYCLE = 80;
export const HEALTH_STALE_HOURS = 6;
export const RATE_LIMIT_PER_HOUR = 40;

export async function rateLimitOk(cfg: WorkerConfig): Promise<{ ok: boolean; publishedLastHour: number }> {
  const client = supabaseAdmin(cfg);
  if (!client) return { ok: true, publishedLastHour: 0 };
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await client
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gte("published_at", since);
  if (error) return { ok: true, publishedLastHour: 0 };
  const publishedLastHour = count ?? 0;
  return { ok: publishedLastHour < RATE_LIMIT_PER_HOUR, publishedLastHour };
}

export function contentHash(sourceUrl: string, title: string, body: string): string {
  const canonical = `${sourceUrl.trim().toLowerCase()}|${title.trim()}|${body.trim()}`;
  return createHash("sha256").update(canonical).digest("hex");
}

export function supabaseAdmin(cfg: WorkerConfig): SupabaseClient | null {
  if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) return null;
  return createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function logPipelineRun(
  cfg: WorkerConfig,
  row: {
    stage: string;
    status: string;
    fetched?: number;
    queued?: number;
    processed?: number;
    published?: number;
    pending_review?: number;
    skipped?: number;
    failed?: number;
    duration_ms?: number;
    details?: Record<string, unknown>;
    error_message?: string;
  },
): Promise<void> {
  const client = supabaseAdmin(cfg);
  if (!client) {
    console.log(`[pipeline_runs] ${row.stage} ${row.status}`, row.error_message ?? "");
    return;
  }
  const { error } = await client.from("news_pipeline_runs").insert({
    stage: row.stage,
    status: row.status,
    fetched: row.fetched ?? 0,
    queued: row.queued ?? 0,
    processed: row.processed ?? 0,
    published: row.published ?? 0,
    pending_review: row.pending_review ?? 0,
    skipped: row.skipped ?? 0,
    failed: row.failed ?? 0,
    duration_ms: row.duration_ms ?? 0,
    details: row.details ?? {},
    error_message: row.error_message ?? null,
    completed_at: new Date().toISOString(),
  });
  if (error) console.error("[pipeline_runs] insert failed:", error.message);
}

export async function sourceAlreadyPublished(
  cfg: WorkerConfig,
  sourceUrl: string,
  hash: string,
): Promise<boolean> {
  const client = supabaseAdmin(cfg);
  if (!client) return false;
  if (sourceUrl) {
    const { data } = await client
      .from("articles")
      .select("id")
      .eq("source_url", sourceUrl)
      .maybeSingle();
    if (data) return true;
  }
  if (hash) {
    const { data } = await client
      .from("articles")
      .select("id")
      .eq("content_hash", hash)
      .maybeSingle();
    if (data) return true;
  }
  return false;
}

export async function lastSuccessfulRunAt(cfg: WorkerConfig): Promise<string | null> {
  const client = supabaseAdmin(cfg);
  if (!client) return null;
  const { data } = await client
    .from("news_pipeline_runs")
    .select("completed_at, created_at")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.completed_at || data?.created_at || null;
}

export function isStale(iso: string | null, now = Date.now(), hours = HEALTH_STALE_HOURS): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  return now - t > hours * 60 * 60 * 1000;
}
