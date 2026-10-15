// =============================================================================
// getApiKey — server-side decryption of a vault-stored 3rd-party API key.
// -----------------------------------------------------------------------------
// The ONLY way any app (Flutter reader/reporter/admin, Next.js website,
// admin console) may obtain third-party keys. Frontends NEVER hardcode keys;
// the admin console stores/rotates them in the api_vault without rebuilds.
//
// Authorization: only admin / chief_editor users. Provider calls must remain
// server-side through the AI gateway or purpose-specific worker functions.
//
// Usage (client):
//   const { data } = await supabase.functions.invoke("getApiKey", {
//     body: { service_name: "OPENAI_API_KEY", environment: "prod" },
//   });
//   data.key_available   // true/false; plaintext is never returned
//   data.usage_percent   // 0-100
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

    // The function is an authenticated metadata/readiness endpoint only.
    // Decryption is deliberately confined to server-side gateway/worker paths;
    // returning plaintext to a browser or mobile client is not SaaS-safe.
    return json({
      service_name: row.service_name,
      environment: row.environment,
      key_available: Boolean(row.key_encrypted),
      usage_percent: row.usage_percent,
      last_tested: row.last_tested,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("getApiKey", e);
    return json({ error: message }, 500);
  }
});
