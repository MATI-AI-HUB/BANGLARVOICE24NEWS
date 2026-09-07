import type { Metadata, Viewport } from 'next';
import { ThemeToggle } from '../components/theme-toggle';
import { BreakingMarquee } from '../components/breaking-marquee';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'বাংলার ভয়েস', template: '%s — বাংলার ভয়েস' },
  description: 'স্বাধীন সংবাদ প্রকাশে নির্বীক — Banglar Voice autonomous Bangla news platform',
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
      <body className="bg-paper text-ink antialiased dark:bg-ink dark:text-paper">
        <header className="sticky top-0 z-50 border-b border-border bg-paper/90 backdrop-blur dark:bg-ink/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="font-serifbn text-2xl font-extrabold tracking-tight text-primary">বাংলার ভয়েস</a>
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
              <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
                <a
                  href="/#latest"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-muted dark:hover:bg-neutral-800"
                >
                  সর্বশেষ
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
        <footer className="mt-16 border-t border-border bg-muted dark:bg-neutral-950">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-3">
            <div>
              <div className="font-serifbn text-lg font-extrabold text-primary">বাংলার ভয়েস</div>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                স্বাধীন সংবাদ প্রচারে নির্বাক — বাংলাদেশ ও বিশ্ব, নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য
                সাংবাদিকতা।
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
                সেকশন
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a className="text-neutral-700 transition-colors hover:text-primary dark:text-neutral-300" href="/#latest">
                    সর্বশেষ সংবাদ
                  </a>
                </li>
                <li>
                  <a className="text-neutral-700 transition-colors hover:text-primary dark:text-neutral-300" href="/#trending">
                    ট্রেন্ডিং
                  </a>
                </li>
                <li>
                  <a className="text-neutral-700 transition-colors hover:text-primary dark:text-neutral-300" href="/article/demo-1">
                    আর্টিকেল
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
                প্ল্যাটফর্ম
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li>মোবাইল অ্যাপ: রিডার, অ্যাডমিন, রিপোর্টার, টিভি</li>
                <li>ওয়েব: Next.js ISR + PocketBase</li>
                <li>অডিও: বাংলা টেক্সট-টু-স্পিচ</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/70 py-5 text-center text-xs text-neutral-500 dark:border-neutral-800">
            © ২০২৬ বাংলার ভয়েস — স্বাধীন প্রকাশনায় নির্বীক · Powered by PocketBase + Next.js ISR
          </div>
        </footer>
      </body>
    </html>
  );
}
