import { describe, expect, it, vi, afterEach } from "vitest";
import { rewrite, deterministicParaphrase, robotsPathAllowed } from "./rewriter.js";
import type { WorkerConfig } from "../config.js";
import type { RawItem } from "./types.js";

const PAGE =
  "<html><article>" +
  "আজ ঢাকায় ভারী বৃষ্টি হয়েছে। মানুষ ঘরে থাকার পরামর্শ দিয়েছেন কর্মকর্তারা। ".repeat(8) +
  "</article></html>";

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

function stubFetch(opts: { chatOk?: boolean; pageHtml?: string }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      const href = String(url);
      if (href.includes("robots.txt")) {
        return { ok: true, text: async () => "User-agent: *\nAllow: /" };
      }
      if (href.includes("/chat/completions")) {
        if (opts.chatOk === false) {
          return { ok: false, status: 500, text: async () => "upstream down" };
        }
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content:
                    '{"title_bn":"নতুন শিরোনাম","content_bn":"মূল খবরের পুনর্লিখন এখানে।","excerpt_bn":"সারাংশ","image_keywords":"Dhaka rain","sensitive":false,"reasons":[]}',
                },
              },
            ],
          }),
        };
      }
      return { ok: true, text: async () => opts.pageHtml ?? PAGE };
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("robotsPathAllowed", () => {
  it("blocks only matching paths, not the whole origin", () => {
    const txt = "User-agent: *\nDisallow: /premium/\nAllow: /news/";
    expect(robotsPathAllowed(txt, "/premium/secret")).toBe(false);
    expect(robotsPathAllowed(txt, "/news/world")).toBe(true);
    expect(robotsPathAllowed(txt, "/sport")).toBe(true);
  });
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
    stubFetch({ chatOk: false });
    const out = await rewrite(cfg("sk-test"), raw);
    expect(out.fallback).toBe(true);
    expect(out.method).toBe("fallback");
    expect(out.reason).toMatch(/ai_rewrite_failed/);
  });

  it("uses rich RSS text when the article page cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        const href = String(url);
        if (href.includes("robots.txt")) return { ok: true, text: async () => "User-agent: *\nAllow: /" };
        if (href.includes("/chat/completions")) {
          return {
            ok: true,
            json: async () => ({
              choices: [
                {
                  message: {
                    content:
                      '{"title_bn":"নতুন শিরোনাম","content_bn":"মূল খবরের পুনর্লিখন এখানে।","excerpt_bn":"সারাংশ","image_keywords":"Dhaka rain","sensitive":false,"reasons":[]}',
                  },
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404, text: async () => "" };
      }),
    );
    const longRaw = {
      ...raw,
      link: "https://rss-fallback.example.com/a",
      description: "আজ ঢাকায় ভারী বৃষ্টি হয়েছে। মানুষ ঘরে থাকার পরামর্শ দিয়েছেন কর্মকর্তারা। ".repeat(8),
    };
    const out = await rewrite(cfg("sk-test"), longRaw);
    expect(out.fallback).toBe(false);
    expect(out.method).toBe("ai");
  });

  it("holds when the article page cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        const href = String(url);
        if (href.includes("robots.txt")) return { ok: true, text: async () => "User-agent: *\nAllow: /" };
        if (href.includes("/chat/completions")) {
          return { ok: true, json: async () => ({ choices: [{ message: { content: "x" } }] }) };
        }
        return { ok: false, status: 404, text: async () => "" };
      }),
    );
    const out = await rewrite(cfg("sk-test"), raw);
    expect(out.fallback).toBe(true);
    expect(out.reason).toBe("source_fetch_failed");
  });

  it("returns method=ai when chat succeeds", async () => {
    stubFetch({ chatOk: true });
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
