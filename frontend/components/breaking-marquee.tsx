'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { t, type Locale } from '@/lib/i18n';
import { FALLBACK_TICKER_TEXT, resolveBreakingTicker } from '@/lib/breaking-ticker';

/** Editorial ticker with article fallbacks and realtime refresh. */
export function BreakingMarquee({ locale = 'bn' as Locale }: { locale?: Locale }) {
  const [texts, setTexts] = useState<string[]>([FALLBACK_TICKER_TEXT[locale]]);

  useEffect(() => {
    let sb: ReturnType<typeof createClient>;
    try {
      sb = createClient();
    } catch {
      setTexts([FALLBACK_TICKER_TEXT[locale]]);
      return;
    }

    let disposed = false;
    const load = async () => {
      const result = await resolveBreakingTicker({
        activeTicker: async () => {
          const { data, error } = await sb
            .from('breaking_ticker')
            .select('text_bn, is_active, updated_at')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(10);
          return { data, error };
        },
        breakingArticles: async () => {
          const { data, error } = await sb
            .from('articles')
            .select('title_bn, title_en')
            .eq('status', 'published')
            .eq('is_breaking', true)
            .order('published_at', { ascending: false })
            .limit(5);
          return { data, error };
        },
        recentArticles: async () => {
          const { data, error } = await sb
            .from('articles')
            .select('title_bn, title_en')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(5);
          return { data, error };
        },
      }, locale);
      if (!disposed) setTexts(result);
    };

    void load();
    const channel = sb
      .channel('breaking_ticker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'breaking_ticker' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, load)
      .subscribe();

    return () => {
      disposed = true;
      void sb.removeChannel(channel);
    };
  }, [locale]);

  const loopTexts = texts.length >= 3 ? texts : [...texts, ...texts, ...texts].slice(0, 6);

  return (
    <div className="group relative flex h-9 overflow-hidden bg-[#CC0000]">
      <div
        className="z-20 flex h-full shrink-0 items-center bg-black px-6 shadow-[6px_0_12px_rgba(0,0,0,0.4)]"
        role="status"
        aria-label={t(locale, 'breaking_badge')}
      >
        <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#CC0000]" aria-hidden />
          {t(locale, 'breaking_badge')}
        </span>
      </div>
      <div
        className="relative h-full flex-1 overflow-hidden bg-[#CC0000]"
        role="region"
        aria-label={t(locale, 'marquee_aria')}
      >
        <p className="sr-only">{texts[0]}</p>
        <div className="absolute inset-0 flex items-center">
          <div className="marquee-track flex items-center whitespace-nowrap will-change-transform animate-[marquee_30s_linear_infinite]">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex items-center whitespace-nowrap text-sm font-medium text-white" aria-hidden>
                {loopTexts.map((text, index) => (
                  <span key={`${copy}-${index}`} className="flex items-center">
                    {text}
                    <span className="mx-8 h-1 w-1 shrink-0 rounded-full bg-white/60" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
