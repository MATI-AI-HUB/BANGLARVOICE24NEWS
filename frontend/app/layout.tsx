import type { Metadata } from 'next';
import { ThemeToggle } from '../components/theme-toggle';
import { BreakingMarquee } from '../components/breaking-marquee';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'বাংলার ভয়েস', template: '%s — বাংলার ভয়েস' },
  description: 'স্বাধীন সংবাদ প্রকাশে নির্বীক — Banglar Voice autonomous Bangla news platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body className="bg-paper text-ink antialiased dark:bg-ink dark:text-paper">
        <header className="sticky top-0 z-50 border-b border-border bg-paper/90 backdrop-blur dark:bg-ink/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="font-serifbn text-xl font-bold text-primary">বাংলার ভয়েস</a>
            <div className="flex items-center gap-3">
              <nav className="hidden gap-4 text-sm font-medium md:flex">
                <a href="/#desk">ডেস্ক</a>
                <a href="/#live">লাইভ</a>
                <a href="/#video">ভিডিও</a>
                <a href="/#opinion">মতামত</a>
              </nav>
              <ThemeToggle />
            </div>
          </div>
          <BreakingMarquee />
        </header>
        {children}
        <footer className="mt-16 border-t border-border bg-muted py-8 text-center text-sm">
          বাংলার ভয়েস © ২০২৬ — স্বাধীন প্রকাশনায় নির্বীক · Powered by PocketBase + Next.js ISR
        </footer>
      </body>
    </html>
  );
}
