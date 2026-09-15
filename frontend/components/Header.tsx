'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { BreakingMarquee } from './breaking-marquee';

const NAV_LINKS = [
  { href: '/#latest', label: 'সর্বশেষ' },
  { href: '/#cat-politics', label: 'রাজনীতি' },
  { href: '/#cat-economy', label: 'অর্থনীতি' },
  { href: '/#trending', label: 'ট্রেন্ডিং' },
  { href: '/download', label: 'অ্যাপ' },
];

function LiveBanglaClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null; // avoid hydration mismatch
  return (
    <time
      dateTime={now.toISOString().slice(0, 10)}
      className="hidden text-xs font-medium text-white/90 lg:block"
    >
      {now.toLocaleDateString('bn-BD', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}{' '}
      •{' '}
      {now.toLocaleTimeString('bn-BD', { hour: 'numeric', minute: '2-digit' })}
    </time>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu when leaving the page (anchor nav) or resizing up.
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  // Escape closes the menu; focus returns to the trigger.
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

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Move focus into the panel when it opens, restore to trigger when it closes.
  useEffect(() => {
    if (menuOpen) {
      menuRef.current?.focus();
    }
  }, [menuOpen]);

  return (
    <>
      {/* Crimson top utility bar — live date/time */}
      <div className="bg-crimson text-white">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-4">
          <LiveBanglaClock />
          <div className="flex items-center gap-4 text-[11px] font-medium">
            <a href="/about" className="hover:underline">আমাদের সম্পর্কে</a>
            <a href="/contact" className="hover:underline">যোগাযোগ</a>
            <span className="hidden sm:inline text-white/70">বাংলা</span>
          </div>
        </div>
      </div>

      {/* Sticky glassmorphism main header */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-paper/85 shadow-glass backdrop-blur-xl supports-[backdrop-filter]:bg-paper/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 md:py-4">
          <div className="flex items-center gap-2">
            {/* Mobile drawer trigger */}
            <button
              type="button"
              ref={triggerRef}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:bg-muted md:hidden dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>

            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2 md:gap-2.5"
              aria-label="বাংলার ভয়েস 24NEWS — হোমপেজ"
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

          <nav className="hidden items-center gap-1 text-sm font-semibold md:flex" aria-label="প্রধান নেভিগেশন">
            {NAV_LINKS.map((l) => (
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
              সর্বশেষ
            </a>
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile drawer panel */}
        {menuOpen && (
          <>
            {/* Backdrop — click to close */}
            <button
              type="button"
              aria-label="মেনু বন্ধ করুন"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />
            <nav
              id="mobile-menu"
              ref={menuRef}
              tabIndex={-1}
              className="relative z-50 max-h-[calc(100dvh-56px)] overflow-y-auto border-t border-border bg-paper px-4 py-3 shadow-glass outline-none md:hidden dark:border-white/10 dark:bg-ink"
              aria-label="মোবাইল নেভিগেশন"
            >
              <ul className="space-y-1">
                {NAV_LINKS.map((l) => (
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
                  <a href="/about" className="hover:underline">আমাদের সম্পর্কে</a>
                  <a href="/contact" className="hover:underline">যোগাযোগ</a>
                </li>
              </ul>
            </nav>
          </>
        )}

        {/* Breaking ticker sits under the sticky header */}
        <BreakingMarquee />
      </header>
    </>
  );
}
