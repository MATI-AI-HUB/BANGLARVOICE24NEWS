'use client';

const BREAKING = [
  'ঢাকায় মেট্রোরেলের নতুন রুট উদ্বোধন আজ — সময়সূচি প্রকাশ',
  'পদ্মা সেতু দিয়ে রেকর্ড যানবাহন পারাপার, টোল আদায় ২ কোটি',
  'রপ্তানি আয়ে রেকর্ড — প্রবৃদ্ধির ধারা অব্যাহত',
  'ঐতিহাসিক জয়ে ফাইনালে বাংলাদেশ, উল্লাসে রাজপথ',
  'আবহাওয়ার সতর্কবার্তা: উপকূলে ঘূর্ণিঝড়ের সম্ভাবনা',
];

/**
 * BreakingMarquee — BBC-style scrolling ticker. Pure CSS animation
 * (no JS timers), duplicates the list once for a seamless infinite loop.
 * The first headline is exposed to screen readers; the motion is
 * decorative and disabled under prefers-reduced-motion.
 */
export function BreakingMarquee() {
  return (
    <div className="flex items-center gap-3 overflow-hidden bg-primary px-4 py-1.5 text-primary-foreground">
      <span className="flex shrink-0 items-center gap-1.5 rounded bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
        ব্রেকিং
      </span>
      <div className="relative flex-1 overflow-hidden" role="region" aria-label="ব্রেকিং নিউজ">
        <p className="sr-only">{BREAKING[0]}</p>
        <div
          aria-hidden
          className="marquee-track flex w-max hover:[animation-play-state:paused]"
        >
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-center">
              {BREAKING.map((t) => (
                <li key={`${copy}-${t}`} className="flex items-center whitespace-nowrap text-sm font-medium">
                  {t}
                  <span className="mx-8 h-1 w-1 rounded-full bg-white/50" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
