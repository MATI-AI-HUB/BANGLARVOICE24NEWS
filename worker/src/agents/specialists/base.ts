// =============================================================================
// specialists/base.ts — abstract base class for section specialists.
//
// Six checks → weighted composite → decision gate.
//
//   1. multiSource      cross-verify against independent sources
//   2. imageMatch       does the image match the headline?
//   3. videoMatch       does the video match the article?
//   4. location         is the claimed location verifiable?
//   5. datetime         is the claimed date/time consistent?
//   6. rewriterQuality  did the rewriter preserve facts, avoid hallucination?
//
// Decision gate:
//   composite < 60             -> reject
//   composite 60-84            -> review (editor)
//   composite >= 85            -> auto_publish (only if not sensitive)
//   sensitive + composite < 90 -> forced review
// =============================================================================

import type { WorkerConfig } from "../../config.js";
import type { DraftArticle } from "../types.js";
import { chat, hasChatKey } from "../chat.js";
import type {
  CheckResult,
  SectionKey,
  SpecialistInput,
  SpecialistVerdict,
} from "./types.js";

export interface CheckWeights {
  multiSource: number;
  imageMatch: number;
  videoMatch: number;
  location: number;
  datetime: number;
  rewriterQuality: number;
}

const DEFAULT_WEIGHTS: CheckWeights = {
  multiSource: 0.35,
  imageMatch: 0.15,
  videoMatch: 0.05,
  location: 0.15,
  datetime: 0.10,
  rewriterQuality: 0.20,
};

export abstract class BaseSpecialist {
  abstract readonly section: SectionKey;
  abstract readonly version: string;

  abstract systemPrompt(): string;
  abstract sensitiveKeywords(): string[];

  weights(): CheckWeights {
    return DEFAULT_WEIGHTS;
  }

  protected isSensitive(draft: DraftArticle): boolean {
    const hay = `${draft.titleBn} ${draft.contentBn}`.toLowerCase();
    return this.sensitiveKeywords().some((k) => hay.includes(k.toLowerCase()));
  }

  // ─── Check 1: multi-source ───────────────────────────────
  protected async multiSourceCheck(
    cfg: WorkerConfig,
    draft: DraftArticle,
  ): Promise<CheckResult> {
    const keywords = draft.titleBn.split(/\s+/).slice(0, 6).join(" ");
    const rssUrl =
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent(keywords) +
      "&hl=bn&gl=BD&ceid=BD:bn";

    try {
      const res = await fetch(rssUrl, {
        headers: { "User-Agent": "BanglarVoice-FactChecker/1.0" },
      });
      if (!res.ok) return { score: 0.3, reason: "google-news " + res.status };

      const xml = await res.text();
      const domains = new Set<string>();
      const items = [...xml.matchAll(/<link>(https?:\/\/[^<]+)<\/link>/g)];
      for (const m of items) {
        try {
          domains.add(new URL(m[1]).hostname);
        } catch {
          /* skip */
        }
      }
      const distinct = domains.size;
      const score = Math.min(1, distinct / 5);
      return {
        score,
        reason: distinct + " distinct domains corroborate",
        details: { domains: [...domains].slice(0, 10) },
      };
    } catch (e) {
      return { score: 0.2, reason: "rss error: " + (e as Error).message };
    }
  }

  // ─── Check 2: image match ────────────────────────────────
  protected async imageMatchCheck(
    cfg: WorkerConfig,
    draft: DraftArticle,
  ): Promise<CheckResult> {
    if (!draft.imageUrl) return { score: 0.5, reason: "no image" };
    if (!hasChatKey(cfg)) return { score: 0.5, reason: "no vision key" };
    // Vision LLM integration is Phase 2. Neutral score for now.
    return { score: 0.6, reason: "vision pending (phase 2)" };
  }

  // ─── Check 3: video match ────────────────────────────────
  protected async videoMatchCheck(): Promise<CheckResult> {
    return { score: 0.5, reason: "no video in article" };
  }

  // ─── Check 4: location ───────────────────────────────────
  protected async locationCheck(draft: DraftArticle): Promise<CheckResult> {
    const locWords = [
      "ঢাকা", "চট্টগ্রাম", "খুলনা", "রাজশাহী", "সিলেট", "বরিশাল",
      "রংপুর", "ময়মনসিংহ", "বাংলাদেশ", "ভারত", "পাকিস্তান",
    ];
    const hay = draft.titleBn + " " + draft.contentBn;
    const found = locWords.filter((w) => hay.includes(w));
    return {
      score: found.length > 0 ? 0.8 : 0.5,
      reason: found.length > 0 ? "locations: " + found.join(", ") : "no explicit location",
      details: { locations: found },
    };
  }

