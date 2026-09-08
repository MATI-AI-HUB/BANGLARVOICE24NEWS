'use client';

import { useMemo, useState } from 'react';

export type VideoItem = {
  id?: string;
  title_bn?: string;
  category?: string;
  thumbnail_url?: string;
  embed_url?: string;
  is_live?: boolean;
};

/** Zero-CLS thumbnail: gradient art when no image is available. */
function Thumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || ''}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-cover ${src ? 'opacity-100' : 'opacity-0'}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      {!src && (
        <span className="absolute inset-0 grid place-items-center text-3xl opacity-60" aria-hidden>
          ▶
        </span>
      )}
    </div>
  );
}

/**
 * VideoHub — dark Al-Jazeera/BBC-style video & podcast rail.
 * Sorted so live items surface first; the first item renders as a
 * feature with a prominent "লাইভ" badge.
 */
export function VideoHub({ videos }: { videos: VideoItem[] }) {
  const ordered = useMemo(() => {
    const list = [...videos];
    list.sort((a, b) => Number(b?.is_live ?? false) - Number(a?.is_live ?? false));
    return list.slice(0, 5);
  }, [videos]);

  const [active, setActive] = useState<VideoItem | null>(null);
  const feature = active ?? ordered[0];

  if (ordered.length === 0) return null;

  return (
    <section
      aria-labelledby="videohub-heading"
      className="my-14 overflow-hidden rounded-3xl bg-neutral-950 p-5 text-white md:p-8"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="videohub-heading" className="flex items-center gap-2 font-serifbn text-2xl font-extrabold tracking-tight">
          <span aria-hidden>🎬</span> ভিডিও ও পডকাস্ট
        </h2>
        <span className="flex items-center gap-1.5 rounded-full bg-[#CC0000] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
          লাইভ হাব
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Feature player area */}
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            <Thumb src={feature?.thumbnail_url} alt={feature?.title_bn || 'ভিডিও'} />
            {feature?.is_live && (
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-[#CC0000] px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
                Live
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-10">
              <h3 className="font-serifbn text-lg font-bold leading-snug md:text-xl">
                {feature?.title_bn || 'লাইভ সম্প্রচার'}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/50">
            ডেমো প্লেয়ার — আসল embed (YouTube/Facebook/Bunny) এখানে বসবে যখন ভিডিও ইউআরএল যোগ হবে।
          </p>
        </div>

        {/* Playlist */}
        <div className="flex flex-col gap-2 lg:col-span-2">
          {ordered.map((v) => (
            <button
              key={v.id ?? v.title_bn ?? v.embed_url}
              type="button"
              onClick={() => setActive(v)}
              aria-pressed={feature?.id === v.id && feature?.title_bn === v.title_bn}
              className={`flex gap-3 rounded-xl p-2 text-left transition-colors ${
                feature?.id === v.id && feature?.title_bn === v.title_bn
                  ? 'bg-white/10 ring-1 ring-white/20'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="w-28 shrink-0 overflow-hidden rounded-lg">
                <Thumb src={v.thumbnail_url} alt={v.title_bn || ''} />
              </div>
              <div className="min-w-0">
                {v.is_live && (
                  <span className="mb-1 inline-block rounded bg-[#CC0000] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-widest">
                    Live
                  </span>
                )}
                <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-white/90">
                  {v.title_bn}
                </h4>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
