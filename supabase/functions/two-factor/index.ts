import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(value: string): Uint8Array {
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/g, "")) {
    const index = BASE32.indexOf(character);
    if (index < 0) continue;
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

function randomSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));
}

async function totp(secret: string, counter: number): Promise<string> {
  const message = new Uint8Array(8);
  let value = counter;
  for (let index = 7; index >= 0; index -= 1) {
    message[index] = value & 255;
    value = Math.floor(value / 256);
  }
  const digest = await hmacSha1(base32Decode(secret), message);
  const offset = digest[digest.length - 1] & 15;
  const code = ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);
  return String(code % 1_000_000).padStart(6, "0");
}

async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const counter = Math.floor(Date.now() / 30_000);
  for (const offset of [-1, 0, 1]) {
    if (await totp(secret, counter + offset) === code) return true;
  }
  return false;
}

function callerClient(req: Request) {
  const authorization = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const action = new URL(req.url).pathname.split("/").pop() ?? "";
  const client = callerClient(req);
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  if (action === "enable") {
    const secret = randomSecret();
    const { error } = await client.from("profiles").update({
      two_factor_secret: secret,
      two_factor_enabled: true,
    }).eq("id", user.id);
    if (error) return json({ error: "could not enable 2fa" }, 500);
    await client.from("audit_log").insert({ actor_id: user.id, action: "2fa_enable", detail: {} });
    return json({
      secret,
      otpauth_url: `otpauth://totp/BanglarVoice:${encodeURIComponent(user.email ?? user.id)}?secret=${secret}&issuer=BanglarVoice`,
    });
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("two_factor_secret")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.two_factor_secret) return json({ error: "2fa not enabled" }, 400);

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "");
  const valid = /^\d{6}$/.test(code) && await verifyTotp(profile.two_factor_secret, code);

  if (action === "verify") return json({ valid });
  if (action === "disable") {
    if (!valid) return json({ error: "invalid code" }, 400);
    const { error } = await client.from("profiles").update({
      two_factor_secret: "",
      two_factor_enabled: false,
    }).eq("id", user.id);
    if (error) return json({ error: "could not disable 2fa" }, 500);
    await client.from("audit_log").insert({ actor_id: user.id, action: "2fa_disable", detail: {} });
    return json({ ok: true });
  }

  return json({ error: "unknown action" }, 404);
});
