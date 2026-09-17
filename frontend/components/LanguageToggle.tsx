'use client';
import { useEffect, useState } from 'react';
import { LOCALE_COOKIE, DEFAULT_LOCALE, type Locale, isLocale } from '@/lib/i18n';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function LanguageToggle() {
  const [current, setCurrent] = useState<Locale>(DEFAULT_LOCALE);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const v = readCookie(LOCALE_COOKIE);
    if (isLocale(v)) setCurrent(v);
  }, []);

  function handleSwitch(next: Locale) {
    if (next === current || isPending) return;
    setIsPending(true);

    // Set cookie
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    setCurrent(next);

    // Bulletproof: full page reload — bypasses ALL Next.js router cache
    // Works on every page: home, article, admin, etc.
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1 text-[11px] font-semibold">
      <button
        onClick={() => handleSwitch('bn')}
        disabled={isPending}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          current === 'bn'
            ? 'bg-white text-crimson'
            : 'text-white/80 hover:text-white'
        } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
        aria-label="বাংলা"
        type="button"
      >
        বাংলা
      </button>
      <span className="text-white/40">|</span>
      <button
        onClick={() => handleSwitch('en')}
        disabled={isPending}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          current === 'en'
            ? 'bg-white text-crimson'
            : 'text-white/80 hover:text-white'
        } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
        aria-label="English"
        type="button"
      >
        EN
      </button>
    </div>
  );
}
