'use client';

import { useMemo, useState } from 'react';
import type { EPaperEdition, EPaperPage } from '../../lib/epaper/types';

type Props = { edition: EPaperEdition };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}

function printableHtml(edition: EPaperEdition): string {
  const pages = edition.pages.map((page) => {
    const articles = [page.lead, ...page.articles].filter(Boolean).map((article) => `
      <article class="article">
        <h2>${escapeHtml(article!.headline)}</h2>
        <p>${escapeHtml(article!.body)}</p>
        ${article!.attribution ? `<small>প্রতিবেদন: ${escapeHtml(article!.attribution)}</small>` : ''}
      </article>`).join('');
    const briefs = page.briefs?.length ? `<section class="briefs"><strong>সংক্ষেপে</strong>${page.briefs.map((brief) => `<p>• ${escapeHtml(brief)}</p>`).join('')}</section>` : '';
    return `<section class="page"><h1>${escapeHtml(page.section)}</h1>${articles}${briefs}</section>`;
  }).join('');
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>${escapeHtml(edition.editionLabel)} — বাংলার ভয়েস</title><style>body{font-family:Georgia,serif;background:#f4f1eb;color:#171717;margin:0}.paper{max-width:900px;margin:0 auto;background:#fffdf8;padding:40px}.masthead{text-align:center;border-bottom:4px solid #b91c1c;padding-bottom:14px;margin-bottom:24px}.masthead h1{color:#b91c1c;margin:0;font-size:34px}.page{border-top:2px solid #111;padding:18px 0;break-after:page}.page>h1{font-size:25px;margin:0 0 18px;color:#172033}.article{border-bottom:1px solid #ddd;padding:0 0 16px;margin:0 0 16px}.article h2{font-size:22px;line-height:1.35;margin:0 0 8px}.article p{font-size:16px;line-height:1.8;margin:0}.article small{display:block;color:#777;margin-top:7px}.briefs{border-top:2px solid #b91c1c;padding-top:10px}.briefs p{margin:5px 0}@media print{body{background:white}.paper{max-width:none;padding:10mm}.page{break-after:page}}</style></head><body><main class="paper"><header class="masthead"><h1>বাংলার ভয়েস — দৈনিক ই-পেপার</h1><div>${escapeHtml(edition.editionLabel)}</div></header>${pages}</main></body></html>`;
}

function PageCard({ page, zoom }: { page: EPaperPage; zoom: number }) {
  return (
    <section
      className="mx-auto mb-6 max-w-4xl border border-border bg-[#fffdf8] p-5 shadow-card dark:border-white/10 dark:bg-neutral-950 md:p-8"
      style={{ fontSize: `${zoom}em` }}
    >
      <div className="mb-5 flex items-end justify-between border-b-2 border-ink pb-2 dark:border-paper">
        <h2 className="font-serifbn text-2xl font-bold text-ink dark:text-paper">{page.section}</h2>
        <span className="text-xs text-ink/50 dark:text-paper/50">পৃষ্ঠা {page.number}</span>
      </div>
      {page.lead && (
        <article className="mb-5 border-b border-border pb-5 dark:border-white/10">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">প্রধান সংবাদ</div>
          <h3 className="font-serifbn text-3xl font-extrabold leading-tight text-ink dark:text-paper">{page.lead.headline}</h3>
          <p className="mt-3 whitespace-pre-line font-serifbn text-lg leading-[1.85] text-ink/90 dark:text-paper/90">{page.lead.body}</p>
          {page.lead.attribution && <small className="mt-2 block text-xs text-ink/50 dark:text-paper/50">প্রতিবেদন: {page.lead.attribution}</small>}
        </article>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {page.articles.map((article, index) => (
          <article key={`${article.headline}-${index}`} className="border-b border-border pb-4 dark:border-white/10">
            <h3 className="font-serifbn text-xl font-bold leading-snug text-ink dark:text-paper">{article.headline}</h3>
            <p className="mt-2 whitespace-pre-line font-serifbn leading-[1.75] text-ink/80 dark:text-paper/80">{article.body}</p>
            {article.attribution && <small className="mt-2 block text-xs text-ink/50 dark:text-paper/50">প্রতিবেদন: {article.attribution}</small>}
          </article>
        ))}
      </div>
      {page.briefs && page.briefs.length > 0 && (
        <div className="mt-5 border-t-2 border-primary pt-3">
          <h3 className="font-serifbn font-bold text-primary">সংক্ষেপে</h3>
          <ul className="mt-2 grid gap-1 md:grid-cols-2">
            {page.briefs.map((brief, index) => <li key={`${brief}-${index}`} className="font-serifbn text-sm leading-relaxed">• {brief}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function EPaperViewer({ edition }: Props) {
  const [zoom, setZoom] = useState(1);
  const html = useMemo(() => printableHtml(edition), [edition]);
  const fileName = `banglar-voice-epaper-${edition.editionDate}.html`;

  function downloadHtml() {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-card dark:border-white/10 dark:bg-neutral-900/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-paper/80 px-3 py-2 dark:border-white/10 dark:bg-neutral-900/80">
        <span className="mr-auto text-xs font-semibold text-ink/70 dark:text-paper/70">ই-পেপার · {edition.editionLabel} · {edition.pages.length} পৃষ্ঠা</span>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.85, +(value - 0.1).toFixed(2)))} className="rounded-full border border-border bg-paper px-3 py-1 text-xs font-bold dark:border-white/10 dark:bg-neutral-800">−</button>
        <span className="text-xs tabular-nums text-ink/70 dark:text-paper/70">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(1.3, +(value + 0.1).toFixed(2)))} className="rounded-full border border-border bg-paper px-3 py-1 text-xs font-bold dark:border-white/10 dark:bg-neutral-800">+</button>
        <button type="button" onClick={downloadHtml} className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">⬇ HTML ডাউনলোড</button>
        <button type="button" onClick={() => window.print()} className="rounded-full border border-border bg-paper px-3 py-1 text-xs font-bold dark:border-white/10 dark:bg-neutral-800">🖨 প্রিন্ট / PDF</button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-3 md:p-6">
        {edition.pages.map((page) => <PageCard key={page.number} page={page} zoom={zoom} />)}
      </div>
    </div>
  );
}
