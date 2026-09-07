import { createFileRoute } from "@tanstack/react-router";

/**
 * 24/7 AI newsroom automation intake.
 *
 * The automation pipeline (n8n / scheduler / agent) POSTs story drafts here.
 * Nothing is published automatically — every draft lands in the editorial
 * queue with status "pending" and requires a human editor's approval,
 * matching the published editorial policy at /about#ai.
 *
 * Auth: header `x-ingest-key: <NEWSROOM_INGEST_KEY>`
 */

type Draft = {
  title?: unknown;
  dek?: unknown;
  category?: unknown;
  body?: unknown;
  source?: unknown;
  tags?: unknown;
  image_url?: unknown;
  agent?: unknown;
  slug?: unknown;
};

const CATEGORIES = new Set([
  "national",
  "international",
  "politics",
  "economy",
  "sports",
  "entertainment",
  "technology",
  "opinion",
]);

function slugify(input: string) {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || `story-${Date.now()}`
  );
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env['NEWSROOM_INGEST_KEY'];
        if (!expected) return json({ error: "ingest_disabled" }, 503);

        const provided = request.headers.get("x-ingest-key") ?? "";
        if (!provided || !timingSafeEqual(provided, expected)) {
          return json({ error: "unauthorized" }, 401);
        }

        let payload: Draft | Draft[];
        try {
          payload = (await request.json()) as Draft | Draft[];
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const drafts = Array.isArray(payload) ? payload : [payload];
        if (drafts.length === 0 || drafts.length > 50) {
          return json({ error: "batch_size_must_be_1_to_50" }, 400);
        }

        const rows = [];
        for (const d of drafts) {
          const title = typeof d.title === "string" ? d.title.trim() : "";
          if (title.length < 5) return json({ error: "title_required", detail: "কমপক্ষে ৫ অক্ষরের শিরোনাম প্রয়োজন" }, 400);

          const bodyArr = Array.isArray(d.body)
            ? d.body.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
            : typeof d.body === "string"
              ? d.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
              : [];
          if (bodyArr.length === 0) return json({ error: "body_required" }, 400);

          const category = typeof d.category === "string" && CATEGORIES.has(d.category) ? d.category : "national";

          rows.push({
            slug: typeof d.slug === "string" && d.slug.trim() ? slugify(d.slug) : slugify(title),
            title,
            dek: typeof d.dek === "string" ? d.dek.trim().slice(0, 400) : "",
            category,
            body: bodyArr.slice(0, 60),
            source: typeof d.source === "string" ? d.source.trim().slice(0, 200) : "",
            tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === "string").slice(0, 10) : [],
            image_url: typeof d.image_url === "string" ? d.image_url.slice(0, 500) : null,
            agent: typeof d.agent === "string" ? d.agent.slice(0, 80) : "automation",
            status: "pending" as const,
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("newsroom_queue")
          .upsert(rows, { onConflict: "slug" })
          .select("id, slug, status");

        if (error) {
          console.error("[ingest] db error", error.message);
          return json({ error: "storage_failed" }, 500);
        }

        return json({ ok: true, queued: data?.length ?? 0, items: data, note: "Pending human editorial review." }, 202);
      },

      GET: async () => json({ service: "banglar-voice-newsroom-ingest", method: "POST", auth: "x-ingest-key header" }),
    },
  },
});
