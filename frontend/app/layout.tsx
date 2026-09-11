import { PlausibleAnalytics } from "@/components/plausible";
import type { Metadata, Viewport } from 'next';
import { Noto_Serif_Bengali, Hind_Siliguri } from 'next/font/google';
import '../styles/globals.css';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { CookieBanner } from '../components/CookieBanner';
import { LearningHub } from '../components/learning-hub';

/* Self-hosted Google Fonts (next/font) — no external stylesheet, no CLS from
   font swap, works in the Vercel build. */
const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '700', '800'],
  variable: '--font-serif-bn',
  display: 'swap',
});

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-bn',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'বাংলার ভয়েস', template: '%s — বাংলার ভয়েস' },
  description: 'স্বাধীন সংবাদ প্রকাশে নির্ভীক — Banglar Voice autonomous Bangla news platform',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice.com'),
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'বাংলার ভয়েস',
    title: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্ভীক',
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
    { media: '(prefers-color-scheme: light)', color: '#FAFAFD' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
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
      <body><PlausibleAnalytics /><PlausibleAnalytics />
        className={`${notoSerifBengali.variable} ${hindSiliguri.variable} bg-paper font-sansbn text-ink antialiased`}
      >
        <Header />
        {children}
        <Footer />
        <CookieBanner />
        <LearningHub />
      </body>
    </html>
  );
}
