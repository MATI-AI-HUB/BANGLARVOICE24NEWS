// =============================================================================
// config.ts — central environment configuration for the Banglar Voice worker.
// Every value is read from process.env with a safe default. No secrets are
// hardcoded — all credentials come from the environment (.env).
// =============================================================================

export interface WorkerConfig {
  intervalMinutes: number;
  newsRssUrls: string[];
  chatAiBaseUrl: string;
  chatAiModel: string;
  chatAiKey: string;
  bvBaseUrl: string;
  newsroomIngestKey: string;
  autoPublish: boolean;
  telegramAllowedChatIds: string[];
  telegramBotToken: string;
  telegramChannelId: string;
  social: {
    facebookPageToken: string;
    facebookPageId: string;
    xApiKey: string;
    xApiSecret: string;
    xAccessToken: string;
    xAccessSecret: string;
    instagramAccessToken: string;
    linkedinAccessToken: string;
    linkedinOrganizationId: string;
  };
  pexelsApiKey: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

const num = (v: string | undefined, d: number): number => {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const csv = (v: string | undefined): string[] =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function requireNewsroomIngestKey(env: NodeJS.ProcessEnv): string {
  const raw = (env.NEWSROOM_INGEST_KEY ?? "").trim();
  const isProd = (env.NODE_ENV ?? "") === "production";
  if (!raw || raw === "change-me") {
    if (isProd) {
      throw new Error(
        "NEWSROOM_INGEST_KEY is required in production. Refusing the change-me default.",
      );
    }
    return "";
  }
  return raw;
}

function resolveChatAi(env: NodeJS.ProcessEnv): {
  chatAiBaseUrl: string;
  chatAiModel: string;
  chatAiKey: string;
} {
  const explicitKey = (env.CHAT_AI_KEY ?? "").trim();
  const groqKey = (env.GROQ_API_KEY ?? "").trim();
  const openrouterKey = (env.OPENROUTER_API_KEY ?? "").trim();
  const explicitBase = (env.CHAT_AI_BASE_URL ?? "").trim().replace(/\/$/, "");
  const explicitModel = (env.CHAT_AI_MODEL ?? "").trim();

  if (explicitKey) {
    return {
      chatAiKey: explicitKey,
      chatAiBaseUrl: explicitBase || "https://api.openai.com/v1",
      chatAiModel: explicitModel || "gpt-4o-mini",
    };
  }
  if (groqKey) {
    return {
      chatAiKey: groqKey,
      chatAiBaseUrl: explicitBase || "https://api.groq.com/openai/v1",
      chatAiModel: explicitModel || "openai/gpt-oss-120b",
    };
  }
  if (openrouterKey) {
    return {
      chatAiKey: openrouterKey,
      chatAiBaseUrl: explicitBase || "https://openrouter.ai/api/v1",
      chatAiModel: explicitModel || "openai/gpt-4o-mini",
    };
  }
  return {
    chatAiKey: "",
    chatAiBaseUrl: explicitBase || "https://api.openai.com/v1",
    chatAiModel: explicitModel || "gpt-4o-mini",
  };
}

function requireBvBaseUrl(env: NodeJS.ProcessEnv): string {
  const raw = (env.BV_BASE_URL ?? "").trim().replace(/\/$/, "");
  const isProd = (env.NODE_ENV ?? "") === "production";
  if (!raw) {
    if (isProd) {
      throw new Error(
        "BV_BASE_URL is required in production. Refusing to start with a localhost fallback.",
      );
    }
    return "";
  }
  let host = "";
  try {
    host = new URL(raw).hostname;
  } catch {
    throw new Error(`BV_BASE_URL is not a valid URL: ${raw}`);
  }
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^192\.168\./.test(host);
  if (isProd && isLocal) {
    throw new Error(
      "BV_BASE_URL must not point at localhost or a private LAN address in production.",
    );
  }
  return raw;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const chat = resolveChatAi(env);
  return {
    intervalMinutes: num(env.INTERVAL_MINUTES, 14),
    newsRssUrls: csv(env.NEWS_RSS_URLS),
    chatAiBaseUrl: chat.chatAiBaseUrl,
    chatAiModel: chat.chatAiModel,
    chatAiKey: chat.chatAiKey,
    bvBaseUrl: requireBvBaseUrl(env),
    supabaseUrl: (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "") || undefined,
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY,
    newsroomIngestKey: requireNewsroomIngestKey(env),
    autoPublish: (env.AUTO_PUBLISH ?? "false").toLowerCase() === "true",
    telegramAllowedChatIds: csv(env.TELEGRAM_ALLOWED_CHAT_IDS),
    telegramBotToken: env.TELEGRAM_BOT_TOKEN ?? "",
    telegramChannelId: env.TELEGRAM_CHANNEL_ID ?? "",
    social: {
      facebookPageToken: env.FACEBOOK_PAGE_TOKEN ?? "",
      facebookPageId: env.FACEBOOK_PAGE_ID ?? "",
      xApiKey: env.X_API_KEY ?? "",
      xApiSecret: env.X_API_SECRET ?? "",
      xAccessToken: env.X_ACCESS_TOKEN ?? "",
      xAccessSecret: env.X_ACCESS_SECRET ?? "",
      instagramAccessToken: env.INSTAGRAM_ACCESS_TOKEN ?? "",
      linkedinAccessToken: env.LINKEDIN_ACCESS_TOKEN ?? "",
      linkedinOrganizationId: env.LINKEDIN_ORGANIZATION_ID ?? "",
    },
    pexelsApiKey: env.PEXELS_API_KEY ?? "",
  };
}

// Built-in 7-category Google News RSS index (Bangladesh). Used when
// NEWS_RSS_URLS is empty. Each entry is a category label + feed URL.
export const BUILTIN_SOURCES: { category: string; url: string }[] = [
  { category: "national", url: "https://news.google.com/rss/search?q=Bangladesh&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "politics", url: "https://news.google.com/rss/search?q=%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%A8%E0%A7%80%E0%A6%A4%E0%A6%BF&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "economy", url: "https://news.google.com/rss/search?q=%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%A5%E0%A6%A8%E0%A7%80%E0%A6%A4%E0%A6%BF&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "sports", url: "https://news.google.com/rss/search?q=%E0%A6%96%E0%A7%87%E0%A6%B2%E0%A6%BE%E0%A6%A7%E0%A7%81%E0%A6%B2%E0%A6%BE&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "technology", url: "https://news.google.com/rss/search?q=%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%AF%E0%A7%81%E0%A6%95%E0%A7%8D%E0%A6%A4%E0%A6%BF&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "entertainment", url: "https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BF%E0%A6%A8%E0%A7%8B%E0%A6%A6%E0%A6%A8&hl=bn&gl=BD&ceid=BD:bn" },
  { category: "international", url: "https://news.google.com/rss/search?q=world+news&hl=bn&gl=BD&ceid=BD:bn" },
];