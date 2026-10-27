'use client';
import { useEffect, useState } from 'react';
import { LOCALE_COOKIE, DEFAULT_LOCALE, type Locale, isLocale } from '@/lib/i18n';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function LanguageToggle({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const [current, setCurrent] = useState<Locale>(locale);

  useEffect(() => {
    const v = readCookie(LOCALE_COOKIE);
    setCurrent(isLocale(v) ? v : locale);
  }, [locale]);

  return (
    <form
      action="/api/set-locale"
      method="POST"
      className="flex items-center gap-1 text-[11px] font-semibold"
    >
      <button
        type="submit"
        name="locale"
        value="bn"
        className={`px-1.5 py-0.5 rounded transition-colors ${
          current === 'bn'
            ? 'bg-white text-crimson'
            : 'text-white/80 hover:text-white'
        }`}
        aria-label="বাংলা"
      >
        বাংলা
      </button>
      <span className="text-white/40">|</span>
      <button
        type="submit"
        name="locale"
        value="en"
        className={`px-1.5 py-0.5 rounded transition-colors ${
          current === 'en'
            ? 'bg-white text-crimson'
            : 'text-white/80 hover:text-white'
        }`}
        aria-label="English"
      >
        EN
      </button>
    </form>
  );
}
