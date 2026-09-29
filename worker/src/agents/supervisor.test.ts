import { describe, expect, it } from "vitest";
import { computeAiScore, decide } from "./supervisor.js";
import type { WorkerConfig } from "../config.js";
import type { DraftArticle } from "./types.js";

const cfg = (autoPublish: boolean): WorkerConfig => ({
  intervalMinutes: 15,
  newsRssUrls: [],
  chatAiBaseUrl: "",
  chatAiModel: "",
  chatAiKey: "",
  bvBaseUrl: "",
  newsroomIngestKey: "",
  autoPublish,
  telegramAllowedChatIds: [],
  telegramBotToken: "",
  telegramChannelId: "",
  social: {
    facebookPageToken: "",
    facebookPageId: "",
    xApiKey: "",
    xApiSecret: "",
    xAccessToken: "",
    xAccessSecret: "",
    instagramAccessToken: "",
    linkedinAccessToken: "",
    linkedinOrganizationId: "",
  },
  pexelsApiKey: "",
});

function draft(overrides: Partial<DraftArticle> = {}): DraftArticle {
  return {
    raw: {
      id: "1",
      sourceUrl: "https://ex.com/feed",
      sourceCategory: "national",
      title: "শিরোনাম",
      link: "https://ex.com/a",
      description: "বিবরণ",
      publishedAt: new Date().toISOString(),
    },
    titleBn: "একটি যথেষ্ট লম্বা বাংলা শিরোনাম",
    contentBn: "ক".repeat(300),
    excerptBn: "সারাংশ",
    tags: [],
    imageUrl: "",
    imageAlt: "",
    imageLicense: "",
    imageSource: "",
    rewriteMethod: "ai",
    fallback: false,
    skipReason: null,
    aiScore: 42,
    aiSummary: "",
    status: "draft",
    duplicateOf: null,
    ...overrides,
  };
}

describe("decide thresholds", () => {
  it("publishes score 42 when AUTO_PUBLISH is on (was rejected at 50)", async () => {
    const d = draft({ aiScore: 42, contentBn: "ক".repeat(100) });
    expect(computeAiScore(d)).toBe(45);
    const result = await decide(cfg(true), d);
    expect(result.action).toBe("publish");
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it("still rejects scores below 40", async () => {
    const d = draft({
      aiScore: 10,
      contentBn: "ছোট",
      raw: {
        id: "2",
        sourceUrl: "https://ex.com/feed",
        sourceCategory: "national",
        title: "x",
        link: "not-a-url",
        description: "y",
        publishedAt: new Date().toISOString(),
      },
    });
    const result = await decide(cfg(true), d);
    expect(result.action).toBe("reject");
  });
});
