'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * AINewsAnchor — a virtual news-anchor (HeyGen / D-ID style presenter) with
 * Bengali voice-over.
 *
 * Voice strategy (no hardcoded keys):
 *   1. If NEXT_PUBLIC_ELEVENLABS_API_KEY + NEXT_PUBLIC_ELEVENLABS_VOICE_ID are
 *      set, it calls the ElevenLabs TTS REST API and plays the returned audio.
 *   2. Otherwise it falls back to the Web Speech API (speechSynthesis) with
 *      the user's Bengali voice — exactly like audio-player.tsx, so it works
 *      offline with zero keys.
 *
 * The avatar is a pure-CSS/SVG presenter visual (no external asset), so the
 * component is fully self-contained and uses only existing design tokens.
 */

type AnchorScript = {
  title: string;
  body: string;
};

const ELEVENLABS_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '';

export function AINewsAnchor({ script }: { script: AnchorScript }) {
  const [state, setState] = useState<'idle' | 'loading' | 'speaking' | 'paused'>('idle');
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );

  const fullText = `${script.title}। ${script.body}`;

  // Load available voices for the Web Speech fallback.
  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const bnVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('bn')) || null;

  const stop = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState('idle');
  };

  const speakWithWebSpeech = () => {
    if (!supported) {
      setError('এই ব্রাউজারে ভয়েস সাপোর্ট নেই।');
      return;
    }
    const u = new SpeechSynthesisUtterance(fullText.replace(/\s+/g, ' ').slice(0, 4200));
    u.lang = bnVoice?.lang || 'bn-BD';
    if (bnVoice) u.voice = bnVoice;
    u.rate = rate;
    u.onend = () => setState('idle');
    u.onerror = () => setState('idle');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setState('speaking');
  };

  const speakWithElevenLabs = async () => {
    setState('loading');
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_KEY,
          },
          body: JSON.stringify({
            text: fullText.slice(0, 5000),
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.playbackRate = rate;
      audio.onended = () => setState('idle');
      audio.onerror = () => setState('idle');
      await audio.play();
      setState('speaking');
    } catch {
      // Fall back to Web Speech if the key is invalid / network fails.
      setError('ElevenLabs ব্যর্থ — Web Speech fallback ব্যবহার হচ্ছে।');
      speakWithWebSpeech();
    }
  };

  const toggle = () => {
    if (state === 'speaking' || state === 'loading') {
      stop();
      return;
    }
    if (state === 'paused') {
      if (audioRef.current) {
        audioRef.current.play();
        setState('speaking');
      } else {
        window.speechSynthesis.resume();
        setState('speaking');
      }
      return;
    }
    if (ELEVENLABS_KEY && ELEVENLABS_VOICE) {
      speakWithElevenLabs();
    } else {
      speakWithWebSpeech();
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState('paused');
    } else {
      window.speechSynthesis.pause();
      setState('paused');
    }
  };

  const isActive = state === 'speaking' || state === 'loading';

  return (
    <section
      aria-labelledby="ai-anchor-heading"
      className="my-14 overflow-hidden rounded-3xl border border-border bg-paper p-5 shadow-card dark:border-white/10 dark:bg-ink md:p-8"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="ai-anchor-heading"
          className="flex items-center gap-2 font-serifbn text-2xl font-extrabold tracking-tight text-ink dark:text-paper"
        >
          <span aria-hidden>🎙️</span> AI নিউজ অ্যাংকর
        </h2>
        <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-white ${isActive ? 'animate-pulse' : ''}`}
            aria-hidden
          />
          {isActive ? 'সম্প্রচার চলছে' : 'AI প্রেজেন্টার'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Avatar / presenter visual */}
        <div className="lg:col-span-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-900 dark:border-white/10">
            {/* Studio backdrop */}
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(196,30,30,0.35),transparent_60%)]"
              aria-hidden
            />
            {/* Presenter silhouette */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center" aria-hidden>
              <div className="relative h-40 w-40 rounded-full border-4 border-white/20 bg-gradient-to-br from-neutral-500 to-neutral-700">
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600" />
                {/* face */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-neutral-300 to-neutral-500" />
                </div>
                {/* eyes */}
                <div className="absolute left-1/2 top-[38%] flex -translate-x-1/2 gap-6">
                  <span className="h-2 w-2 rounded-full bg-neutral-900" />
                  <span className="h-2 w-2 rounded-full bg-neutral-900" />
                </div>
                {/* smile */}
                <div className="absolute left-1/2 top-[52%] h-1.5 w-8 -translate-x-1/2 rounded-full bg-neutral-800" />
              </div>
              {/* shoulders */}
              <div className="h-16 w-56 rounded-t-full bg-gradient-to-b from-neutral-600 to-neutral-800" />
            </div>
            {/* LIVE / AI indicator */}
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-primary px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-white ${isActive ? 'animate-pulse' : ''}`}
                aria-hidden
              />
              {isActive ? 'LIVE' : 'AI'}
            </div>
            {/* waveform when speaking */}
            {isActive && (
              <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-1" aria-hidden>
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 animate-pulse rounded-full bg-primary"
                    style={{ height: `${6 + ((i * 13) % 18)}px` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Script + controls */}
        <div className="flex flex-col lg:col-span-3">
          <h3 className="font-serifbn text-lg font-bold leading-snug text-ink dark:text-paper">
            {script.title}
          </h3>
          <p className="mt-2 flex-1 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            {script.body}
          </p>

          {error && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              {error}
            </p>
          )}

          {/* Controls */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={toggle}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
              aria-label={isActive ? 'বন্ধ করুন' : 'শুনুন'}
            >
              {state === 'loading' ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
              ) : isActive ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              {isActive ? 'বন্ধ' : 'শুনুন'}
            </button>

            {state === 'speaking' && (
              <button
                onClick={pause}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-muted px-5 text-sm font-semibold text-ink transition-colors hover:bg-muted/70 dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
                aria-label="বিরতি"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                বিরতি
              </button>
            )}

            {/* Speed control */}
            <div className="flex items-center gap-1 rounded-full border border-border p-0.5 dark:border-white/10">
              {[0.75, 1, 1.25].map((r) => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    rate === r
                      ? 'bg-ink text-paper dark:bg-paper dark:text-ink'
                      : 'text-neutral-500 hover:text-ink dark:hover:text-paper'
                  }`}
                  aria-label={`গতি ${r}×`}
                >
                  {r}×
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-[11px] text-neutral-500">
            {ELEVENLABS_KEY && ELEVENLABS_VOICE
              ? 'ElevenLabs AI ভয়েস'
              : 'বাংলা টেক্সট-টু-স্পিচ (Web Speech API) — ElevenLabs key যোগ করলে AI ভয়েস চালু হবে'}
          </p>
        </div>
      </div>
    </section>
  );
}