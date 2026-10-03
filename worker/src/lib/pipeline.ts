import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "../config.js";

import {
  PIPELINE_INTERVAL_MINUTES,
  ITEM_MAX_AGE_MS,
  DEFAULT_MIN_AI_SCORE,
  STALE_LOCK_MS,
  type SourceFetchOutcome,
} from "./publish-gate.js";

export const MAX_PUBLISH_PER_CYCLE = 20;
export const MAX_PROCESS_PER_CYCLE = 80;
export const HEALTH_STALE_HOURS = 6;
export const RATE_LIMIT_PER_HOUR = 40;
export { ITEM_MAX_AGE_MS, PIPELINE_INTERVAL_MINUTES, STALE_LOCK_MS };
export const MIN_AI_SCORE = DEFAULT_MIN_AI_SCORE;

export function isWithinLookback(iso: string | undefined, now = Date.now(), windowMs = ITEM_MAX_AGE_MS): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  return now - t <= windowMs;
}

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

export function sourceDedupeKey(sourceUrl: string): string {
  return sourceUrl.trim().toLowerCase();
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

export async function acquirePipelineLock(
  cfg: WorkerConfig,
  lockedBy: string,
  staleMs = STALE_LOCK_MS,
): Promise<{ ok: boolean; runId?: string; reason?: string }> {
  const client = supabaseAdmin(cfg);
  if (!client) return { ok: true, reason: "no_supabase" };
  const staleBefore = new Date(Date.now() - staleMs).toISOString();
  const { data: running } = await client
    .from("news_pipeline_runs")
    .select("id, created_at, completed_at")
    .eq("status", "running")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (running && running.created_at && running.created_at > staleBefore && !running.completed_at) {
    return { ok: false, runId: running.id, reason: "lock_held" };
  }
  if (running?.id) {
    await client
      .from("news_pipeline_runs")
      .update({
        status: "failed",
        error_message: "stale_lock",
        completed_at: new Date().toISOString(),
      })
      .eq("id", running.id)
      .eq("status", "running");
  }
  const { data, error } = await client
    .from("news_pipeline_runs")
    .insert({
      stage: "cycle",
      status: "running",
      details: { locked_by: lockedBy, sources: {} as Record<string, SourceFetchOutcome> },
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, reason: error?.message || "lock_insert_failed" };
  return { ok: true, runId: data.id };
}

export async function finishPipelineLock(
  cfg: WorkerConfig,
  runId: string | undefined,
  row: {
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
  if (!runId) {
    await logPipelineRun(cfg, { stage: "cycle", ...row });
    return;
  }
  const client = supabaseAdmin(cfg);
  if (!client) return;
  const { error } = await client
    .from("news_pipeline_runs")
    .update({
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
    })
    .eq("id", runId);
  if (error) console.error("[pipeline_runs] finish lock failed:", error.message);
}

export async function recentSourceOutcomes(
  cfg: WorkerConfig,
  limit = 12,
): Promise<Array<{ details?: { sources?: Record<string, SourceFetchOutcome> } | null }>> {
  const client = supabaseAdmin(cfg);
  if (!client) return [];
  const { data } = await client
    .from("news_pipeline_runs")
    .select("details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Array<{ details?: { sources?: Record<string, SourceFetchOutcome> } | null }>;
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
