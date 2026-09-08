'use client';

export type LiveEntry = {
  id?: string;
  body_bn?: string;
  author?: string;
  created_at?: string;
};

function timeLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('bn-BD', { hour: 'numeric', minute: '2-digit' });
}

/**
 * LiveBlog — Al Jazeera "live blog" style chronological timeline.
 * Pure presentational: parent fetches /api/public/live.json (or demo data).
 * Renders newest-first entries as a vertical timeline with pulsing dot.
 */
export function LiveBlog({ entries }: { entries: LiveEntry[] }) {
  if (!entries || entries.length === 0) return null;

  return (
    <section
      aria-labelledby="liveblog-heading"
      className="my-14 overflow-hidden rounded-3xl border border-[#CC0000]/30 bg-gradient-to-b from-[#CC0000]/[0.05] to-white dark:from-neutral-900 dark:to-neutral-950"
    >
      <div className="border-b border-[#CC0000]/40 bg-[#CC0000] px-5 py-3 text-white">
        <h2 id="liveblog-heading" className="flex items-center gap-2 font-serifbn text-lg font-extrabold tracking-tight">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" aria-hidden />
          লাইভ ব্লগ — মিনিটে মিনিট আপডেট
        </h2>
      </div>
      <ol className="max-h-[560px] space-y-0 overflow-y-auto p-5">
        {entries.map((e, i) => (
          <li key={e.id ?? `${e.created_at}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {/* timeline rail */}
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#CC0000] bg-white dark:bg-neutral-950" />
              {i < entries.length - 1 && <span className="w-px flex-1 bg-[#CC0000]/20 dark:bg-[#CC0000]/40" />}
            </div>
            <div className="min-w-0">
              <time className="text-xs font-bold text-[#CC0000] dark:text-[#CC0000]">
                {timeLabel(e.created_at)}
              </time>
              <p className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                {e.body_bn}
              </p>
              {e.author && (
                <span className="mt-1 inline-block text-[11px] font-semibold text-neutral-400">
                  — {e.author}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
