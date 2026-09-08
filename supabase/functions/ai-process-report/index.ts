// =============================================================================
// ai-process-report — 24/7 AI pipeline for one field report.
// -----------------------------------------------------------------------------
// Trigger: called by the DB trigger in schema.sql when a field_report is
// inserted OR by the editorial app after submit. Steps:
//   1. Pull the report row (+ media_urls) via service role
//   2. Transcribe first audio/video with Whisper (OpenAI) — Bangla
//   3. bn <-> en translate the description
//   4. Fact-check -> ai_score 0-100
//   5. 3-bullet AI সারাংশ (ai_summary)
//   6. Duplicate check against recent reports -> ai_duplicate_of
//   7. UPDATE the same row (server-side, bypasses RLS)
//
// Keys: fetched at runtime from the api_vault via the vault helper below —
// NEVER hardcoded, NEVER in the client. No key present -> graceful skip
// (report still saved; ai fields stay empty defaults).
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// --- vault: decrypt a stored key through pgsodium ----------------------------
async function vaultKey(serviceName: string): Promise<string | null> {
  const { data: vaultRow } = await supabase
    .from("api_vault")
    .select("key_encrypted")
    .eq("service_name", serviceName)
    .eq("is_active", true)
    .maybeSingle();
  if (!vaultRow?.key_encrypted) return null;

  // pgsodium decrypt of the referenced secret (server-side only, via RPC that
  // is restricted to service_role in schema.sql).
  const { data: decrypted, error } = await supabase.rpc("decrypt_vault_secret", {
    p_secret_id: vaultRow.key_encrypted,
  });
  if (error || !decrypted) return null;
  return typeof decrypted === "string" ? decrypted : null;
}

// --- whisper: audio/video -> Bangla text --------------------------------------
async function transcribe(mediaUrl: string, openaiKey: string): Promise<string> {
  const bytes = await fetch(mediaUrl).then((r) => r.arrayBuffer());
  const form = new FormData();
  form.append("file", new Blob([bytes]), "field-report-media");
  form.append("model", "whisper-1");
  form.append("language", "bn");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`whisper ${res.status}`);
  const data = await res.json();
  return data.text ?? "";
}

// --- chat helper for translate / fact-check / summary -------------------------
async function chat(openaiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { report_id } = await req.json();
    if (!report_id) return json({ error: "report_id required" }, 400);

    const { data: report, error: fetchErr } = await supabase
      .from("field_reports")
      .select("*")
      .eq("id", report_id)
      .maybeSingle();
    if (fetchErr || !report) return json({ error: "report not found" }, 404);

    const openaiKey = await vaultKey("OPENAI_API_KEY");
    const patch: Record<string, unknown> = {};
    let transcript = report.ai_transcript ?? "";
    let summary = report.ai_summary ?? "";
    let score: number | null = report.ai_score;
    let duplicateOf: string | null = report.ai_duplicate_of;

    if (openaiKey) {
      // 1) Transcribe (first audio/video in media_urls, if any)
      const media = (report.media_urls ?? []) as string[];
      const av = media.find((m) => /\.(mp3|mp4|m4a|wav|mov|webm|mpeg)(\?|$)/i.test(m));
      if (av && !transcript) {
        try {
          transcript = await transcribe(
            av.startsWith("http") ? av : `${SUPABASE_URL}/storage/v1/object/public/field-media/${av}`,
            openaiKey,
          );
        } catch {
          transcript = ""; // graceful: keep report, skip AI fields
        }
      }

      const sourceText = transcript || report.description || report.title;

      // 2) Translate bn <-> en (auto-detect via script check)
      const isBn = /[\u0980-\u09FF]/.test(sourceText);
      const translated = await chat(
        openaiKey,
        isBn
          ? "You are a news translator. Translate Bangla to natural English news text. Reply with ONLY the translation."
          : "You are a news translator. Translate English to natural Bangla (Bengali) news text. Reply with ONLY the translation.",
        sourceText.slice(0, 4000),
      );

      // 3) Fact-check score 0-100
      const scored = await chat(
        openaiKey,
        "You are a news fact-checker. Given a short field report, return ONLY an integer 0-100 where 100 = fully verifiable/corroborated, 50 = plausible but unverified, 0 = clearly false or hoax. No explanation.",
        sourceText.slice(0, 2000),
      );
      score = Math.max(0, Math.min(100, parseInt(scored.replace(/\D/g, ""), 10) || 50));

      // 4) 3-bullet Bangla summary
      summary = await chat(
        openaiKey,
        "তুমি একজন বাংলা সংবাদ সারাংশকারী। নিচের রিপোর্টের ৩টি বুলেট-পয়েন্ট বাংলা সারাংশ দাও, প্রতিটি ১৫ শব্দের মধ্যে। শুধু বুলেট দিন।",
        sourceText.slice(0, 3000),
      );

      // 5) Duplicate check: same title / similar text in last 48h
      const { data: recent } = await supabase
        .from("field_reports")
        .select("id, title, description, ai_summary")
        .gte("created_at", new Date(Date.now() - 48 * 3600_000).toISOString())
        .neq("id", report.id);
      const norm = (s: string) => (s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
      const nSource = norm(sourceText).slice(0, 120);
      if (nSource.length > 40) {
        const hit = (recent ?? []).find(
          (r) => norm(r.title).slice(0, 80) === nSource.slice(0, 80)
            || (norm(r.ai_summary).length > 0 && norm(r.ai_summary).slice(0, 80) === nSource.slice(0, 80)),
        );
        if (hit) duplicateOf = hit.id;
      }

      patch.ai_transcript = transcript;
      patch.ai_summary = summary;
      patch.ai_score = score;
      patch.ai_duplicate_of = duplicateOf;
      patch.ai_translation_en = translated;
    } else {
      // No vault key configured yet — keep row, mark score 0 and report status.
      patch.ai_score = 0;
    }

    const { error: updErr } = await supabase
      .from("field_reports")
      .update(patch)
      .eq("id", report.id);
    if (updErr) throw updErr;

    // Notify the editorial board when a citizen report is ready for review.
    await supabase.from("notifications").insert({
      user_id: null, // broadcast row; FCM fan-out handled by a worker outside
      type: "report_status",
      payload: { field_report_id: report.id, status: report.status, ai_score: score },
    }).maybeSingle();

    return json({ ok: true, id: report.id, ai_score: score, ai_summary: summary, ai_duplicate_of: duplicateOf });
  } catch (e) {
    console.error("ai-process-report", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
