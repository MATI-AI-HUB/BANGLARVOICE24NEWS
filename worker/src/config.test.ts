import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const base = {
  NODE_ENV: "test",
  BV_BASE_URL: "https://example.com",
  NEWSROOM_INGEST_KEY: "k",
};

describe("resolveChatAi", () => {
  it("prefers explicit CHAT_AI_KEY over GROQ/OpenRouter", () => {
    const cfg = loadConfig({
      ...base,
      CHAT_AI_KEY: "explicit",
      CHAT_AI_BASE_URL: "https://api.openai.com/v1",
      CHAT_AI_MODEL: "gpt-4o-mini",
      GROQ_API_KEY: "gsk_x",
      OPENROUTER_API_KEY: "or_x",
    });
    expect(cfg.chatAiKey).toBe("explicit");
    expect(cfg.chatAiBaseUrl).toBe("https://api.openai.com/v1");
    expect(cfg.chatAiModel).toBe("gpt-4o-mini");
  });

  it("maps GROQ_API_KEY when CHAT_AI_KEY is empty", () => {
    const cfg = loadConfig({
      ...base,
      GROQ_API_KEY: "gsk_x",
      OPENROUTER_API_KEY: "or_x",
    });
    expect(cfg.chatAiKey).toBe("gsk_x");
    expect(cfg.chatAiBaseUrl).toBe("https://api.groq.com/openai/v1");
    expect(cfg.chatAiModel).toBe("openai/gpt-oss-120b");
  });

  it("maps OPENROUTER_API_KEY when CHAT_AI_KEY and GROQ are empty", () => {
    const cfg = loadConfig({
      ...base,
      OPENROUTER_API_KEY: "or_x",
    });
    expect(cfg.chatAiKey).toBe("or_x");
    expect(cfg.chatAiBaseUrl).toBe("https://openrouter.ai/api/v1");
    expect(cfg.chatAiModel).toBe("openai/gpt-4o-mini");
  });
});
