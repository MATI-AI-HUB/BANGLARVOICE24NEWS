/**
 * AdSlot — labelled "বিজ্ঞাপন" placeholder slot with a reserved aspect-ratio
 * box so the layout does NOT shift when a real ad loads later (CLS 0).
 * Wire real ads here later via ads.txt partner / Google Ad Manager without
 * touching the surrounding grid.
 */
export function AdSlot({
  format = 'in-feed',
  label = 'বিজ্ঞাপন',
}: {
  format?: 'in-feed' | 'leaderboard' | 'sidebar';
  label?: string;
}) {
  const ratio =
    format === 'leaderboard' ? 'aspect-[8/1]' : format === 'sidebar' ? 'aspect-[3/4]' : 'aspect-[3/1]';
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-neutral-300 bg-muted/60 px-4 py-5 text-center dark:border-neutral-700 dark:bg-neutral-900/60"
      role="complementary"
      aria-label={label}
    >
      <span className="rounded bg-neutral-200/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        {label}
      </span>
      <span className={`w-full max-w-xl rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 ${ratio}`} />
      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
        Ad Manager integration pending — reserved space (CLS 0)
      </span>
    </div>
  );
}

/** Compact divider used inside dense grids every N items. */
export function AdSlotGridItem() {
  return (
    <div className="col-span-full my-2">
      <AdSlot format="leaderboard" />
    </div>
  );
}
