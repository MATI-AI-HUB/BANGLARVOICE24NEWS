// =============================================================================
// chat.ts — OpenAI-compatible chat helper used by Rewriter, Editor, Supervisor.
// Works with OpenAI, Gemini, Groq, Ollama (any /chat/completions endpoint).
// =============================================================================

import type { WorkerConfig } from "../config.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(
  cfg: WorkerConfig,
  system: string,
  user: string,
  temperature = 0.2,
): Promise<string> {
  const res = await fetch(`${cfg.chatAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfg.chatAiKey ? { Authorization: `Bearer ${cfg.chatAiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.chatAiModel,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** True if a chat AI key is configured. */
export function hasChatKey(cfg: WorkerConfig): boolean {
  return cfg.chatAiKey.length > 0;
}