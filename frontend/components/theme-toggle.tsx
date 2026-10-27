'use client';

import { useEffect, useState } from 'react';

const THEME_COOKIE = 'bv-theme';
const THEME_MAX_AGE = 60 * 60 * 24 * 365;

function readStoredTheme(): boolean | null {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${THEME_COOKIE}=`))
    ?.split('=')[1];
  if (cookie === 'dark') return true;
  if (cookie === 'light') return false;

  try {
    const legacyValue = localStorage.getItem(THEME_COOKIE);
    if (legacyValue === 'dark') return true;
    if (legacyValue === 'light') return false;
  } catch {
    // Cookie preferences remain available even when localStorage is blocked.
  }
  return null;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setDark(stored ?? window.matchMedia('(prefers-color-scheme: dark)').matches);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle('dark', dark);
    const value = dark ? 'dark' : 'light';
    document.cookie = `${THEME_COOKIE}=${value}; Path=/; Max-Age=${THEME_MAX_AGE}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    try {
      localStorage.setItem(THEME_COOKIE, value);
    } catch {
      // The cookie is the canonical persisted preference.
    }
  }, [dark, hydrated]);

  return (
    <button
      type="button"
      onClick={() => setDark((value) => !value)}
      aria-label={dark ? 'হালকা থিম চালু করুন' : 'ডার্ক থিম চালু করুন'}
      aria-pressed={dark}
      className="rounded-full border border-border px-3 py-1 text-sm"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
