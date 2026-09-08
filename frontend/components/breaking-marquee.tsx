'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

/**
 * BreakingMarquee — BBC-style scrolling ticker.
 *
 * Layout fix (overlap bug):
 *  - Parent `.group` is the ONLY overflow container, but the actual clipping
 *    happens in the flex-1 track (overflow-hidden), NOT the parent — so the
 *    black BREAKING badge (z-20, shrink-0) can never be overlapped.
 *  - Only the INNER text div is animated (Tailwind arbitrary animation
 *    `marquee 30s linear infinite`); the track container itself never moves.
 *  - The text is repeated 3 times; the `marquee` keyframes translate -33.333%
 *    for a seamless infinite loop. Hover pauses via `.group:hover .marquee-track`
 *    (see globals.css). Motion is disabled under prefers-reduced-motion.
 *
 * Live ticker source: the `breaking_ticker` table (is_active = true). The
 * component subscribes to postgres_changes so an editor flipping a ticker row
 * updates the header in real time — no hardcoded text. When Supabase is not
 * configured (no env keys) the fetch fails gracefully and we render the
 * fallback line below instead (never crashes the build or the page).
 */

const FALLBACK_TEXTS = [
  'এআই অটোমেশন এর মাধ্যমে পরিচালিত বাংলার ভয়েস এর পরীক্ষামূলক সম্প্রচার চলছে।',
];

export function BreakingMarquee() {
  const [texts, setTexts] = useState<string[]>(FALLBACK_TEXTS);

  useEffect(() => {
    if (!supabase) return; // no env keys → keep fallback, no crash

    // Supabase checked non-null above; capture locally for the closures so
    // TypeScript can narrow it (null-check on the module const doesn't
    // propagate into the async/cleanup callbacks).
    const sb = supabase;
    const load = async () => {
      if (!sb) return;
      const { data } = await sb
        .from('breaking_ticker')
        .select('text')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data?.length) {
        setTexts(data.map((d) => d.text));
      }
    };

    load();
    const channel = sb
      .channel('breaking_ticker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'breaking_ticker' },
        load,
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  return (
    <div className="group relative flex h-9 overflow-hidden bg-[#CC0000]">
      {/* Fixed BREAKING badge — never overlapped (z-20, shrink-0) */}
      <div
        className="z-20 flex h-full shrink-0 items-center bg-black px-6 shadow-[6px_0_12px_rgba(0,0,0,0.4)]"
        role="status"
        aria-label="ব্রেকিং নিউজ"
      >
        <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#CC0000]" aria-hidden />
          Breaking
        </span>
      </div>

      {/* Track — the ONLY clipping container (flex-1, overflow-hidden) */}
      <div
        className="relative h-full flex-1 overflow-hidden bg-[#CC0000]"
        role="region"
        aria-label="ব্রেকিং নিউজ টিকার"
      >
        <p className="sr-only">{texts[0]}</p>
        {/* Only this inner text div animates; the track never moves */}
        <div className="absolute inset-0 flex items-center">
          <div className="marquee-track flex items-center whitespace-nowrap will-change-transform animate-[marquee_30s_linear_infinite]">
            {[0, 1, 2].map((copy) => (
              <span
                key={copy}
                className="flex items-center whitespace-nowrap text-sm font-medium text-white"
                aria-hidden
              >
                {texts.map((text) => (
                  <span key={text} className="flex items-center">
                    {text}
                    <span className="mx-8 h-1 w-1 shrink-0 rounded-full bg-white/60" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
