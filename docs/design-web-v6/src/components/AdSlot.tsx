import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";

/**
 * AdSense-ready display slot.
 * Set VITE_ADSENSE_CLIENT and pass a slot id to serve live ads; until then
 * a labelled, non-intrusive house placeholder is rendered.
 */
export function AdSlot({
  slot,
  format = "leaderboard",
  className = "",
}: {
  slot?: string;
  format?: "leaderboard" | "rectangle" | "skyscraper";
  className?: string;
}) {
  const { t } = useLang();
  const client = import.meta.env['VITE_ADSENSE_CLIENT'] as string | undefined;
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || !slot || pushed.current || !insRef.current) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      /* ad blocker or script not loaded — placeholder stays */
    }
  }, [client, slot]);

  const sizes: Record<string, string> = {
    leaderboard: "min-h-[90px]",
    rectangle: "min-h-[250px]",
    skyscraper: "min-h-[400px]",
  };

  return (
    <aside
      aria-label={t("বিজ্ঞাপন", "Advertisement")}
      className={`brut-flat ${sizes[format]} flex flex-col items-center justify-center bg-secondary p-3 text-center ${className}`}
    >
      <div className="kicker text-muted-foreground">{t("বিজ্ঞাপন", "Advertisement")}</div>
      {client && slot ? (
        <ins
          ref={insRef}
          className="adsbygoogle block w-full"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="mt-1">
          <div className="text-sm font-bold">{t("এই স্থানে আপনার ব্র্যান্ড", "Your brand here")}</div>
          <a href="mailto:editor@banglarvoice24news.com" className="mt-1 inline-block font-sans text-xs underline hover:text-primary">
            banglarvoice24news.com
          </a>
        </div>
      )}
    </aside>
  );
}
