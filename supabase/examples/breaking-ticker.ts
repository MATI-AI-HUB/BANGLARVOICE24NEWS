// =============================================================================
// breaking_ticker client example — Next.js (App Router, server component)
// -----------------------------------------------------------------------------
// The website header marquee MUST read from Supabase (not a hardcoded string).
// Place this in frontend/lib/supabase.ts + call it from your Header component.
//
// It uses the anon key + RLS (schema.sql allows anon SELECT only when
// is_active = true). The value also updates LIVE over Realtime — see the
// subscription example at the bottom.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type BreakingTicker = {
  id: number;
  text_bn: string;
  is_active: boolean;
  updated_at: string;
};

// --- Fetch the active ticker row (server component friendly) -----------------
export async function getBreakingTicker(): Promise<BreakingTicker | null> {
  const { data, error } = await supabase
    .from("breaking_ticker")
    .select("id, text_bn, is_active, updated_at")
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("breaking_ticker fetch failed:", error.message);
    return null;
  }
  return data;
}

// --- Live-updating subscription (client component) ----------------------------
// When an editor changes the ticker in the admin console, every open website
// header updates instantly without a reload.
export function subscribeBreakingTicker(onText: (text: string) => void) {
  return supabase
    .channel("breaking_ticker_realtime")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "breaking_ticker" },
      (payload) => {
        const row = payload.new as BreakingTicker;
        if (row.is_active) onText(row.text_bn);
      },
    )
    .subscribe();
}

// --- Example usage in a React Header component ---------------------------------
//
// ```tsx
// // app/header.tsx  (client component)
// "use client";
// import { useEffect, useState } from "react";
// import { getBreakingTicker, subscribeBreakingTicker } from "@/lib/supabase";
//
// export default function Header() {
//   const [text, setText] = useState("এআই অটোমেশন এর মাধ্যমে পরিচালিত বাংলার ভয়েস এর পরীক্ষামূলক সম্প্রচার চলছে।");
//   useEffect(() => {
//     getBreakingTicker().then((t) => t && setText(t.text_bn));
//     const sub = subscribeBreakingTicker(setText);
//     return () => { sub.unsubscribe(); };
//   }, []);
//   // render <BreakingMarquee text={text} />  (the fixed z-20 badge component)
// }
// ```
