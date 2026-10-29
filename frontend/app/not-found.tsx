import Link from 'next/link';
import { cookies } from 'next/headers';
import { getLocaleFromCookie, LOCALE_COOKIE } from '@/lib/i18n';

/** 404 page — Banglar Voice. */
export default async function NotFound() {
  const locale = getLocaleFromCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  const copy = locale === 'en'
    ? {
        title: 'Page not found',
        description: 'The story you are looking for may have moved or may no longer be available. Try browsing from the homepage.',
        home: '← Back to Home',
      }
    : {
        title: 'পৃষ্ঠাটি পাওয়া যায়নি',
        description: 'আপনি যে সংবাদটি খুঁজছেন সেটি সরানো হয়েছে বা আর পাওয়া যাচ্ছে না। হোমপেজ থেকে আবার ব্রাউজ করুন।',
        home: '← হোমপেজে ফিরে যান',
      };

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="mb-4 text-[64px] leading-none font-bold tracking-tight text-[#CC0000]">404</div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-[#0F0F0F]">{copy.title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-black/60">{copy.description}</p>
        <Link
          href="/"
          className="inline-block rounded-full bg-[#0F0F0F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F0F0F]/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0F0F] focus-visible:ring-offset-2"
        >
          {copy.home}
        </Link>
      </div>
    </main>
  );
}
