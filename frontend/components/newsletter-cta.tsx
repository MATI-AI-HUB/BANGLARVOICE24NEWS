'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';

export function NewsletterCta({ locale = 'bn' }: { locale?: Locale }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const en = locale === 'en';

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(8000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        setError(en ? 'Subscription is temporarily unavailable. Please try again.' : 'সাবস্ক্রিপশন এখন সম্ভব হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।');
        return;
      }
      setDone(true);
    } catch {
      setError(en ? 'Could not connect. Please try again shortly.' : 'সংযোগ করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="my-14 overflow-hidden rounded-3xl bg-ink p-6 text-paper dark:border dark:border-neutral-800 md:p-8"
    >
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">
            {en ? 'Newsletter' : 'নিউজলেটার'}
          </p>
          <h2 id="newsletter-heading" className="mt-1 font-serifbn text-2xl font-extrabold leading-tight md:text-3xl">
            {en ? 'The morning briefing — every day' : 'সকালের খবরের চুম্বক — প্রতিদিন ভোরে'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-paper/60">
            {en ? 'Top stories from Bangladesh and around the world, in your inbox.' : 'বাংলাদেশ ও বিশ্বের প্রধান সংবাদ, এক নজরে আপনার ইনবক্সে।'}
          </p>
        </div>
        {done ? (
          <p role="status" className="rounded-2xl bg-emerald-500/15 px-5 py-4 text-center text-sm font-semibold text-emerald-300">
            ✓ {en ? 'Thank you! Your email has been registered.' : 'ধন্যবাদ! আপনার ইমেইল সফলভাবে নিবন্ধিত হয়েছে।'}
          </p>
        ) : (
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={subscribe}>
            <label htmlFor="nl-email" className="sr-only">{en ? 'Email address' : 'ইমেইল ঠিকানা'}</label>
            <input
              id="nl-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={en ? 'Your email address' : 'আপনার ইমেইল'}
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-paper placeholder:text-paper/40 focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? (en ? 'Submitting…' : 'পাঠানো হচ্ছে…') : (en ? 'Subscribe' : 'সাবস্ক্রাইব')}
            </button>
            {error ? <p role="alert" className="basis-full text-sm text-amber-200">{error}</p> : null}
          </form>
        )}
      </div>
    </section>
  );
}
