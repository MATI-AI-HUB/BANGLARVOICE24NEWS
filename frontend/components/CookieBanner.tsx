'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

const CONSENT_KEY = 'bv_consent';

type ConsentState = 'accepted' | 'rejected' | null;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Google Consent Mode v2 — default: everything denied until explicit choice. */
function setConsentDefaults() {
  const gtag = window.gtag;
  if (typeof gtag === 'function') {
    gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });
  }
}

function applyConsent(state: ConsentState) {
  const gtag = window.gtag;
  if (typeof gtag !== 'function') return;
  if (state === 'accepted') {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  } else {
    gtag('consent', 'update', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
}

export function CookieBanner({ locale = 'bn' }: { locale?: Locale }) {
  const [visible, setVisible] = useState(false);
  const en = locale === 'en';

  useEffect(() => {
    // Register defaults on first paint so any Google tag that loads later
    // inherits the denied baseline (Consent Mode v2 requirement).
    setConsentDefaults();

    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      applyConsent(stored);
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, []);

  const decide = (state: 'accepted' | 'rejected') => {
    window.localStorage.setItem(CONSENT_KEY, state);
    applyConsent(state);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={en ? 'Cookie consent' : 'কুকি সম্মতি'}
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-gray-900 text-gray-100 shadow-2xl"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl text-[14px] leading-relaxed">
          <p className="font-semibold text-white">{en ? 'Your privacy preferences' : 'আপনার গোপনীয়তা পছন্দ'}</p>
          <p className="mt-1 text-gray-300">
            {en
              ? 'We use essential cookies and ask for your consent for Google AdSense/Analytics. Read our '
              : 'আমরা প্রয়োজনীয় কুকি ব্যবহার করি এবং Google AdSense/অ্যানালিটিক্স-এর জন্য আপনার সম্মতি চাই। বিস্তারিত '}
            <Link href="/cookies" className="font-semibold text-white underline underline-offset-4 hover:text-gray-200">
              {en ? 'Cookie Policy' : 'কুকি নীতি'}
            </Link>{' '}
            {en ? 'and' : 'ও'}{' '}
            <Link href="/privacy" className="font-semibold text-white underline underline-offset-4 hover:text-gray-200">
              {en ? 'Privacy Policy' : 'গোপনীয়তা নীতি'}
            </Link>{' '}
            {en ? 'for details.' : 'পড়ুন।'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => decide('rejected')}
            className="rounded-full border border-gray-500 px-5 py-2 text-[13px] font-semibold text-gray-200 transition-colors hover:border-gray-300 hover:text-white"
          >
            {en ? 'Reject' : 'প্রত্যাখ্যান'}
          </button>
          <button
            type="button"
            onClick={() => decide('accepted')}
            className="rounded-full bg-[#C41E1E] px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#a01818]"
          >
            {en ? 'Accept all' : 'সব গ্রহণ'}
          </button>
        </div>
      </div>
    </div>
  );
}
