'use client';

import { useEffect, useState } from 'react';

const SAMPLE_BREAKING = [
  'ঢাকায় মেট্রোরেলের নতুন রুট উদ্বোধন আজ',
  'পদ্মা সেতু দিয়ে রেকর্ড যানবাহন পারাপার',
  'আন্তর্জাতিক সংবাদ: জ্বালানি বাজারে নতুন শুল্ক',
];

export function BreakingMarquee() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SAMPLE_BREAKING.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-2 overflow-hidden bg-primary px-4 py-1 text-primary-foreground">
      <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold uppercase">ব্রেকিং</span>
      <span className="truncate text-sm font-medium">{SAMPLE_BREAKING[idx]}</span>
    </div>
  );
}
