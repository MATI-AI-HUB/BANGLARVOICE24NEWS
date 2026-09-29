import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchMedia } from "./media.js";
import type { WorkerConfig } from "../config.js";

const cfg: WorkerConfig = {
  intervalMinutes: 15,
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
    const headers = fetchMock.mock.calls[0][1]?.headers ?? {};
    expect(String(headers["User-Agent"] || "")).toMatch(/BanglarVoice-AI/);
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
