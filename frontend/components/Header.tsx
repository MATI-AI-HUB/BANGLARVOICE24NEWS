'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './LanguageToggle';
import { BreakingMarquee } from './breaking-marquee';
import { t, type Locale } from '@/lib/i18n';

const NAV_KEYS = [
  { href: '/#latest', key: 'latest' as const },
  { href: '/category/politics', key: 'politics' as const },
  { href: '/category/economy', key: 'economy' as const },
  { href: '/category/international', key: 'international' as const },
  { href: '/epaper', key: 'epaper' as const },
  { href: '/search', key: 'search_placeholder' as const },
  { href: '/download', key: 'app' as const },
];

function LiveBanglaClock({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;
  const bcp47 = locale === 'en' ? 'en-US' : 'bn-BD';
  return (
    <time
      dateTime={now.toISOString().slice(0, 10)}
      className="hidden text-xs font-medium text-white/90 lg:block"
    >
      {now.toLocaleDateString(bcp47, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}{' '}
      •{' '}
      {now.toLocaleTimeString(bcp47, { hour: 'numeric', minute: '2-digit' })}
    </time>
  );
}

export function Header({ locale = 'bn' as Locale }: { locale?: Locale }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      menuRef.current?.focus();
    }
  }, [menuOpen]);

  const navLinks = NAV_KEYS.map((n) => ({ href: n.href, label: t(locale, n.key) }));

  return (
    <>
      <div className="bg-crimson text-white">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-4">
          <LiveBanglaClock locale={locale} />
          <div className="flex items-center gap-4 text-[11px] font-medium">
            <a href="/about" className="hover:underline">{t(locale, 'about')}</a>
            <a href="/contact" className="hover:underline">{t(locale, 'contact')}</a>
            <LanguageToggle />
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border/80 bg-paper/85 shadow-glass backdrop-blur-xl supports-[backdrop-filter]:bg-paper/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 md:py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              ref={triggerRef}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:bg-muted md:hidden dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>

            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2 md:gap-2.5"
              aria-label="Banglar Voice 24NEWS — Home"
            >
              <Image
                src="/banglar-voice-logo.png"
                alt="Banglar Voice — বাংলার ভয়েস"
                width={320}
                height={108}
                priority
                className="h-[52px] w-auto object-contain md:h-[68px] lg:h-[72px]"
              />
              <span
                aria-hidden="true"
                className="relative ml-2 inline-flex items-center rounded-md bg-gradient-to-br from-[#CC0000] to-[#8B0000] px-1.5 py-1 text-[10px] font-black uppercase leading-none tracking-widest text-white shadow-sm ring-1 ring-red-900/20 md:ml-2.5 md:px-2.5 md:py-1.5 md:text-sm"
              >
                24NEWS
                <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white/90" />
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 text-sm font-semibold md:flex" aria-label="Main navigation">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-3.5 py-2 text-ink/80 transition-colors hover:bg-muted hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/#latest"
              className="hidden rounded-full bg-crimson px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-crimson-dark sm:inline-flex"
            >
              {t(locale, 'latest')}
            </a>
            <ThemeToggle />
          </div>
        </div>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />
            <nav
              id="mobile-menu"
              ref={menuRef}
              tabIndex={-1}
              className="relative z-50 max-h-[calc(100dvh-56px)] overflow-y-auto border-t border-border bg-paper px-4 py-3 shadow-glass outline-none md:hidden dark:border-white/10 dark:bg-ink"
              aria-label="Mobile navigation"
            >
              <ul className="space-y-1">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="block rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink/85 hover:bg-muted dark:text-white/85 dark:hover:bg-white/10"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
                <li className="flex gap-3 pt-2 text-sm font-medium text-ink/70 dark:text-white/70">
                  <a href="/about" className="hover:underline">{t(locale, 'about')}</a>
                  <a href="/contact" className="hover:underline">{t(locale, 'contact')}</a>
                </li>
              </ul>
            </nav>
          </>
        )}

        <BreakingMarquee locale={locale} />
      </header>
    </>
  );
}
