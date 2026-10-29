'use client';

import { useEffect, useState } from 'react';
import type { Locale } from './i18n';

/** Reads the locale already resolved by the server for the current document. */
export function useClientLocale(): Locale {
  const [locale, setLocale] = useState<Locale>('bn');

  useEffect(() => {
    const documentLocale = document.documentElement.lang;
    setLocale(documentLocale === 'en' ? 'en' : 'bn');
  }, []);

  return locale;
}
