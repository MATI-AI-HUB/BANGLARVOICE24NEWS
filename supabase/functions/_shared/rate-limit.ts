import { createClient } from "npm:@supabase/supabase-js@2";

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const WINDOW_SECONDS: Record<"1 m" | "1 h" | "1 d", number> = {
  "1 m": 60,
  "1 h": 60 * 60,
  "1 d": 24 * 60 * 60,
};

function requestIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function rateLimit(
  req: Request,
  scope: string,
  max: number,
  window: "1 m" | "1 h" | "1 d" = "1 m",
): Promise<RateLimitResult> {
  const seconds = WINDOW_SECONDS[window];
  const key = `rl:${scope}:${requestIdentifier(req)}`;
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (url && token) {
    try {
      const encodedKey = encodeURIComponent(key);
      const increment = await fetch(`${url}/incr/${encodedKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const count = Number((await increment.json())?.result ?? 0);
      if (!increment.ok || !Number.isFinite(count)) throw new Error("Upstash increment failed");
      if (count === 1) {
        const expire = await fetch(`${url}/expire/${encodedKey}/${seconds}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!expire.ok) throw new Error("Upstash expiry failed");
      }
      return {
        limited: count > max,
        remaining: Math.max(0, max - count),
        retryAfterSeconds: seconds,
      };
    } catch (error) {
      console.error("rate-limit redis fallback", error);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return { limited: false, remaining: max, retryAfterSeconds: seconds };
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const windowMinutes = Math.max(1, Math.ceil(seconds / 60));
  const { error: insertError } = await client.from("login_attempts").insert({
    identifier: key,
    success: false,
  });
  if (insertError) {
    console.error("rate-limit database insert failed", insertError);
    return { limited: false, remaining: max, retryAfterSeconds: seconds };
  }

  const { data, error } = await client.rpc("is_rate_limited", {
    p_identifier: key,
    p_window_minutes: windowMinutes,
    p_max: max,
  });
  if (error) {
    console.error("rate-limit database check failed", error);
    return { limited: false, remaining: max, retryAfterSeconds: seconds };
  }

  return {
    limited: data === true,
    remaining: data === true ? 0 : max,
    retryAfterSeconds: seconds,
  };
}
