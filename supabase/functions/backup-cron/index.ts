// =============================================================================
// backup-cron — scheduled S3 backup for Banglar Voice.
// -----------------------------------------------------------------------------
// Runs on a Supabase cron schedule (e.g. daily 02:00). Dumps the database via
// the Supabase Management API and uploads the .sql dump to an S3-compatible
// bucket (SigV4), then posts to a Slack webhook (optional) and writes an
// audit_log row.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF,
//      SUPABASE_ACCESS_TOKEN, S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY,
//      S3_BUCKET, S3_PREFIX, SLACK_WEBHOOK_URL (optional).
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

async function hmac(key: string | Uint8Array, data: string): Promise<Uint8Array> {
  const encoded = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const h = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoded),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", h, toArrayBuffer(new TextEncoder().encode(data)));
  return new Uint8Array(sig);
}

async function hmacHex(key: Uint8Array, data: string): Promise<string> {
  const h = await hmac(key, data);
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Minimal AWS SigV4 signing for an S3-compatible endpoint. */
async function s3Sign(
  method: string,
  path: string,
  body: string,
  contentType: string,
  amzDate: string,
): Promise<string> {
  const accessKey = Deno.env.get("S3_ACCESS_KEY") ?? "";
  const secretKey = Deno.env.get("S3_SECRET_KEY") ?? "";
  const region = Deno.env.get("S3_REGION") ?? "us-east-1";
  const service = "s3";
  const host = Deno.env.get("S3_ENDPOINT") ?? "";
  const payloadHex = await sha256Hex(body);
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHex}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHex}`;
  const scope = `${amzDate.slice(0, 8)}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256Hex(canonicalRequest)}`;
  const kDate = await hmac(secretKey, amzDate.slice(0, 8));
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = await hmacHex(kSigning, stringToSign);
  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

Deno.serve(async () => {
  const client = createClient(SUPABASE_URL, SERVICE_ROLE);
  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${date}.sql`;
  const bucket = Deno.env.get("S3_BUCKET") ?? "bv-backup";
  const prefix = Deno.env.get("S3_PREFIX") ?? "backups";
  const endpoint = Deno.env.get("S3_ENDPOINT") ?? "";
  const path = `/${prefix}/${filename}`;

  try {
    // 1. Dump the database via the Supabase Management API.
    const projectRef = Deno.env.get("SUPABASE_PROJECT_REF") ?? "";
    const mgmtToken = Deno.env.get("SUPABASE_ACCESS_TOKEN") ?? "";
    const dumpRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/backups`, {
      headers: { Authorization: `Bearer ${mgmtToken}` },
    });
    if (!dumpRes.ok) throw new Error(`dump ${dumpRes.status}`);
    const body = await dumpRes.text();

    // 2. Upload the dump to S3 (SigV4).
    const contentType = "application/sql";
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const auth = await s3Sign("PUT", path, body, contentType, amzDate);
    const putRes = await fetch(`https://${endpoint}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-content-sha256": await sha256Hex(body),
        "x-amz-date": amzDate,
        Authorization: auth,
      },
      body,
    });
    if (!putRes.ok) throw new Error(`s3 ${putRes.status}`);

    // 3. Optional Slack notification.
    const slack = Deno.env.get("SLACK_WEBHOOK_URL");
    if (slack) {
      await fetch(slack, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Banglar Voice backup complete: ${filename} (${body.length} bytes)` }),
      });
    }

    // 4. Audit log.
    await client.from("audit_log").insert({ action: "backup", detail: { filename, bytes: body.length } });

    return new Response(JSON.stringify({ ok: true, filename, bytes: body.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("backup-cron", e);
    return new Response(JSON.stringify({ ok: false, error: message }), { status: 500 });
  }
});