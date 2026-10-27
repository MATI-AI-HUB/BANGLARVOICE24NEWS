const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-worker-secret",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function rpc<T>(base: string, serviceKey: string, name: string, args: unknown): Promise<T> {
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`queue_rpc_${name}_${response.status}`);
  return await response.json() as T;
}

type QueueMessage = {
  msg_id: number;
  read_ct: number;
  message: { email?: string; subscriber_id?: string };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const workerSecret = Deno.env.get("NEWSLETTER_WORKER_SECRET") || "";
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("NEWSLETTER_FROM_EMAIL") || "";
  if (!base || !serviceKey || !workerSecret || !resendKey || !from) {
    return json({ error: "worker_not_configured" }, 503);
  }

  const supplied = request.headers.get("x-worker-secret") || "";
  const bearer = request.headers.get("authorization") || "";
  if (!constantTimeEqual(supplied, workerSecret) || !constantTimeEqual(bearer, `Bearer ${serviceKey}`)) {
    return json({ error: "unauthorized" }, 401);
  }

  let messages: QueueMessage[];
  try {
    messages = await rpc<QueueMessage[]>(base, serviceKey, "read_newsletter_queue", {
      p_visibility_seconds: 60,
      p_batch: 5,
    });
  } catch (error) {
    console.error("newsletter_queue_read_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "queue_unavailable" }, 503);
  }

  let sent = 0;
  let deferred = 0;
  let invalid = 0;
  for (const item of messages || []) {
    const email = item?.message?.email;
    const msgId = Number(item?.msg_id);
    if (!Number.isSafeInteger(msgId) || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      try {
        await rpc(base, serviceKey, "archive_newsletter_message", { p_msg_id: msgId });
        invalid += 1;
      } catch {
        deferred += 1;
      }
      continue;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${resendKey}`,
          "content-type": "application/json",
          "Idempotency-Key": `bv-newsletter-${msgId}`,
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Welcome to the Banglar Voice newsletter",
          text: "Thank you for subscribing to Banglar Voice. You will receive our editorial newsletter when it is sent.",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`resend_http_${response.status}`);
      await rpc(base, serviceKey, "archive_newsletter_message", { p_msg_id: msgId });
      sent += 1;
    } catch (error) {
      const attempts = Math.max(1, Number(item.read_ct) || 1);
      const delay = Math.min(86_400, 15 * 2 ** Math.min(attempts, 11));
      try {
        await rpc(base, serviceKey, "defer_newsletter_message", {
          p_msg_id: msgId,
          p_seconds: delay,
        });
      } catch (queueError) {
        console.error("newsletter_retry_defer_failed", queueError instanceof Error ? queueError.message : "unknown");
      }
      console.warn("newsletter_send_deferred", error instanceof Error ? error.message : "unknown", { attempts, delay });
      deferred += 1;
    }
  }

  return json({ ok: true, processed: (messages || []).length, sent, deferred, invalid });
});
