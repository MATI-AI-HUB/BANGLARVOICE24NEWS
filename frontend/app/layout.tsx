import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '../components/theme-toggle';
import { BreakingMarquee } from '../components/breaking-marquee';
import { Footer } from '../components/Footer';
import { CookieBanner } from '../components/CookieBanner';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'বাংলার ভয়েস', template: '%s — বাংলার ভয়েস' },
  description: 'স্বাধীন সংবাদ প্রকাশে নির্বীক — Banglar Voice autonomous Bangla news platform',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice.com'),
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'বাংলার ভয়েস',
    title: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্বাক',
    description: 'বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা',
    locale: 'bn_BD',
    type: 'website',
  },
};

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: 'বাংলার ভয়েস',
  alternateName: 'Banglar Voice',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice.com',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice.com'}/banglar-voice-logo.png`,
  sameAs: [],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFEFB' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0F0F' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </head>
      <body className="bg-paper text-ink antialiased dark:bg-ink dark:text-paper">
        <header className="sticky top-0 z-50 border-b border-border bg-paper/90 backdrop-blur dark:bg-ink/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center"
              aria-label="বাংলার ভয়েস — হোমপেজ"
            >
              <Image
                src="/banglar-voice-logo.png"
                alt="Banglar Voice — বাংলার ভয়েস"
                width={320}
                height={108}
                priority
                className="h-[44px] md:h-[58px] lg:h-[62px] w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-3">
              <time
                dateTime={new Date().toISOString().slice(0, 10)}
                className="hidden text-xs font-medium text-neutral-500 dark:text-neutral-400 lg:block"
              >
                {new Date().toLocaleDateString('bn-BD', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
              <nav className="hidden items-center gap-1 text-sm font-semibold md:flex" aria-label="প্রধান নেভিগেশন">
                <a
                  href="/#latest"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted dark:hover:bg-neutral-800"
                >
                  সর্বশেষ
                </a>
                <a
                  href="/#cat-politics"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted dark:hover:bg-neutral-800"
                >
                  রাজনীতি
                </a>
                <a
                  href="/#cat-economy"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted dark:hover:bg-neutral-800"
                >
                  অর্থনীতি
                </a>
                <a
                  href="/#trending"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted dark:hover:bg-neutral-800"
                >
                  ট্রেন্ডিং
                </a>
              </nav>
              <ThemeToggle />
            </div>
          </div>
          <BreakingMarquee />
        </header>
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}