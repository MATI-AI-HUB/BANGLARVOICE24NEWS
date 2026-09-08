// =============================================================================
// orchestrator.ts — the Publisher agent + the pipeline state machine.
// Walks an item through collect → rewrite → media → edit → publish, and POSTs
// the finished article to the Banglar Voice backend (BV_BASE_URL) using the
// NEWSROOM_INGEST_KEY shared secret.
// =============================================================================

import type { WorkerConfig } from "../config.js";
import { collect } from "./collector.js";
import { rewrite } from "./rewriter.js";
import { fetchMedia } from "./media.js";
import { edit } from "./chain-agents.js";
import { decide } from "./supervisor.js";
import type { DraftArticle, PipelineState, RawItem } from "./types.js";

export interface PublishResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export async function publishArticle(cfg: WorkerConfig, draft: DraftArticle): Promise<PublishResult> {
  try {
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
      }),
    });
    if (!res.ok) return { ok: false, error: `ingest ${res.status}` };
    const data: any = await res.json();
    return { ok: true, url: data?.id ? `${cfg.bvBaseUrl}/article/${data.id}` : undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

/** Run one full pipeline cycle: collect → rewrite → media → edit → decide → publish. */
export async function runPipeline(cfg: WorkerConfig): Promise<{ collected: number; published: number; rejected: number }> {
  const rawItems = await collect(cfg);
  let published = 0;
  let rejected = 0;

  for (const raw of rawItems.slice(0, 20)) {
    const state: PipelineState = { itemId: raw.id, stage: "collected", updatedAt: new Date().toISOString(), attempts: 1 };

    // Rewrite
    const { titleBn, contentBn } = await rewrite(cfg, raw);
    state.stage = "rewritten";

    // Media
    const media = await fetchMedia(cfg, titleBn);
    state.stage = "media";

    // Draft
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

    // Editor
    const edited = await edit(cfg, draft);
    draft.tags = edited.tags;
    if (!edited.ok) {
      draft.status = "rejected";
      rejected++;
      continue;
    }
    state.stage = "edited";

    // Supervisor decision
    const decision = await decide(cfg, draft);
    if (decision.action === "reject") {
      draft.status = "rejected";
      rejected++;
      continue;
    }
    if (decision.action === "wait") {
      draft.status = "pending_review";
      continue;
    }

    // Publish
    draft.status = "approved";
    const result = await publishArticle(cfg, draft);
    if (result.ok) {
      draft.status = "published";
      published++;
      state.stage = "published";
    } else {
      state.stage = "rejected";
      rejected++;
    }
  }

  return { collected: rawItems.length, published, rejected };
}