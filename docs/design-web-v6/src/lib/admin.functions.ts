import { createServerFn } from "@tanstack/react-start";

/**
 * Admin console data access.
 * Gated by the shared newsroom console key (same secret used by the 24/7
 * automation pipeline). The key is never bundled in client code — the browser
 * sends what the operator typed and the server compares it constant-time.
 */

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type KeyInput = { key: string };

function assertKey(key: string) {
  const expected = process.env['NEWSROOM_INGEST_KEY'];
  if (!expected) throw new Error("console_disabled");
  if (!key || !timingSafeEqual(key, expected)) throw new Error("unauthorized");
}

export type QueueItem = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string;
  source: string;
  agent: string;
  status: string;
  created_at: string;
};

export const listQueue = createServerFn({ method: "POST" })
  .inputValidator((input: KeyInput) => ({ key: String(input?.key ?? "") }))
  .handler(async ({ data }) => {
    assertKey(data.key);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("newsroom_queue")
      .select("id, slug, title, dek, category, source, agent, status, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error("storage_failed");

    const items = (rows ?? []) as QueueItem[];
    return {
      items,
      stats: {
        total: items.length,
        pending: items.filter((i) => i.status === "pending").length,
        approved: items.filter((i) => i.status === "approved").length,
        rejected: items.filter((i) => i.status === "rejected").length,
      },
    };
  });

export const setQueueStatus = createServerFn({ method: "POST" })
  .inputValidator((input: KeyInput & { id: string; status: "approved" | "rejected" | "pending" }) => ({
    key: String(input?.key ?? ""),
    id: String(input?.id ?? ""),
    status: input?.status,
  }))
  .handler(async ({ data }) => {
    assertKey(data.key);
    if (!["approved", "rejected", "pending"].includes(data.status)) throw new Error("bad_status");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("newsroom_queue")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("storage_failed");
    return { ok: true };
  });
