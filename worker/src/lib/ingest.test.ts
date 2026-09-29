import { afterEach, describe, expect, it, vi } from "vitest";
import { publishViaHttp, publishViaSupabase, sourceLabelFromUrl } from "./ingest.js";
import type { WorkerConfig } from "../config.js";
import type { DraftArticle } from "../agents/types.js";

const cfg: WorkerConfig = {
  intervalMinutes: 15,
  newsRssUrls: [],
  bvBaseUrl: "https://example.com",
  newsroomIngestKey: "k",
  autoPublish: true,
  chatAiBaseUrl: "",
  chatAiModel: "",
  chatAiKey: "",
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
  supabaseUrl: "https://example.supabase.co",
  supabaseServiceKey: "service",
};

function draft(overrides: Partial<DraftArticle> = {}): DraftArticle {
  return {
    raw: {
      id: "1",
      sourceUrl: "https://ex.com/feed",
      sourceCategory: "national",
      title: "শিরোনাম",
      link: "https://ex.com/story",
      description: "বিবরণ",
      publishedAt: new Date().toISOString(),
    },
    titleBn: "একটি যথেষ্ট লম্বা বাংলা শিরোনাম",
    contentBn: "ক".repeat(80),
    excerptBn: "সারাংশ",
    tags: [],
    imageUrl: "https://cdn.example.com/pic.jpg",
    imageAlt: "Wikimedia Commons — test",
    imageLicense: "CC BY-SA",
    imageSource: "wikimedia",
    rewriteMethod: "ai",
    fallback: false,
    skipReason: null,
    aiScore: 80,
    aiSummary: "",
    status: "published",
    duplicateOf: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("publishViaHttp", () => {
  it("returns duplicate=true when ingest reports a duplicate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, id: "art-1", status: "published", duplicate: true }),
    }));
    const result = await publishViaHttp(cfg, draft());
    expect(result).toEqual({
      ok: true,
      id: "art-1",
      status: "published",
      duplicate: true,
      url: "https://example.com/article/art-1",
    });
  });
});

describe("publishViaSupabase", () => {
  it("refuses fallback drafts", async () => {
    const result = await publishViaSupabase(cfg, draft({ fallback: true, rewriteMethod: "fallback" }));
    expect(result).toEqual({ ok: false, error: "fallback_not_publishable" });
  });
});

describe("sourceLabelFromUrl", () => {
  it("strips www and returns hostname", () => {
    expect(sourceLabelFromUrl("https://www.bbc.com/bengali/a")).toBe("bbc.com");
    expect(sourceLabelFromUrl("not-a-url")).toBe("সূত্র");
  });
});
