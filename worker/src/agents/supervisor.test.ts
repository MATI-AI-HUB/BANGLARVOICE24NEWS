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
    contentBn:
      "ঢাকায় আজ নিয়মিত আবহাওয়া বার্তা প্রকাশিত হয়েছে এবং নগরবাসীকে সতর্ক থাকতে বলা হয়েছে। " +
      "মেঘলা আকাশ ও স্বাভাবিক যানচলাচলের খবর পাওয়া গেছে তবে অতিরিক্ত ভ্রমণ এড়াতে পরামর্শ দেওয়া হয়েছে। " +
      "কৃষিকাজে হালকা বৃষ্টি সহায়ক হতে পারে বলে বিশেষজ্ঞরা মত দিয়েছেন এবং প্রশাসন জরুরি সেবা প্রস্তুত রেখেছে। " +
      "ক".repeat(250),
    excerptBn: "সারাংশ",
    tags: [],
    imageUrl: "https://images.pexels.com/photos/1.jpeg",
    imageAlt: "ছবি",
    imageLicense: "Pexels License",
    imageSource: "pexels",
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
    const d = draft({
      contentBn: "এটি একটি পর্যাপ্ত দীর্ঘ বাংলা নিবন্ধ যা প্রকাশের জন্য যথেষ্ট। বিশেষজ্ঞরা জানিয়েছেন আগামীকাল থেকে আবহাওয়ার উন্নতি হবে এবং যানচলাচল স্বাভাবিক থাকবে। ".repeat(15),
      titleBn: "পরীক্ষামূলক আবহাওয়া প্রতিবেদন",
      raw: {
        ...draft().raw,
        id: "pub-1",
        link: "https://ex.com/publish",
        description: "সম্পূর্ণ নতুন প্রতিবেদনে বিশেষজ্ঞরা জানিয়েছেন আগামীকাল থেকে আবহাওয়ার উন্নতি হবে।",
      },
    });
    (d as any).sourceText = "এটি সম্পূর্ণ ভিন্ন উৎসের লেখা যা মূল বর্ণনার সাথে মিল নেই। কোনো সাদৃশ্য নেই।";
    (d as any).licenceAllowsReuse = true;
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
