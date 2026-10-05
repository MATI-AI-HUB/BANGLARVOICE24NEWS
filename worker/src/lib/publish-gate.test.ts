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
  "ঢাকার আবহাওয়া দপ্তর জানিয়েছে আজ শহরে হালকা বৃষ্টির সম্ভাবনা আছে এবং নগরবাসীকে সতর্ক থাকতে বলা হয়েছে। " +
  "সকাল থেকে আকাশ মেঘলা ছিল তবে যানবাহন চলাচল স্বাভাবিক রয়েছে বলে জানা গেছে। " +
  "বিশেষজ্ঞরা বলছেন এ ধরনের আবহাওয়া কৃষিকাজে সহায়ক হতে পারে যদি বৃষ্টি মাত্রাতিরিক্ত না হয়। " +
  "স্থানীয় প্রশাসন জরুরি সেবা প্রস্তুত রেখেছে এবং নাগরিকদের খোলা স্থানে সতর্কতার পরামর্শ দিয়েছে। " +
  "এই প্রতিবেদন শুধুমাত্র উৎসে প্রকাশিত তথ্যের ভিত্তিতে লেখা হয়েছে এবং কোনো অতিরিক্ত দাবি যোগ করা হয়নি। " +
  "নগরবাসী ছাতা সঙ্গে রাখতে পারেন এবং অপ্রয়োজনীয় ভ্রমণ এড়িয়ে চলতে পারেন বলে পরামর্শ দিয়েছেন কর্মকর্তারা। " +
  "সন্ধ্যা নাগাদ পরিস্থিতি পুনরায় মূল্যায়ন করা হবে বলে জানিয়েছে আবহাওয়া দপ্তর।";

const BN_SOURCE =
  "আবহাওয়া অধিদপ্তর ঢাকায় আজ হালকা বৃষ্টির পূর্বাভাস দিয়েছে। মেঘলা আকাশ ও স্বাভাবিক যানচলাচলের কথা বলা হয়েছে। " +
  "কৃষিকাজে সহায়কের সম্ভাবনা এবং জরুরি সেবা প্রস্তুত রাখার তথ্য উৎসে আছে। উন্মুক্ত স্থানে সতর্ক থাকতে বলা হয়েছে।";

const BN_TITLE = "ঢাকায় হালকা বৃষ্টির পূর্বাভাস";

function baseInput(overrides: Partial<PublishGateInput> = {}): PublishGateInput {
  const now = Date.now();
  return {
    autoPublish: true,
    sourceEnabled: true,
    killSwitch: false,
    sourceUrl: "https://example.com/news/1",
    imageUrl: "https://images.pexels.com/photos/1.jpeg",
    isFallback: false,
    rewriteMethod: "ai",
    bodyBn: BN_BODY,
    titleBn: BN_TITLE,
    sourceText: BN_SOURCE,
    imageSource: "pexels",
    licenceAllowsReuse: false,
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

  it("holds medium-risk keyword articles even with a high score", () => {
    const input = baseInput({
      titleBn: "গ্রেপ্তার প্রতিবেদন প্রকাশ",
      minAiScore: 10,
    });
    const result = decidePublish(input);
    expect(result.action).toBe("hold");
    expect(result.riskLevel).toBe("medium");
    expect(result.reason).toMatch(/^risk_medium:/);
    expect(computeScore(input)).toBeGreaterThanOrEqual(40);
  });

  it("holds when the AI sensitivity check fails closed", () => {
    const result = decidePublish(baseInput({ aiSensitivityFailed: true }));
    expect(result.action).toBe("hold");
    expect(result.reason).toBe("ai_sensitivity_failed");
  });

  it("holds when the AI marks the item sensitive", () => {
    const result = decidePublish(baseInput({ aiSensitive: true }));
    expect(result.action).toBe("hold");
    expect(result.reason).toBe("ai_sensitive");
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
