'use client';

import { type Locale } from '@/lib/i18n';

export interface TrustSignalsProps {
  ai_model?: string | null;
  ai_confidence?: number | null;
  source_name?: string | null;
  source_url?: string | null;
  source_published_at?: string | null;
  image_credit?: string | null;
  verification_status?: string | null;
  verification_score?: number | null;
  ai_verified?: boolean | null;
  human_verified?: boolean | null;
  verified_at?: string | null;
  locale?: Locale;
}

export function TrustSignals(props: TrustSignalsProps) {
  const {
    ai_model, ai_confidence, source_name, source_url, source_published_at,
    image_credit, verification_status, verification_score,
    ai_verified, human_verified, verified_at,
    locale = 'bn',
  } = props;

  const isEn = locale === 'en';
  const L = (bn: string, en: string) => (isEn ? en : bn);

  const badge = (() => {
    switch (verification_status) {
      case 'verified':
      case 'approved':
        return { txt: L('যাচাইকৃত', 'Verified'), cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
      case 'reviewed':
        return { txt: L('সম্পাদক পর্যালোচিত', 'Editor reviewed'), cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' };
      case 'rejected':
        return { txt: L('প্রত্যাখ্যাত', 'Rejected'), cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' };
      case 'pending':
      default:
        return { txt: L('যাচাই প্রক্রিয়াধীন', 'Verification pending'), cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
    }
  })();

  const dt = (iso: string) => new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'bn-BD', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <aside aria-label={L('উৎস ও যাচাই তথ্য', 'Source and verification info')}
      className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
      <ul className="space-y-2">
        {(source_name || source_url) && (
          <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{L('সূত্র', 'Source')}:</span>
            {source_url ? (
              <a href={source_url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary hover:underline">
                {source_name || new URL(source_url).hostname}<span className="ml-1 text-neutral-400">↗</span>
              </a>
            ) : (<span className="font-medium">{source_name}</span>)}
            {source_published_at && <span className="text-neutral-400">· {dt(source_published_at)}</span>}
          </li>
        )}
        {image_credit && (
          <li className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{L('ছবি', 'Image')}:</span>
            <span className="text-neutral-500">{image_credit}</span>
          </li>
        )}
        {ai_model && (
          <li className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{L('এআই মডেল', 'AI model')}:</span>
            <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-[11px] dark:bg-neutral-800">{ai_model}</code>
            {typeof ai_confidence === 'number' && <span className="text-neutral-400">· {L('আস্থা', 'confidence')} {Math.round(ai_confidence * 100)}%</span>}
          </li>
        )}
        {verification_status && (
          <li className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.txt}</span>
            {typeof verification_score === 'number' && <span className="text-neutral-400">score {verification_score}/100</span>}
            {human_verified && <span className="text-emerald-700 dark:text-emerald-400">· {L('মানব-যাচাইকৃত', 'human verified')}</span>}
            {ai_verified && !human_verified && <span className="text-sky-700 dark:text-sky-400">· {L('এআই-যাচাইকৃত', 'AI verified')}</span>}
            {verified_at && <span className="text-neutral-400">· {dt(verified_at)}</span>}
          </li>
        )}
      </ul>
      <p className="mt-3 text-[10px] leading-relaxed text-neutral-400">
        {L(
          'এই সংবাদটি এআই-সহায়তায় প্রস্তুত। সনাক্তকৃত অসঙ্গতি banglarvoice24news@gmail.com-এ জানান।',
          'Prepared with AI assistance. Report inaccuracies to banglarvoice24news@gmail.com.',
        )}
      </p>
    </aside>
  );
}
