// Banglar Voice — authenticated newsroom worker health/control endpoint.
// The actual long-running AI worker remains in worker/ and is deployed as a
// separate Node service. This Edge Function is only the Supabase boundary.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-newsroom-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function authorized(req: Request, configuredKey: string): boolean {
  const suppliedKey = req.headers.get("x-newsroom-key")?.trim() ?? "";
  return configuredKey.length > 0 && suppliedKey.length > 0 &&
    suppliedKey === configuredKey;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const configuredKey = (Deno.env.get("NEWSROOM_INGEST_KEY") ?? "").trim();
  if (!configuredKey) {
    console.error("NEWSROOM_INGEST_KEY is not configured; refusing request");
    return json({ error: "Service misconfigured" }, 503);
  }

  if (!authorized(req, configuredKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  return json({
    ok: true,
    service: "newsroom-worker",
    time: new Date().toISOString(),
    stale_fixed: true,
  });
});
