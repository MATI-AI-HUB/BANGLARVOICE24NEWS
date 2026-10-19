'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  url: string;
  label: string;
};

/**
 * Renders the archived vector PDF page-by-page with pdf.js onto canvases
 * (lazy-loaded, device-pixel-ratio aware) so text stays sharp when zooming.
 */
export default function PdfArchiveViewer({ url, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        setPages(pdf.numPages);
        container.replaceChildren();

        const width = Math.min(container.clientWidth || 800, 1000);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);

        for (let number = 1; number <= pdf.numPages; number++) {
          const page = await pdf.getPage(number);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${width}px`;
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'mx-auto mb-4 block bg-white shadow';
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `${label} — পাতা ${number}`);
          container.appendChild(canvas);

          const context = canvas.getContext('2d');
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
          if (number === 1) setStatus('ready');
        }
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, label]);

  return (
    <section aria-label={label} className="mb-8">
      <div className="mb-3 flex items-center justify-between text-sm">
        <h2 className="font-serifbn text-xl font-bold">{label}</h2>
        <a href={url} download className="rounded border border-[#1a1a1a] px-3 py-1 text-xs font-semibold hover:bg-[#1a1a1a] hover:text-white">
          PDF ডাউনলোড{pages ? ` (${pages} পাতা)` : ''}
        </a>
      </div>
      {status === 'loading' && <p className="py-10 text-center text-sm text-neutral-500">আর্কাইভ লোড হচ্ছে…</p>}
      {status === 'error' && (
        <p className="py-10 text-center text-sm text-neutral-500">
          আর্কাইভ দেখানো যায়নি। <a className="underline" href={url}>সরাসরি PDF খুলুন</a>
        </p>
      )}
      <div ref={containerRef} />
    </section>
  );
}
