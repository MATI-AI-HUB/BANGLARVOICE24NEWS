import { describe, expect, it } from "vitest";
import { computeAiScore, decide } from "./supervisor.js";
import type { WorkerConfig } from "../config.js";
import type { DraftArticle } from "./types.js";

const cfg = (autoPublish: boolean): WorkerConfig => ({
  intervalMinutes: 14,
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
    contentBn: "ঢাকায় আজ নিয়মিত আবহাওয়া বার্তা প্রকাশিত হয়েছে এবং নগরবাসীকে সতর্ক থাকতে বলা হয়েছে। " + "ক".repeat(180),
    excerptBn: "সারাংশ",
    tags: [],
    imageUrl: "https://cdn.example.com/pic.jpg",
    imageAlt: "ছবি",
    imageLicense: "source",
    imageSource: "rss",
    rewriteMethod: "ai",
    fallback: false,
    skipReason: null,
    aiScore: 0,
    aiSummary: "",
    status: "draft",
    duplicateOf: null,
    ...overrides,
  };
}

describe("decide thresholds", () => {
  it("publishes a complete AI rewrite when AUTO_PUBLISH is on", async () => {
    const d = draft({ raw: { ...draft().raw, id: "pub-1", link: "https://ex.com/publish" } });
    expect(computeAiScore(d)).toBeGreaterThanOrEqual(40);
    const result = await decide(cfg(true), d);
    expect(result.action).toBe("publish");
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it("holds when AUTO_PUBLISH is off", async () => {
    const d = draft({
      titleBn: "দ্বিতীয় আলাদা বাংলা শিরোনামটি",
      raw: { ...draft().raw, id: "hold-1", link: "https://ex.com/hold", title: "দ্বিতীয়" },
    });
    const result = await decide(cfg(false), d);
    expect(result.action).toBe("wait");
  });
});
