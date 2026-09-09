// =============================================================================
// rate-limit — shared Upstash Redis rate-limit middleware for edge functions.
// -----------------------------------------------------------------------------
// Usage (in any edge function):
//   import { rateLimit } from "../_shared/rate-limit.ts";
//   const rl = await rateLimit(req, "login", 60, "1 m");
//   if (rl.limited) return json({ error: "rate limited" }, 429);
//
// Falls back to the DB-backed login_attempts table when UPSTASH_REDIS_REST_URL
// is not configured, so it works in local/dev without Redis.
// =============================================================================

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const WINDOW_SECONDS: Record<string, number> = {
  "1 m": 60,
  "1 h": 3600,
  "1 d": 86400,
};

export async function rateLimit(
  req: Request,
  identifier: string,
  max: number,
  window: "1 m" | "1 h" | "1 d" = "1 m",
): Promise<RateLimitResult> {
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  const key = `rl:${identifier}`;
  const windowMs = WINDOW_MS[window] ?? 60;

  if (url && token) {
    try {
      const res = await fetch(`${url}/incr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([key]),
      });
      const data = await res.json();
      const count = Number(data?.result ?? 0);
      if (count === 1) {
        await fetch(`${url}/expire`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify([key, Math.ceil(windowMs / 1000)]),
        });
      }
      return { limited: count > max, remaining: Math.max(0, max - count) };
    } catch {
      // fall through to DB fallback
    }
  }

  // DB fallback: count login_attempts in the window.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase.rpc("is_rate_limited", {
    p_identifier: identifier,
    p_window_minutes: Math.max(1, Math.ceil(windowMs / 60000)),
    p_max: max,
  });
  if (error) return { limited: false, remaining: max };
  return { limited: data === true, remaining: data === true ? 0 : max };
}