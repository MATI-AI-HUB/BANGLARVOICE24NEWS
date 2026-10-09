// =============================================================================
// _shared/ai-client.ts — Vault-backed AI chat helper for Edge Functions.
// Reads key from api_vault via decrypt_vault_secret RPC (service_role only).
// =============================================================================

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ChatOptions {
  baseUrl: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function chat(opts: ChatOptions): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.apiKey}`,
  };
  // OpenRouter requires/recommends these
  if (opts.baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://YOUR_DOMAIN";
    headers["X-Title"] = "Banglar Voice";
  }
  const timeoutMs = opts.timeoutMs ?? 20000;
  const res = await fetch(`${opts.baseUrl}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers,
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 800,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * Retrieve and decrypt a key from api_vault using the service-role RPC.
 * Returns null if the key doesn't exist or is disabled.
 */
export async function vaultKey(
  supabase: SupabaseClient,
  serviceName: string,
): Promise<string | null> {
  const { data: row } = await supabase
    .from("api_vault")
    .select("key_encrypted")
    .eq("service_name", serviceName)
    .eq("is_active", true)
    .maybeSingle();

  if (!row?.key_encrypted) return null;

  const { data: decrypted } = await supabase.rpc("decrypt_vault_secret", {
    p_secret_id: row.key_encrypted,
  });

  return typeof decrypted === "string" && decrypted.length > 0 ? decrypted : null;
}
