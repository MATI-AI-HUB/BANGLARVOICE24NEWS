import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { notoSerifBengali, hindSiliguri } from '@/lib/fonts';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieBanner } from '@/components/CookieBanner';
import { PlausibleAnalytics } from '@/components/plausible';

export const metadata: Metadata = {
  title: 'Banglar Voice',
  description: 'Banglar Voice News Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={`${notoSerifBengali.variable} ${hindSiliguri.variable}`}>
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col">
        <PlausibleAnalytics />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
