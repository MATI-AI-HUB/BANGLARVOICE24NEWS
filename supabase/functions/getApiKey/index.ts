// =============================================================================
// getApiKey — server-side decryption of a vault-stored 3rd-party API key.
// -----------------------------------------------------------------------------
// The ONLY way any app (Flutter reader/reporter/admin, Next.js website,
// admin console) may obtain third-party keys. Frontends NEVER hardcode keys;
// the admin console stores/rotates them in the api_vault without rebuilds.
//
// Authorization: only admin / chief_editor users, or service-role signed calls
// (edge-to-edge workers). ai-process-report reads the same vault server-side
// without exposing keys to any caller.
//
// Usage (client):
//   const { data } = await supabase.functions.invoke("getApiKey", {
//     body: { service_name: "OPENAI_API_KEY", environment: "prod" },
//   });
//   data.key            // e.g. "sk-..."
//   data.usage_percent  // 0-100
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors, json, getUserRole } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service-role client for vault reads (RLS bypassed deliberately — this is the
// server-side secret path; authorization is checked separately below).
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// Client bound to the caller's user JWT so profiles lookup resolves correctly.
function callerClient(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { service_name, environment = "prod" } = await req.json();
    if (!service_name) return json({ error: "service_name required" }, 400);

    // ---- authorization -----------------------------------------------------
    const role = await getUserRole(callerClient(req));
    const allowed = role === "admin" || role === "chief_editor";
    if (!allowed) {
      return json({ error: "forbidden", hint: "admin or chief_editor required" }, 403);
    }

    // ---- fetch the encrypted ref ------------------------------------------
    const { data: row, error: rowErr } = await admin
      .from("api_vault")
      .select("id, service_name, key_encrypted, environment, is_active, last_tested, usage_percent")
      .eq("service_name", service_name)
      .eq("environment", environment)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row || !row.is_active || !row.key_encrypted) {
      return json({ error: "key_not_found", hint: "add it in the admin console API Vault" }, 404);
    }

    // ---- decrypt via pgsodium-backed RPC (schema.sql) ----------------------
    const { data: plain, error: decryptErr } = await admin.rpc("decrypt_vault_secret", {
      p_secret_id: row.key_encrypted,
    });
    if (decryptErr || !plain) {
      return json({ error: "decrypt_failed", hint: "check vault key is mounted" }, 500);
    }

    // ---- update last_tested timestamp --------------------------------------
    await admin.from("api_vault").update({ last_tested: new Date().toISOString() }).eq("id", row.id);

    return json({
      service_name: row.service_name,
      environment: row.environment,
      key: plain,
      usage_percent: row.usage_percent,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("getApiKey", e);
    return json({ error: message }, 500);
  }
});
