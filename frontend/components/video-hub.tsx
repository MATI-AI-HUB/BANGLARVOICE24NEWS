'use client';

import { useMemo, useState } from 'react';
import { youtubeHqThumbnail } from '../lib/video-thumbnail';

export type VideoItem = {
  id?: string;
  title_bn?: string;
  title_en?: string;
  description?: string;
  category?: string;
  thumbnail_url?: string;
  video_url?: string;
  embed_url?: string;
  youtube_id?: string;
  duration_sec?: number;
  is_live?: boolean;
  view_count?: number;
  published_at?: string;
};

/**
 * Zero-CLS thumbnail: gradient art when no image is available. A broken
 * stored thumbnail is retried once with the YouTube HQ default.
 */
function Thumb({ src, fallbackSrc, alt }: { src?: string; fallbackSrc?: string; alt: string }) {
  const [current, setCurrent] = useState(src || fallbackSrc);
  const [failed, setFailed] = useState(false);
  const visible = Boolean(current) && !failed;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={visible ? current : undefined}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-cover ${visible ? 'opacity-100' : 'opacity-0'}`}
        onError={() => {
          if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc);
          else setFailed(true);
        }}
      />
      {!visible && (
        <span className="absolute inset-0 grid place-items-center text-3xl opacity-60" aria-hidden>
          ▶
        </span>
      )}
    </div>
  );
}

/** Privacy-friendly, click-to-play YouTube (nocookie) / iframe player. */
function Player({ video }: { video?: VideoItem }) {
  const [playing, setPlaying] = useState(false);

  if (!video) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900" />
    );
  }

  // Prefer the privacy-enhanced nocookie domain for real YouTube IDs; only
  // fall back to a stored embed_url (e.g. Facebook/Vimeo) when we have no ID.
  const src = video.youtube_id
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
    : video.embed_url || null;
  const poster = video.thumbnail_url || youtubeHqThumbnail(video.youtube_id);
  const posterFallback = youtubeHqThumbnail(video.youtube_id);

  if (!src) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <Thumb src={poster} fallbackSrc={posterFallback} alt={video.title_bn || 'ভিডিও'} />
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={video.title_bn ? `${video.title_bn} — ভিডিও চালান` : 'ভিডিও চালান'}
        className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
      >
        <Thumb src={poster} fallbackSrc={posterFallback} alt={video.title_bn || 'ভিডিও'} />
        <span className="absolute inset-0 grid place-items-center bg-black/20 transition-colors group-hover:bg-black/40">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/60 text-white shadow-lg ring-2 ring-white/70 transition-transform group-hover:scale-110 group-hover:bg-[#CC0000]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      <iframe
        key={video.id || src}
        src={src}
        title={video.title_bn || 'ভিডিও'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        className="h-full w-full"
      />
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
        {/* Feature player */}
        <div className="lg:col-span-3">
          <div className="relative">
            <Player key={feature?.id ?? feature?.youtube_id ?? 'feature'} video={feature} />
            {feature?.is_live && (
              <span className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded bg-[#CC0000] px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
                Live
              </span>
            )}
          </div>
          <h3 className="mt-3 font-serifbn text-lg font-bold leading-snug md:text-xl">
            {feature?.title_bn || 'লাইভ সম্প্রচার'}
          </h3>
          {feature?.title_en && (
            <p className="mt-1 text-xs uppercase tracking-widest text-white/40">{feature.title_en}</p>
          )}
        </div>

        {/* Playlist */}
        <div className="flex flex-col gap-2 lg:col-span-2">
          {ordered.map((v) => {
            const isActive =
              feature?.id === v.id && feature?.title_bn === v.title_bn;
            return (
              <button
                key={v.id ?? v.title_bn ?? v.embed_url}
                type="button"
                onClick={() => setActive(v)}
                aria-pressed={isActive}
                className={`flex gap-3 rounded-xl p-2 text-left transition-colors ${
                  isActive ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-28 shrink-0 overflow-hidden rounded-lg">
                  <Thumb
                    key={v.id ?? v.title_bn ?? v.embed_url}
                    src={v.thumbnail_url}
                    fallbackSrc={youtubeHqThumbnail(v.youtube_id)}
                    alt={v.title_bn || ''}
                  />
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
