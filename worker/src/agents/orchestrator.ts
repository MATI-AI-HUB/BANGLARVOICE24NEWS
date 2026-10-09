import type { WorkerConfig } from "../config.js";
import { collectDetailed } from "./collector.js";
import { rewrite } from "./rewriter.js";
import { isRepresentationalMedia, resolvePipelineMedia } from "./media.js";
import { broadcast, edit } from "./chain-agents.js";
import { verifyDraft } from "./specialists/router.js";
import { checkDiversityQuota } from "./specialists/diversity.js";
import { findCorroboratingSources } from "./specialists/multisource.js";
import { computeAiScore, decide } from "./supervisor.js";
import type { DraftArticle, PipelineState } from "./types.js";
import {
  acquirePipelineLock,
  contentHash,
  finishPipelineLock,
  isWithinLookback,
  logPipelineRun,
  MAX_PROCESS_PER_CYCLE,
  MAX_PUBLISH_PER_CYCLE,
  rateLimitOk,
  sourceAlreadyPublished,
} from "../lib/pipeline.js";
import { publishViaHttp, publishViaSupabase, type PublishResult } from "../lib/ingest.js";
import { computeRiskLevel, licenceNoteAllowsReuse } from "../lib/publish-gate.js";

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
  let queued = 0;
  const errorTypes = new Set<string>();
  let rawItems: Awaited<ReturnType<typeof collectDetailed>>["items"] = [];
  let sourceOutcomes: Awaited<ReturnType<typeof collectDetailed>>["sources"] = {};
  let disabledSources: string[] = [];
  const lock = await acquirePipelineLock(cfg, "worker");
  if (!lock.ok) {
    return { collected: 0, published: 0, rejected: 0, skipped: 0, pending: 0 };
  }

  let runStatus: "success" | "partial" | "failed" = "failed";
  let runError: unknown = null;

  try {
    await logPipelineRun(cfg, { stage: "collect", status: "started", details: { phase: "start" } });
    const collected = await collectDetailed(cfg);
    rawItems = collected.items;
    sourceOutcomes = collected.sources;
    disabledSources = collected.disabled;
    await logPipelineRun(cfg, {
      stage: "collect",
      status: "success",
      fetched: rawItems.length,
      duration_ms: Date.now() - started,
      details: { sources: sourceOutcomes, disabled: disabledSources },
    });

    for (const raw of rawItems) {
      if (published >= MAX_PUBLISH_PER_CYCLE) break;
      if (processed >= MAX_PROCESS_PER_CYCLE) break;

      if (!isWithinLookback(raw.publishedAt)) {
        skipped += 1;
        continue;
      }

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
      const licenceOk = licenceNoteAllowsReuse(raw.licenceNote);
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
        pending += 1;
        queued += 1;
        errorTypes.add(rewritten.reason ?? "ai_rewrite");
        const media = await resolvePipelineMedia(cfg, raw.title, raw.imageUrl, {
          licenceAllowsReuse: licenceOk,
        });
        const held: DraftArticle = {
          raw,
          titleBn: rewritten.titleBn,
          contentBn: rewritten.contentBn,
          excerptBn: rewritten.contentBn.slice(0, 300),
          tags: [],
          imageUrl: media.url,
          imageAlt: media.attribution,
          imageLicense: media.license,
          imageSource: media.source,
          rewriteMethod: "fallback",
          fallback: true,
          skipReason: rewritten.reason ?? "ai_rewrite",
          aiScore: 0,
          aiSummary: rewritten.reason ?? "ai_rewrite",
          riskLevel: computeRiskLevel(rewritten.titleBn, rewritten.contentBn, raw.sourceCategory).level,
          reviewReason: rewritten.reason ?? "ai_rewrite",
          status: "pending_review",
          duplicateOf: null,
        };
        const heldResult = await publishArticle(cfg, { ...held, status: "pending_review" });
        await logPipelineRun(cfg, {
          stage: "rewrite",
          status: "partial",
          pending_review: 1,
          details: {
            itemId: raw.id,
            source_url: raw.link,
            reason: rewritten.reason ?? "fallback",
            held: heldResult.ok,
            error_type: rewritten.reason ?? "ai_rewrite",
          },
        });
        continue;
      }

      state.stage = "media";
      const chosen = await resolvePipelineMedia(cfg, rewritten.titleBn, raw.imageUrl, {
        licenceAllowsReuse: licenceOk,
        keywords: rewritten.imageKeywords,
      });
      const imageUrl = chosen.url;

      const draft: DraftArticle = {
        raw: { ...raw, sourceText: rewritten.sourceText },
        titleBn: rewritten.titleBn,
        contentBn: rewritten.contentBn,
        excerptBn: rewritten.contentBn.slice(0, 300),
        tags: [],
        imageUrl,
        imageAlt: chosen.attribution,
        imageLicense: chosen.license,
        imageSource: chosen.source,
        rewriteMethod: rewritten.method,
        fallback: false,
        skipReason: null,
        aiScore: 0,
        aiSummary: "",
        status: "draft",
        duplicateOf: null,
      };
      (draft as { imageRepresentational?: boolean }).imageRepresentational = isRepresentationalMedia(chosen);
      (draft as { sourceText?: string }).sourceText = rewritten.sourceText;
      (draft as { aiSensitive?: boolean }).aiSensitive = false;
      (draft as { aiSensitivityFailed?: boolean }).aiSensitivityFailed = rewritten.sensitivityFailed === true;
      (draft as { licenceAllowsReuse?: boolean }).licenceAllowsReuse = licenceOk;
      (draft as { licenceNote?: string }).licenceNote = raw.licenceNote;

      if (!imageUrl) {
        pending += 1;
        queued += 1;
        errorTypes.add("missing_image");
        draft.status = "pending_review";
        draft.skipReason = "missing_image";
        await publishArticle(cfg, draft);
        await logPipelineRun(cfg, {
          stage: "media",
          status: "partial",
          pending_review: 1,
          details: { itemId: raw.id, source_url: raw.link, reason: "missing_image", error_type: "missing_image" },
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
      draft.aiScore = computeAiScore(draft);
      const risk = computeRiskLevel(draft.titleBn, draft.contentBn, draft.raw.sourceCategory);
      draft.riskLevel = risk.level;

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
        draft.reviewReason = decision.reason;
        pending += 1;
        queued += 1;
        await publishArticle(cfg, draft);
        continue;
      }

      const canPublish = decision.action === "publish";
      draft.status = canPublish ? "published" : "pending_review";
      draft.reviewReason = canPublish ? null : decision.reason;
      draft.riskLevel = draft.riskLevel || computeRiskLevel(draft.titleBn, draft.contentBn, draft.raw.sourceCategory).level;
      if (!canPublish) queued += 1;
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
              await broadcast(cfg, {
                id: result.id,
                titleBn: draft.titleBn,
                url: result.url,
                imageUrl: draft.imageUrl,
              });
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

    runStatus = failed > 0 ? "partial" : "success";
  } catch (e) {
    runError = e;
    runStatus = "failed";
  } finally {
    const errorMessage =
      runStatus === "failed"
        ? (runError instanceof Error ? runError.message : String(runError)).slice(0, 2000)
        : errorTypes.size > 0
          ? [...errorTypes].join(",")
          : undefined;
    await finishPipelineLock(cfg, lock.runId, {
      status: runStatus,
      fetched: rawItems.length,
      queued,
      processed,
      published,
      pending_review: pending,
      skipped,
      failed: runStatus === "failed" ? failed + 1 : failed,
      duration_ms: Date.now() - started,
      details: {
        fetched: rawItems.length,
        queued,
        processed,
        published,
        error_types: [...errorTypes],
        sources: sourceOutcomes,
        disabled: disabledSources,
        locked_by: "worker",
      },
      error_message: errorMessage,
    });
  }

  if (runError) throw runError;

  return { collected: rawItems.length, published, rejected, skipped, pending };
}
