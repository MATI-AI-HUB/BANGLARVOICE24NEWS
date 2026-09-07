'use client';

import { useState } from 'react';

/**
 * NewsletterCta — membership/newsletter hook (Al Jazeera / BBC style).
 * Pure client-side success state; wire to a real provider (Mailchimp /
 * Resend / own PocketBase "subscribers" collection) later.
 */
export function NewsletterCta() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="my-14 overflow-hidden rounded-3xl bg-ink p-6 text-paper dark:border dark:border-neutral-800 md:p-8"
    >
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70">
            নিউজলেটার
          </p>
          <h2 id="newsletter-heading" className="mt-1 font-serifbn text-2xl font-extrabold leading-tight md:text-3xl">
            সকালের খবরের চুম্বক — প্রতিদিন ভোরে
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-paper/60">
            বাংলাদেশ ও বিশ্বের প্রধান সংবাদ, এক নজরে। মেম্বারশিপ চালু হলে প্রিমিয়াম আর্টিকেলের অগ্রিম
            অধিকারও পাবেন।
          </p>
        </div>
        {done ? (
          <p className="rounded-2xl bg-emerald-500/15 px-5 py-4 text-center text-sm font-semibold text-emerald-300">
            ✓ ধন্যবাদ! আপনার ইমেইল নিবন্ধিত হয়েছে।
          </p>
        ) : (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.includes('@')) setDone(true);
            }}
          >
            <label htmlFor="nl-email" className="sr-only">
              ইমেইল ঠিকানা
            </label>
            <input
              id="nl-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="আপনার ইমেইল"
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-paper placeholder:text-paper/40 focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
            >
              সাবস্ক্রাইব
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
