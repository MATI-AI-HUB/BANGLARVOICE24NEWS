// Banglar Voice — shared CORS helpers for Supabase Edge Functions (Deno).
// All 3 Flutter apps + website call these functions directly, so CORS is
// wide-open at the edge-function level; authorization happens inside each fn.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

// Resolve the caller's role (staff_reporter / desk_editor / chief_editor / admin…)
// from their profiles row. `client` must carry the caller's user JWT.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserRole(client: any): Promise<string | null> {
  const { data: me } = await client.auth.getUser();
  if (!me?.user) return null;
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", me.user.id)
    .maybeSingle();
  return profile?.role ?? null;
}
