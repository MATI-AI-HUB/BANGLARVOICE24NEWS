'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { EPaperEdition } from '../../lib/epaper/types';

const EPaperDocument = dynamic(
  () => import('./EPaperDocument').then((m) => m.EPaperDocument),
  { ssr: false },
);

type Status = 'loading' | 'ready' | 'error';

export default function EPaperViewer({ edition }: { edition: EPaperEdition }) {
  const [status, setStatus] = useState<Status>('loading');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    (async () => {
      try {
        const { pdf } = await import('@react-pdf/renderer');
        const blob = await pdf(<EPaperDocument edition={edition} />).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'PDF creation failed');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [edition]);

  if (status === 'loading') {
    return (
      <div className="flex aspect-[1123/794] w-full items-center justify-center rounded-2xl border border-border bg-paper dark:border-white/10 dark:bg-neutral-950">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-sm text-ink/60 dark:text-paper/60">
            ই-পেপার তৈরি হচ্ছে… ({edition.pages.length} পৃষ্ঠা)
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !blobUrl) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
          ই-পেপার তৈরি করা যায়নি
        </p>
        {error && (
          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
            {error}
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  const fileName = `banglar-voice-epaper-${edition.editionDate}.pdf`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-paper shadow-card dark:border-white/10 dark:bg-neutral-950">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 dark:border-white/10 dark:bg-neutral-900/60">
        <span className="mr-auto text-xs font-semibold text-ink/70 dark:text-paper/70">
          ই-পেপার · {edition.editionLabel} · {edition.pages.length} পৃষ্ঠা
        </span>

        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
          className="rounded-full border border-border bg-paper px-3 py-1 text-xs font-bold text-ink hover:bg-muted dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
          aria-label="জুম আউট"
        >
          −
        </button>
        <span className="text-xs font-medium tabular-nums text-ink/70 dark:text-paper/70">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
          className="rounded-full border border-border bg-paper px-3 py-1 text-xs font-bold text-ink hover:bg-muted dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
          aria-label="জুম ইন"
        >
          +
        </button>

        <a
          href={blobUrl}
          download={fileName}
          className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white hover:opacity-90"
        >
          ⬇ ডাউনলোড
        </a>
        <button
          type="button"
          onClick={() => {
            const w = window.open(blobUrl, '_blank');
            w?.addEventListener('load', () => w.print());
          }}
          className="rounded-full border border-border bg-paper px-3 py-1 text-xs font-bold text-ink hover:bg-muted dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
        >
          🖨 প্রিন্ট
        </button>
      </div>

      {/* PDF iframe */}
      <div className="relative w-full overflow-auto bg-neutral-100 dark:bg-neutral-900">
        <iframe
          key={blobUrl}
          src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
          title={`বাংলার ভয়েস ই-পেপার — ${edition.editionLabel}`}
          className="block w-full border-0"
          style={{
            height: `calc(794px * ${zoom})`,
            minHeight: 600,
          }}
        />
      </div>
    </div>
  );
}
