import { describe, expect, it } from "vitest";
import {
  DEFAULT_MIN_AI_SCORE,
  SOURCE_DUE_GRACE_MINUTES,
  computeScore,
  consecutive403Count,
  decidePublish,
  isSourceDue,
  shouldDisableAfter403,
  type PublishGateInput,
  type SourceFetchOutcome,
} from "./publish-gate.js";

const BN_BODY =
  "বাংলাদেশের রাজনৈতিক ও অর্থনৈতিক পরিস্থিতি নিয়ে আজ একটি গুরুত্বপূর্ণ প্রতিবেদন প্রকাশিত হয়েছে। " +
  "সরকারি সূত্র অনুযায়ী আগামী সপ্তাহে নতুন নীতিমালা ঘোষণা করা হবে বলে জানা গেছে। " +
  "বিশ্লেষকরা বলছেন এই পদক্ষেপ দেশের অর্থনীতিতে ইতিবাচক প্রভাব ফেলবে এবং সাধারণ মানুষের জীবনযাত্রায় পরিবর্তন আসবে।";

const BN_TITLE = "গুরুত্বপূর্ণ রাজনৈতিক প্রতিবেদন প্রকাশ";

function baseInput(overrides: Partial<PublishGateInput> = {}): PublishGateInput {
  const now = Date.now();
  return {
    autoPublish: true,
    sourceEnabled: true,
    killSwitch: false,
    sourceUrl: "https://example.com/news/1",
    imageUrl: "https://images.example.com/photo.jpg",
    isFallback: false,
    rewriteMethod: "ai",
    bodyBn: BN_BODY,
    titleBn: BN_TITLE,
    sourceText: undefined,
    sourcePublishedAt: new Date(now - 60 * 60 * 1000).toISOString(),
    category: "national",
    now,
    minAiScore: DEFAULT_MIN_AI_SCORE,
    ...overrides,
  };
}

function runWith(status: SourceFetchOutcome["status"], key: string) {
  const outcome: SourceFetchOutcome = { status, at: "2026-10-02T00:00:00.000Z" };
  return { details: { sources: { [key]: outcome } } };
}

describe("publish gate", () => {
  it("publishes a clean AI article", () => {
    expect(decidePublish(baseInput()).action).toBe("publish");
  });

  it("holds when AUTO_PUBLISH is off", () => {
    const result = decidePublish(baseInput({ autoPublish: false }));
    expect(result.action).toBe("hold");
    expect(result.reason).toBe("auto_publish_disabled");
  });

  it("holds high-risk articles", () => {
    const result = decidePublish(baseInput({ titleBn: "সংবাদে খুনের ঘটনা" }));
    expect(result.action).toBe("hold");
    expect(result.riskLevel).toBe("high");
  });

  it("holds fallback images", () => {
    const result = decidePublish(baseInput({ isFallback: true }));
    expect(result.action).toBe("hold");
    expect(result.reason).toBe("image_fallback");
  });

  it("holds non-AI rewrites", () => {
    const result = decidePublish(baseInput({ rewriteMethod: "fallback" }));
    expect(result.action).toBe("hold");
    expect(result.reason).toBe("rewrite_not_ai");
  });

  it("rejects articles older than 48 hours", () => {
    const now = Date.now();
    const result = decidePublish(
      baseInput({ now, sourcePublishedAt: new Date(now - 49 * 60 * 60 * 1000).toISOString() }),
    );
    expect(result.action).toBe("reject");
    expect(result.reason).toBe("older_than_48h");
  });

  it("holds short bodies", () => {
    const result = decidePublish(baseInput({ bodyBn: "খুব ছোট" }));
    expect(result.action).toBe("hold");
    expect(result.reason).toBe("body_too_short");
  });

  it("publishes medium risk when score >= MIN_AI_SCORE + 10", () => {
    const input = baseInput({
      titleBn: "গ্রেপ্তার প্রতিবেদন প্রকাশ",
      sourceText: BN_BODY,
      minAiScore: 80,
    });
    expect(computeScore(input)).toBe(90);
    expect(decidePublish(input).action).toBe("publish");
  });

  it("holds medium risk when score < MIN_AI_SCORE + 10", () => {
    const result = decidePublish(
      baseInput({
        titleBn: "গ্রেপ্তার প্রতিবেদন প্রকাশ",
        sourceText: BN_BODY,
        minAiScore: 85,
      }),
    );
    expect(result.action).toBe("hold");
    expect(result.reason).toBe("risk_medium_score");
  });

  it("disables after three consecutive final-403 runs including the current one", () => {
    const key = "src-1";
    const previous = [runWith("403", key), runWith("403", key)];
    expect(consecutive403Count(previous, key)).toBe(2);
    expect(shouldDisableAfter403(previous, key)).toBe(true);
  });

  it("does not disable after only two total 403 runs", () => {
    const key = "src-2";
    expect(shouldDisableAfter403([runWith("403", key)], key)).toBe(false);
  });

  it("resets the 403 streak on a non-403 run", () => {
    const key = "src-3";
    const previous = [runWith("ok", key), runWith("403", key), runWith("403", key)];
    expect(consecutive403Count(previous, key)).toBe(0);
    expect(shouldDisableAfter403(previous, key)).toBe(false);
  });

  it("applies the grace margin so interval=15 sources are due on a 14-minute run", () => {
    const now = Date.now();
    const minutesAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();
    expect(SOURCE_DUE_GRACE_MINUTES).toBe(2);
    expect(isSourceDue(minutesAgo(14), 15, now)).toBe(true);
    expect(isSourceDue(minutesAgo(12), 15, now)).toBe(false);
    expect(isSourceDue(null, 15, now)).toBe(true);
  });
});
