import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEFAULT_BASE_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
};
const PROVIDER_ORDER = ["openrouter", "groq", "ollama"] as const;
type Provider = (typeof PROVIDER_ORDER)[number];
type KeyRow = {
  api_vault_id: string;
  provider: Provider;
  account_label: string;
  priority: number;
  model: string | null;
  base_url: string | null;
  is_enabled: boolean;
  state: string;
  failure_count: number;
  cooldown_until: string | null;
  key_encrypted: string | null;
};
type Policy = {
  max_tokens: number;
  max_prompt_chars: number;
  daily_request_limit: number | null;
};
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function requestId(): string {
  return crypto.randomUUID();
}
function safeTask(value: unknown): string {
  return typeof value === "string" && /^[a-z][a-z0-9_-]{1,40}$/.test(value) ? value : "default";
}
function isServiceRole(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return false;
  // Supabase projects may use the newer sb_secret_* server key format, which
  // is not a JWT. It is still safe here because this is an internal function
  // and the comparison is against the function's own server-side secret.
  if (SERVICE_ROLE && token === SERVICE_ROLE) return true;
  try {
    const part = token.split(".")[1];
    if (!part) return false;
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}
function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isInteger(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function classifyStatus(status: number): string {
  if (status === 401 || status === 403) return "provider_invalid_key";
  if (status === 402) return "provider_credit_or_budget";
  if (status === 429) return "provider_rate_limited";
  if (status >= 500) return "provider_5xx";
  return `provider_http_${status}`;
}
function isDue(row: KeyRow): boolean {
  return !row.cooldown_until || new Date(row.cooldown_until).getTime() <= Date.now();
}
async function decrypt(secretId: string): Promise<string | null> {
  const { data, error } = await admin.rpc("decrypt_vault_secret", { p_secret_id: secretId });
  if (error || typeof data !== "string" || !data) return null;
  return data;
}
async function loadPolicy(task: string): Promise<Policy> {
  const { data } = await admin.from("ai_gateway_policies").select("max_tokens,max_prompt_chars,daily_request_limit").eq("task", task).maybeSingle();
  return data ?? { max_tokens: 1000, max_prompt_chars: 16000, daily_request_limit: 5000 };
}
async function loadKeys(): Promise<KeyRow[]> {
  const { data, error } = await admin
    .from("ai_gateway_key_state")
    .select("api_vault_id,provider,account_label,priority,model,base_url,is_enabled,state,failure_count,cooldown_until,api_vault!inner(key_encrypted,is_active,service_name)")
    .eq("is_enabled", true)
    .in("state", ["healthy", "degraded"])
    .eq("api_vault.is_active", true)
    .in("provider", PROVIDER_ORDER)
    .order("priority", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((value) => {
    const row = value as KeyRow & { api_vault: { key_encrypted: string | null } };
    return { ...row, key_encrypted: row.api_vault?.key_encrypted ?? null };
  }).filter((row) => row.key_encrypted && isDue(row));
}
async function markFailure(row: KeyRow, code: string): Promise<void> {
  const quarantine = code === "provider_invalid_key";
  const cooldownMinutes = quarantine ? 1440 : code === "provider_credit_or_budget" ? 60 : 5;
  await admin.from("ai_gateway_key_state").update({
    state: quarantine ? "quarantined" : "degraded",
    failure_count: row.failure_count + 1,
    cooldown_until: new Date(Date.now() + cooldownMinutes * 60_000).toISOString(),
    last_failure_code: code,
    updated_at: new Date().toISOString(),
  }).eq("api_vault_id", row.api_vault_id);
}
async function markSuccess(row: KeyRow): Promise<void> {
  await admin.from("ai_gateway_key_state").update({
    state: "healthy", failure_count: 0, cooldown_until: null,
    last_success_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("api_vault_id", row.api_vault_id);
}
async function audit(input: Record<string, unknown>): Promise<void> {
  await admin.from("ai_gateway_usage_events").insert(input);
}
async function callProvider(row: KeyRow, key: string, model: string, messages: ChatMessage[], temperature: number, maxTokens: number, jsonMode: boolean): Promise<{ status: number; text: string; outputChars: number }> {
  const base = row.base_url || DEFAULT_BASE_URLS[row.provider] || "";
  const headers: Record<string, string> = { "content-type": "application/json", authorization: `Bearer ${key}` };
  if (row.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://YOUR_DOMAIN";
    headers["X-Title"] = "Banglar Voice AI Gateway";
  }
  const endpoint = `${base.replace(/\/$/, "")}/chat/completions`;
  const requestBody = (includeJsonFormat: boolean) => JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(includeJsonFormat ? { response_format: { type: "json_object" } } : {}),
  });
  let response = await fetch(endpoint, {
    method: "POST", headers, signal: AbortSignal.timeout(14_000),
    body: requestBody(jsonMode),
  });
  // Some OpenAI-compatible providers/models reject response_format even though
  // they support normal chat completions. Retry without it; the newsroom prompt
  // still requires a JSON object and the application parser validates the result.
  if (jsonMode && response.status === 400) {
    response = await fetch(endpoint, {
      method: "POST", headers, signal: AbortSignal.timeout(3_000),
      body: requestBody(false),
    });
  }
  const body = await response.text();
  if (!response.ok) throw Object.assign(new Error(classifyStatus(response.status)), { status: response.status, body: body.slice(0, 200) });
  let parsed: { choices?: Array<{ message?: { content?: string } }> } = {};
  try { parsed = JSON.parse(body); } catch { throw Object.assign(new Error("provider_invalid_json"), { status: response.status }); }
  const text = parsed.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw Object.assign(new Error("provider_empty_response"), { status: response.status });
  return { status: response.status, text, outputChars: text.length };
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  const id = requestId();
  const started = Date.now();
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed", request_id: id }, 405);
  if (!isServiceRole(req)) return json({ ok: false, error: "service_role_required", request_id: id }, 403);
  try {
    const body = await req.json() as { task?: unknown; messages?: unknown; model?: unknown; temperature?: unknown; max_tokens?: unknown; tenant_id?: unknown; metadata?: unknown };
    const task = safeTask(body.task);
    const policy = await loadPolicy(task);
    const messages = Array.isArray(body.messages) ? body.messages.filter((m): m is ChatMessage => !!m && typeof m === "object" && ["system", "user", "assistant"].includes((m as ChatMessage).role) && typeof (m as ChatMessage).content === "string").map((m) => ({ ...m, content: m.content.slice(0, policy.max_prompt_chars) })) : [];
    if (!messages.length) return json({ ok: false, error: "messages_required", request_id: id }, 400);
    const maxTokens = clampInt(body.max_tokens, policy.max_tokens, 64, policy.max_tokens);
    const temperature = Math.max(0, Math.min(1, Number(body.temperature ?? 0.2)));
    const requestedModel = typeof body.model === "string" && body.model.length < 160 ? body.model : "";
    const metadata = typeof body.metadata === "object" && body.metadata ? body.metadata as Record<string, unknown> : {};
    const jsonMode = metadata.json_mode === true;
    const keys = (await loadKeys()).sort((a, b) => PROVIDER_ORDER.indexOf(a.provider) - PROVIDER_ORDER.indexOf(b.provider) || a.priority - b.priority);
    if (!keys.length) return json({ ok: false, error: "no_healthy_provider", request_id: id }, 503);
    const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    for (const row of keys) {
      const key = await decrypt(row.key_encrypted!);
      if (!key) { await markFailure(row, "vault_decrypt_failed"); continue; }
      const model = requestedModel || row.model || (row.provider === "groq" ? "openai/gpt-oss-120b" : "meta-llama/llama-3.1-8b-instruct");
      try {
        const result = await callProvider(row, key, model, messages, temperature, maxTokens, jsonMode);
        await markSuccess(row);
        await audit({ request_id: id, task, provider: row.provider, api_vault_id: row.api_vault_id, account_label: row.account_label, model, status_code: result.status, outcome: "success", latency_ms: Date.now() - started, input_chars: inputChars, output_chars: result.outputChars, tenant_id: typeof body.tenant_id === "string" ? body.tenant_id : null, metadata });
        return json({ ok: true, request_id: id, provider: row.provider, model, answer: result.text });
      } catch (error) {
        const code = error instanceof Error ? error.message : "provider_error";
        const status = typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 0;
        await markFailure(row, code);
        await audit({ request_id: id, task, provider: row.provider, api_vault_id: row.api_vault_id, account_label: row.account_label, model, status_code: status, outcome: code === "provider_invalid_key" ? "rejected" : code === "provider_rate_limited" ? "provider_error" : "provider_error", latency_ms: Date.now() - started, input_chars: inputChars, output_chars: 0, error_code: code, tenant_id: typeof body.tenant_id === "string" ? body.tenant_id : null, metadata: {} });
      }
    }
    return json({ ok: false, error: "all_providers_failed", request_id: id }, 503);
  } catch (error) {
    console.error("ai-gateway", id, error instanceof Error ? error.message : String(error));
    return json({ ok: false, error: "gateway_internal_error", request_id: id }, 500);
  }
});
