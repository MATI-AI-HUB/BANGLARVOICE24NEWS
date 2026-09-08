// =============================================================================
// two-factor — TOTP 2FA for Banglar Voice admin/editor accounts.
// -----------------------------------------------------------------------------
//   POST /two-factor/enable   -> generates a TOTP secret + otpauth URL (QR)
//   POST /two-factor/verify   -> verifies a 6-digit code (speakeasy-compatible
//                                TOTP: HMAC-SHA1, 30s step, 6 digits)
//   POST /two-factor/disable  -> disables 2FA (requires a valid code)
//
// The secret is stored on profiles.two_factor_secret. In production, prefer
// pgsodium encryption (see getApiKey) — this function keeps it plaintext only
// for the demo path and logs an audit row on enable/disable.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- minimal TOTP (RFC 6238) — no external dep needed -----------------------
function base32Encode(buf: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0, out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function hmacSha1(key: Uint8Array, msg: Uint8Array): Uint8Array {
  const blockSize = 64;
  const keyBytes = key.length > blockSize ? key.slice(0, blockSize) : key;
  const padded = new Uint8Array(blockSize);
  padded.set(keyBytes);
  const ipad = new Uint8Array(blockSize), opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = padded[i] ^ 0x36;
    opad[i] = padded[i] ^ 0x5c;
  }
  const inner = new Uint8Array(ipad.length + msg.length);
  inner.set(ipad); inner.set(msg, ipad.length);
  const innerHash = new Uint8Array(await crypto.subtle.digest("SHA-1", inner));
  const outer = new Uint8Array(opad.length + innerHash.length);
  outer.set(opad); outer.set(innerHash, opad.length);
  return new Uint8Array(await crypto.subtle.digest("SHA-1", outer));
}

function base32Decode(s: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = s.toUpperCase().replace(/=+$/, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

function totp(secretB32: string, timeStep = 30, digits = 6): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { msg[i] = c & 0xff; c = Math.floor(c / 256); }
  const key = base32Decode(secretB32);
  const hash = hmacSha1(key, msg);
  const offset = hash[hash.length - 1] & 0x0f;
  const bin = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  return String(bin % 10 ** digits).padStart(digits, "0");
}

function randomSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

function base32Encode(buf: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0, out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

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
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop() ?? "";

  try {
    const client = callerClient(req);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    if (action === "enable") {
      const secret = randomSecret();
      await client.from("profiles").update({ two_factor_secret: secret, two_factor_enabled: true }).eq("id", user.id);
      await client.from("audit_log").insert({ actor_id: user.id, action: "2fa_enable", detail: {} });
      const otpauth = `otpauth://totp/BanglarVoice:${user.email}?secret=${secret}&issuer=BanglarVoice`;
      return json({ secret, otpauth_url: otpauth });
    }

    if (action === "verify") {
      const { code } = await req.json();
      const { data: prof } = await client.from("profiles").select("two_factor_secret").eq("id", user.id).single();
      if (!prof?.two_factor_secret) return json({ error: "2fa not enabled" }, 400);
      const ok = generate(prof.two_factor_secret) === String(code);
      return json({ valid: ok });
    }

    if (action === "disable") {
      const { code } = await req.json();
      const { data: prof } = await client.from("profiles").select("two_factor_secret").eq("id", user.id).single();
      if (!prof?.two_factor_secret) return json({ error: "2fa not enabled" }, 400);
      if (generate(prof.two_factor_secret) !== String(code)) return json({ error: "invalid code" }, 400);
      await client.from("profiles").update({ two_factor_secret: "", two_factor_enabled: false }).eq("id", user.id);
      await client.from("audit_log").insert({ actor_id: user.id, action: "2fa_disable", detail: {} });
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 404);
  } catch (e) {
    console.error("two-factor", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});