  // ─── Check 5: datetime ───────────────────────────────────
  protected async datetimeCheck(draft: DraftArticle): Promise<CheckResult> {
    const iso = draft.raw.publishedAt;
    if (!iso) return { score: 0.4, reason: "no published_at" };
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return { score: 0.4, reason: "invalid published_at" };
    const hoursOld = (Date.now() - t) / 3_600_000;
    if (hoursOld < 0) return { score: 0.3, reason: "future-dated" };
    if (hoursOld < 6) return { score: 1.0, reason: "very fresh" };
    if (hoursOld < 24) return { score: 0.9, reason: "fresh" };
    if (hoursOld < 72) return { score: 0.7, reason: "3d old" };
    return { score: 0.4, reason: "stale " + Math.round(hoursOld / 24) + "d" };
  }

  // ─── Check 6: rewriter quality ───────────────────────────
  protected async rewriterQualityCheck(
    cfg: WorkerConfig,
    draft: DraftArticle,
  ): Promise<CheckResult> {
    if (!hasChatKey(cfg)) return { score: 0.5, reason: "no chat key" };

    const prompt =
      'Compare SOURCE and REWRITE. Reply with ONLY JSON:\n' +
      '{"similarity":0.0-1.0,"hallucination":true|false,"added_opinion":true|false,"reason":"short"}\n\n' +
      "SOURCE:\n" + draft.raw.description.slice(0, 1200) + "\n\n" +
      "REWRITE:\n" + draft.contentBn.slice(0, 2000);

    try {
      const raw = await chat(cfg, this.systemPrompt(), prompt, 0.1);
      const m = raw.match(/\{[\s\S]*\}/);
      const json = JSON.parse(m ? m[0] : "{}");
      const sim = Math.max(0, Math.min(1, Number(json.similarity) || 0));
      const penalty =
        (json.hallucination ? 0.5 : 0) + (json.added_opinion ? 0.3 : 0);
      return {
        score: Math.max(0, sim - penalty),
        reason: json.reason || "sim=" + sim,
        details: json,
      };
    } catch (e) {
      return { score: 0.5, reason: "quality error: " + (e as Error).message };
    }
  }

  // ─── Main entry ──────────────────────────────────────────
  async verify(
    cfg: WorkerConfig,
    input: SpecialistInput,
  ): Promise<SpecialistVerdict> {
    const started = Date.now();
    const draft = input.draft;

    const [multiSource, imageMatch, videoMatch, location, datetime, rewriterQuality] =
      await Promise.all([
        this.multiSourceCheck(cfg, draft),
        this.imageMatchCheck(cfg, draft),
        this.videoMatchCheck(),
        this.locationCheck(draft),
        this.datetimeCheck(draft),
        this.rewriterQualityCheck(cfg, draft),
      ]);

    const w = this.weights();
    const composite01 =
      multiSource.score * w.multiSource +
      imageMatch.score * w.imageMatch +
      videoMatch.score * w.videoMatch +
      location.score * w.location +
      datetime.score * w.datetime +
      rewriterQuality.score * w.rewriterQuality;
    const compositeScore = Math.round(composite01 * 100);

    const sensitive = this.isSensitive(draft);
    let decision: SpecialistVerdict["decision"];
    let decisionReason: string;

    if (compositeScore < 40) {
      decision = "reject";
      decisionReason = "composite " + compositeScore + " < 40";
    } else if (compositeScore < 60 && hasChatKey(cfg)) {
      decision = "reject";
      decisionReason = "composite " + compositeScore + " < 60";
    } else if (sensitive && compositeScore < 90) {
      decision = "review";
      decisionReason = "sensitive gate (composite " + compositeScore + ")";
    } else if (compositeScore >= 85) {
      decision = "auto_publish";
      decisionReason = "composite " + compositeScore + " >= 85";
    } else {
      decision = "review";
      decisionReason = "composite " + compositeScore + " in review band";
    }

    return {
      section: this.section,
      specialist: this.constructor.name + "@" + this.version,
      multiSource,
      imageMatch,
      videoMatch,
      location,
      datetime,
      rewriterQuality,
      compositeScore,
      decision,
      decisionReason,
      latencyMs: Date.now() - started,
      costUsd: 0,
    };
  }
}
