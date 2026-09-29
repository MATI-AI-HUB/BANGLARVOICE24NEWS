import type { WorkerConfig } from "../config.js";
import { collect } from "./collector.js";
import { rewrite } from "./rewriter.js";
import { fetchMedia, rssThumbnail } from "./media.js";
import { broadcast, edit } from "./chain-agents.js";
import { verifyDraft } from "./specialists/router.js";
import { checkDiversityQuota } from "./specialists/diversity.js";
import { findCorroboratingSources } from "./specialists/multisource.js";
import { decide } from "./supervisor.js";
import type { DraftArticle, PipelineState } from "./types.js";
import {
  contentHash,
  logPipelineRun,
  MAX_PROCESS_PER_CYCLE,
  MAX_PUBLISH_PER_CYCLE,
  rateLimitOk,
  sourceAlreadyPublished,
} from "../lib/pipeline.js";
import { publishViaHttp, publishViaSupabase, type PublishResult } from "../lib/ingest.js";

export type { PublishResult };

export async function publishArticle(cfg: WorkerConfig, draft: DraftArticle): Promise<PublishResult> {
  try {
    const direct = await publishViaSupabase(cfg, draft);
    if (direct) return direct;
    return await publishViaHttp(cfg, draft);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export async function runPipeline(cfg: WorkerConfig): Promise<{
  collected: number;
  published: number;
  rejected: number;
  skipped: number;
  pending: number;
}> {
  const started = Date.now();
  let published = 0;
  let rejected = 0;
  let skipped = 0;
  let pending = 0;
  let processed = 0;
  let failed = 0;
  let rawItems: Awaited<ReturnType<typeof collect>> = [];

  try {
    await logPipelineRun(cfg, { stage: "collect", status: "started", details: { phase: "start" } });
    rawItems = await collect(cfg);
    await logPipelineRun(cfg, {
      stage: "collect",
      status: "success",
      fetched: rawItems.length,
      duration_ms: Date.now() - started,
    });

    for (const raw of rawItems) {
      if (published >= MAX_PUBLISH_PER_CYCLE) break;
      if (processed >= MAX_PROCESS_PER_CYCLE) break;

      const rate = await rateLimitOk(cfg);
      if (!rate.ok) {
        await logPipelineRun(cfg, {
          stage: "rate-limit",
          status: "partial",
          skipped: 1,
          details: { publishedLastHour: rate.publishedLastHour },
        });
        break;
      }

      const hash = contentHash(raw.link, raw.title, raw.description || raw.title);
      if (await sourceAlreadyPublished(cfg, raw.link, hash)) {
        skipped += 1;
        continue;
      }

      processed += 1;
      const state: PipelineState = {
        itemId: raw.id,
        stage: "collected",
        updatedAt: new Date().toISOString(),
        attempts: 1,
      };

      const rewritten = await rewrite(cfg, raw);
      state.stage = "rewritten";
      await logPipelineRun(cfg, {
        stage: "rewrite",
        status: rewritten.fallback ? "partial" : "success",
        processed: 1,
        details: {
          itemId: raw.id,
          source_url: raw.link,
          method: rewritten.method,
          fallback: rewritten.fallback,
          reason: rewritten.reason ?? null,
        },
      });

      if (rewritten.fallback) {
        skipped += 1;
        await logPipelineRun(cfg, {
          stage: "rewrite",
          status: "skipped",
          skipped: 1,
          details: {
            itemId: raw.id,
            source_url: raw.link,
            reason: rewritten.reason ?? "fallback",
          },
        });
        continue;
      }

      const media = await fetchMedia(cfg, rewritten.titleBn);
      state.stage = "media";
      const rssMedia = rssThumbnail(raw.imageUrl);
      const chosen = media ?? rssMedia;
      const imageUrl = chosen?.url || "";

      const draft: DraftArticle = {
        raw,
        titleBn: rewritten.titleBn,
        contentBn: rewritten.contentBn,
        excerptBn: rewritten.contentBn.slice(0, 300),
        tags: [],
        imageUrl,
        imageAlt: chosen?.attribution ?? "",
        imageLicense: chosen?.license ?? "",
        imageSource: chosen?.source ?? "",
        rewriteMethod: rewritten.method,
        fallback: false,
        skipReason: imageUrl ? null : "missing_image",
        aiScore: 50,
        aiSummary: "",
        status: "draft",
        duplicateOf: null,
      };

      if (!imageUrl) {
        skipped += 1;
        await logPipelineRun(cfg, {
          stage: "media",
          status: "skipped",
          skipped: 1,
          details: { itemId: raw.id, source_url: raw.link, reason: "missing_image" },
        });
        continue;
      }

      const diversity = await checkDiversityQuota(cfg, draft.raw.sourceCategory || "unknown");
      if (!diversity.allowed) {
        draft.status = "rejected";
        rejected += 1;
        continue;
      }

      let primaryDomain = "";
      try {
        primaryDomain = new URL(draft.raw.link).hostname;
      } catch {
        primaryDomain = "";
      }
      const corroborating = await findCorroboratingSources(draft.titleBn, primaryDomain, 3);

      try {
        const verdict = await verifyDraft(cfg, draft);
        draft.verification = verdict;
        draft.aiScore = verdict.compositeScore;
        if (verdict.decision === "reject" && verdict.compositeScore < 40) {
          draft.status = "rejected";
          rejected += 1;
          continue;
        }
      } catch (e) {
        console.error("[orchestrator] specialist verify failed", e);
        draft.status = "pending_review";
        pending += 1;
        continue;
      }

      (draft as { factSources?: unknown }).factSources = [
        { name: draft.raw.sourceCategory || "primary", url: draft.raw.link, type: "primary" },
        ...corroborating.map((s) => ({ name: s.name, url: s.url, type: "corroborating" })),
      ];

      const edited = await edit(cfg, draft);
      draft.tags = edited.tags;
      if (!edited.ok) {
        draft.status = "rejected";
        rejected += 1;
        continue;
      }
      state.stage = "edited";

      const decision = await decide(cfg, draft);
      if (decision.action === "reject") {
        draft.status = "rejected";
        rejected += 1;
        continue;
      }
      if (decision.action === "wait") {
        draft.status = "pending_review";
        pending += 1;
        continue;
      }

      draft.status = decision.action === "publish" ? "published" : "pending_review";
      const result = await publishArticle(cfg, draft);
      if (result.ok) {
        if (result.duplicate) {
          skipped += 1;
          state.stage = "published";
          continue;
        }
        draft.status = result.status === "published" ? "published" : "pending_review";
        if (draft.status === "published") {
          published += 1;
          state.stage = "published";
          if (result.url) {
            try {
              await broadcast(cfg, { titleBn: draft.titleBn, url: result.url });
            } catch (e) {
              console.error("[orchestrator] social broadcast failed", e);
            }
          }
        } else {
          pending += 1;
        }
      } else {
        state.stage = "rejected";
        failed += 1;
        rejected += 1;
        await logPipelineRun(cfg, {
          stage: "publish",
          status: "failed",
          failed: 1,
          error_message: result.error,
          details: { itemId: raw.id, source_url: raw.link },
        });
      }
    }

    await logPipelineRun(cfg, {
      stage: "cycle",
      status: failed > 0 ? "partial" : "success",
      fetched: rawItems.length,
      processed,
      published,
      pending_review: pending,
      skipped,
      failed,
      duration_ms: Date.now() - started,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logPipelineRun(cfg, {
      stage: "cycle",
      status: "failed",
      fetched: rawItems.length,
      processed,
      published,
      pending_review: pending,
      skipped,
      failed: failed + 1,
      duration_ms: Date.now() - started,
      error_message: message.slice(0, 2000),
    });
    throw e;
  }

  return { collected: rawItems.length, published, rejected, skipped, pending };
}
