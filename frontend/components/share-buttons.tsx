'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Banglar Voice — Social share buttons (Facebook / X / WhatsApp / Telegram).
 * Uses only existing design tokens (muted, border, ink, paper, primary, sansbn)
 * with brand icons. Opens share intents in a new tab.
 */
const PLATFORMS: {
  id: string;
  label: string;
  icon: ReactNode;
  buildUrl: (u: string, t: string) => string;
}[] = [
  {
    id: 'facebook',
    label: 'Facebook-এ শেয়ার করুন',
    // eslint-disable-next-line react/no-unescaped-entities
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.5-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
      </svg>
    ),
    buildUrl: (u: string, t: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    id: 'x',
    label: 'X-এ শেয়ার করুন',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.23l-4.88-6.38L6.5 22H3.34l7.24-8.28L2.4 2h6.39l4.41 5.83L18.9 2Zm-1.09 18.13h1.72L7.86 3.77H6.02l11.79 16.36Z" />
      </svg>
    ),
    buildUrl: (u: string, t: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp-এ শেয়ার করুন',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
      </svg>
    ),
  buildUrl: (u: string, t: string) =>
      `https://wa.me/?text=${encodeURIComponent(t)}%20${encodeURIComponent(u)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram-এ শেয়ার করুন',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M21.94 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.33-4.73L18.4 6.6c.38-.34-.08-.53-.59-.19L6.6 13.4l-4.58-1.43c-1-.31-1.01-1 .21-1.48L20.6 3.1c.83-.31 1.55.19 1.34 1.5Z" />
      </svg>
    ),
    buildUrl: (u: string, t: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
];

export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(typeof window !== 'undefined' ? window.location.href : '');
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        শেয়ার করুন
      </span>
      {PLATFORMS.map((p) => {
        const href = p.buildUrl(url, title);
        return (
          <a
            key={p.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={p.label}
            title={p.label}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-ink transition-colors hover:border-primary hover:bg-primary hover:text-paper dark:border-white/10 dark:bg-neutral-800 dark:text-paper dark:hover:border-primary dark:hover:bg-primary"
          >
            {p.icon}
          </a>
        );
      })}
    </div>
  );
}