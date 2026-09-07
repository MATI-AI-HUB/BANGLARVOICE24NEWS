import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportClientError } from "../lib/client-error-reporting";
import { SITE, organizationJsonLd, websiteJsonLd } from "../lib/site";
import { ThemeProvider } from "../lib/theme";
import { LanguageProvider } from "../lib/i18n";

/** Google AdSense publisher id (ca-pub-XXXXXXXXXXXXXXXX). Set VITE_ADSENSE_CLIENT to go live. */
const ADSENSE_CLIENT = import.meta.env['VITE_ADSENSE_CLIENT'] as string | undefined;


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">পাতাটি খুঁজে পাওয়া যায়নি</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          আপনি যে পাতাটি খুঁজছেন সেটি সরানো হয়েছে বা এখন আর নেই।
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            হোমে ফিরুন
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">এই পাতাটি লোড করা যায়নি</h1>
        <p className="mt-2 text-sm text-muted-foreground">কিছু একটি ভুল হয়েছে।</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >আবার চেষ্টা</button>
          <a href="/" className="rounded-md border border-input px-4 py-2 text-sm">হোম</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "বাংলার ভয়েস" },
      { property: "og:site_name", content: "বাংলার ভয়েস" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "বাংলার ভয়েস — সত্য, নিরপেক্ষ, নির্ভরযোগ্য সংবাদ" },
      { property: "og:title", content: "বাংলার ভয়েস — সত্য, নিরপেক্ষ, নির্ভরযোগ্য সংবাদ" },
      { name: "twitter:title", content: "বাংলার ভয়েস — সত্য, নিরপেক্ষ, নির্ভরযোগ্য সংবাদ" },
      { name: "description", content: "বাংলার ভয়েস — জাতীয় ও আন্তর্জাতিক সর্বশেষ সংবাদ, রাজনীতি, অর্থনীতি, খেলাধুলা, বিনোদন, প্রযুক্তি ও মতামত।" },
      { property: "og:description", content: "বাংলার ভয়েস — জাতীয় ও আন্তর্জাতিক সর্বশেষ সংবাদ, রাজনীতি, অর্থনীতি, খেলাধুলা, বিনোদন, প্রযুক্তি ও মতামত।" },
      { name: "twitter:description", content: "বাংলার ভয়েস — জাতীয় ও আন্তর্জাতিক সর্বশেষ সংবাদ, রাজনীতি, অর্থনীতি, খেলাধুলা, বিনোদন, প্রযুক্তি ও মতামত।" },
      { property: "og:image", content: "https://banglarvoice24news.com/og-banglar-voice.png" },
      { name: "twitter:image", content: "https://banglarvoice24news.com/og-banglar-voice.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      ...(ADSENSE_CLIENT ? [{ rel: "preconnect", href: "https://pagead2.googlesyndication.com" }] : []),
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700;800&family=Archivo+Black&display=swap" },
      { rel: "alternate", type: "application/rss+xml", title: "বাংলার ভয়েস — RSS", href: `${SITE.url}/rss.xml` },
      { rel: "alternate", type: "application/feed+json", title: "বাংলার ভয়েস — JSON Feed", href: `${SITE.url}/api/public/feed.json` },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(organizationJsonLd()) },
      { type: "application/ld+json", children: JSON.stringify(websiteJsonLd()) },
      ...(ADSENSE_CLIENT
        ? [
            {
              src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
              async: true,
              crossOrigin: "anonymous" as const,
            },
          ]
        : []),
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <Outlet />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
