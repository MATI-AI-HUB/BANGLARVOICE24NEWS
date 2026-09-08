/**
 * Banglar Voice — Supabase client (web frontend).
 *
 * The header breaking ticker (and any future live data) reads from the shared
 * `breaking_ticker` table. Env vars are NEXT_PUBLIC_* so they are inlined by
 * Next.js at build time (safe: publishable keys only — anon key is safe for
 * browsers by design; RLS protects the rows).
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *
 * When the vars are absent the client is `null` and callers must degrade
 * gracefully (BreakingMarquee keeps its fallback texts) — never crash.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const configured =
  url.length > 0 &&
  anonKey.length > 0 &&
  !url.includes('YOUR-PROJECT-REF') &&
  !anonKey.includes('YOUR-PROJECT-REF');

export const supabase = configured ? createClient(url, anonKey) : null;
