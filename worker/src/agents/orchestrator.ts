import type { WorkerConfig } from "../config.js";
import { collect } from "./collector.js";
import { rewrite } from "./rewriter.js";
import { fetchMedia } from "./media.js";
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

export interface PublishResult {
  ok: boolean;
  url?: string;
  error?: string;
  id?: string;
  status?: string;
  duplicate?: boolean;
}

export async function publishArticle(cfg: WorkerConfig, draft: DraftArticle): Promise<PublishResult> {
  if (!cfg.bvBaseUrl || !cfg.newsroomIngestKey) {
    return { ok: false, error: "ingest_disabled" };
  }
  try {
    const hash = contentHash(draft.raw.link, draft.titleBn, draft.contentBn);
    const res = await fetch(`${cfg.bvBaseUrl}/api/newsroom/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-key": cfg.newsroomIngestKey,
      },
      body: JSON.stringify({
        title: draft.titleBn,
        content: draft.contentBn,
        excerpt: draft.excerptBn,
        tags: draft.tags,
        imageUrl: draft.imageUrl,
        imageAlt: draft.imageAlt,
        aiScore: draft.aiScore,
        aiSummary: draft.aiSummary,
        sourceUrl: draft.raw.link,
        sourceCategory: draft.raw.sourceCategory,
        status: draft.status,
        contentHash: hash,
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
      url: data?.id ? `${cfg.bvBaseUrl}/article/${data.id}` : undefined,
    };
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

      const { titleBn, contentBn } = await rewrite(cfg, raw);
      state.stage = "rewritten";
      await logPipelineRun(cfg, {
        stage: "rewrite",
        status: "success",
        processed: 1,
        details: { itemId: raw.id, source_url: raw.link },
      });

      const media = await fetchMedia(cfg, titleBn);
      state.stage = "media";

      const draft: DraftArticle = {
        raw,
        titleBn,
        contentBn,
        excerptBn: contentBn.slice(0, 300),
        tags: [],
        imageUrl: media?.url ?? "",
        imageAlt: media?.attribution ?? "",
        aiScore: 50,
        aiSummary: "",
        status: "draft",
        duplicateOf: null,
      };

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
