import { Sentry } from "../_shared/sentry.ts";
// =============================================================================
// paywall — membership gating for the Banglar Voice monetization plan.
// -----------------------------------------------------------------------------
// Given a user, returns whether they have an active premium/team subscription
// and how many free articles they have left this month (metered paywall).
// The frontend blurs content after the free limit and shows the upgrade CTA.
//
// Authorization: any authenticated user may check their own entitlement.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors, json, getUserRole } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_ARTICLES_PER_MONTH = 10;

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
    const client = callerClient(req);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    // Active paid subscription?
    const { data: sub } = await client
      .from("subscriptions")
      .select("plan, status, expires_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isPaid = !!sub && sub.plan !== "free" && (!sub.expires_at || new Date(sub.expires_at) > new Date());

    // Metered count: articles read this month (reading_history rows).
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count } = await client
      .from("reading_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("last_read_at", monthStart.toISOString());

    const freeLeft = Math.max(0, FREE_ARTICLES_PER_MONTH - (count ?? 0));

    return json({
      is_paid: isPaid,
      plan: isPaid ? sub?.plan : "free",
      free_articles_per_month: FREE_ARTICLES_PER_MONTH,
      free_articles_left: isPaid ? Infinity : freeLeft,
      paywalled: !isPaid && freeLeft <= 0,
    });
  } catch (e) {
    console.error("paywall", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});