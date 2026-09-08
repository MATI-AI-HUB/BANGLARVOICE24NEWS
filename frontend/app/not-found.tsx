import Link from 'next/link';

/**
 * 404 page — Banglar Voice.
 * Shown when a route/slug does not exist (App Router not-found boundary).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="mb-4 text-[64px] leading-none font-bold tracking-tight text-[#CC0000]">
          404
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-[#0F0F0F]">
          পৃষ্ঠাটি পাওয়া যায়নি — Page not found
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-black/60">
          আপনি যে সংবাদটি খুঁজছেন সেটি সরানো হয়েছে বা কখনো ছিল না। হোমপেজ থেকে
          আবার ব্রাউজ করুন।
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-[#0F0F0F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F0F0F]/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0F0F] focus-visible:ring-offset-2"
        >
          ← হোমপেজে ফিরে যান
        </Link>
      </div>
    </main>
  );
}
