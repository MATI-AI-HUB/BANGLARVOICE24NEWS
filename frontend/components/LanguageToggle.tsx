'use client';
import { useEffect, useState, useTransition } from 'react';
import { LOCALE_COOKIE, DEFAULT_LOCALE, type Locale, isLocale } from '@/lib/i18n';
import { setLocaleAction } from '@/app/actions/locale';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function LanguageToggle() {
  const [current, setCurrent] = useState<Locale>(DEFAULT_LOCALE);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const v = readCookie(LOCALE_COOKIE);
    if (isLocale(v)) setCurrent(v);
  }, []);

  function handleSwitch(next: Locale) {
    if (next === current || pending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      setCurrent(next);
    });
  }

  return (
    <div className="flex items-center gap-1 text-[11px] font-semibold">
      <button
        onClick={() => handleSwitch('bn')}
        disabled={pending}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          current === 'bn' ? 'bg-white text-crimson' : 'text-white/80 hover:text-white'
        } ${pending ? 'opacity-60' : ''}`}
        aria-label="বাংলা"
        type="button"
      >
        বাংলা
      </button>
      <span className="text-white/40">|</span>
      <button
        onClick={() => handleSwitch('en')}
        disabled={pending}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          current === 'en' ? 'bg-white text-crimson' : 'text-white/80 hover:text-white'
        } ${pending ? 'opacity-60' : ''}`}
        aria-label="English"
        type="button"
      >
        EN
      </button>
    </div>
  );
}
