import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchMedia, rssThumbnail } from "./media.js";
import type { WorkerConfig } from "../config.js";

const cfg: WorkerConfig = {
  intervalMinutes: 14,
  newsRssUrls: [],
  bvBaseUrl: "https://example.com",
  newsroomIngestKey: "k",
  autoPublish: true,
  chatAiBaseUrl: "",
  chatAiModel: "gpt-4o-mini",
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
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchMedia", () => {
  it("sends a User-Agent and returns the Wikimedia image", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "1": {
              title: "File:test.jpg",
              imageinfo: [{ url: "https://upload.wikimedia.org/test.jpg", width: 1200, height: 800 }],
            },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const media = await fetchMedia(cfg, "Bangladesh cricket");
    expect(media?.url).toBe("https://upload.wikimedia.org/test.jpg");
    expect(fetchMock).toHaveBeenCalled();
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("User-Agent") || "").toMatch(/BanglarVoice/);
  });

  it("does not retry a 403 and falls through so RSS thumbnail can be used", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const media = await fetchMedia(cfg, "Bangladesh");
    expect(media).toBeNull();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("User-Agent") || "").toMatch(/BanglarVoice/);
    expect(rssThumbnail(undefined)).toBeNull();
    expect(rssThumbnail("https://cdn.example.com/from-rss.jpg")?.url).toBe("https://cdn.example.com/from-rss.jpg");
  });

  it("falls back to Openverse when Wikimedia is forbidden", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("wikimedia")) return { ok: false, json: async () => ({}) };
      return {
        ok: true,
        json: async () => ({ results: [{ url: "https://openverse.org/a.jpg", width: 800, height: 600, license: "CC0" }] }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    const media = await fetchMedia(cfg, "ঢাকা");
    expect(media?.url).toBe("https://openverse.org/a.jpg");
  });
});
