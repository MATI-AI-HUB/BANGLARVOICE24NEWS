import { describe, expect, it, vi, afterEach } from "vitest";
import { rewrite, deterministicParaphrase } from "./rewriter.js";
import type { WorkerConfig } from "../config.js";
import type { RawItem } from "./types.js";

const raw: RawItem = {
  id: "1",
  sourceUrl: "https://example.com/feed",
  sourceCategory: "national",
  title: "ঢাকায় বৃষ্টি",
  link: "https://example.com/a",
  description: "আজ ঢাকায় ভারী বৃষ্টি হয়েছে। মানুষ ঘরে থাকার পরামর্শ দিয়েছেন কর্মকর্তারা।",
  publishedAt: new Date().toISOString(),
};

function cfg(key: string): WorkerConfig {
  return {
    intervalMinutes: 14,
    newsRssUrls: [],
    bvBaseUrl: "https://example.com",
    newsroomIngestKey: "k",
    autoPublish: true,
    chatAiBaseUrl: "https://api.example.com/v1",
    chatAiModel: "gpt-test",
    chatAiKey: key,
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
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rewrite", () => {
  it("marks fallback=true when no chat key is configured (why deterministicParaphrase is reached)", async () => {
    const out = await rewrite(cfg(""), raw);
    expect(out.fallback).toBe(true);
    expect(out.method).toBe("fallback");
    expect(out.reason).toBe("no_chat_key");
    expect(out.contentBn).not.toContain("সংবাদ ডেস্ক থেকে");
    expect(out.contentBn.length).toBeGreaterThan(10);
  });

  it("marks fallback=true when the AI rewrite request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "upstream down",
    }));
    const out = await rewrite(cfg("sk-test"), raw);
    expect(out.fallback).toBe(true);
    expect(out.method).toBe("fallback");
    expect(out.reason).toMatch(/ai_rewrite_failed/);
  });

  it("returns method=ai when chat succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "নতুন শিরোনাম\nমূল খবরের পুনর্লিখন এখানে।" } }],
      }),
    }));
    const out = await rewrite(cfg("sk-test"), raw);
    expect(out.fallback).toBe(false);
    expect(out.method).toBe("ai");
    expect(out.titleBn).toBe("নতুন শিরোনাম");
  });

  it("deterministicParaphrase still exists for non-publish internal use", () => {
    const p = deterministicParaphrase(raw);
    expect(p.titleBn.length).toBeGreaterThan(0);
    expect(p.contentBn.length).toBeGreaterThan(20);
  });
});
