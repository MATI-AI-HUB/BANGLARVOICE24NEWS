'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * AudioPlayerWidget — floating bottom bar for Bengali text-to-speech narration.
 * Uses the Web Speech API (speechSynthesis) with the user's Bengali voice when
 * available. No external dependency, no keys — works offline of the AI APIs.
 */
export function AudioPlayerWidget({ text, title }: { text: string; title?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
    setSpeaking(false);
  };

  const toggle = () => {
    if (!supported) return;
    if (speaking) {
      stop();
      return;
    }
    const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').slice(0, 4200));
    u.lang = bnVoice?.lang || 'bn-BD';
    if (bnVoice) u.voice = bnVoice;
    u.rate = rate;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utteranceRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  if (!supported) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-paper/95 backdrop-blur-md dark:border-neutral-800 dark:bg-ink/95">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {/* fake waveform */}
        <div className="flex h-6 items-center gap-0.5" aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full transition-all duration-300 ${speaking ? 'animate-pulse bg-primary' : 'bg-neutral-300 dark:bg-neutral-600'}`}
              style={{ height: speaking ? `${5 + ((i * 37) % 16)}px` : '4px' }}
            />
          ))}
        </div>
        <button
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow transition-transform hover:scale-105 active:scale-95"
          aria-label={speaking ? 'থামান' : 'শোনুন'}
        >
          {speaking ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink dark:text-paper">
            {speaking ? 'পড়া হচ্ছে…' : title || 'শিরোনাম পড়ে শুনুন'}
          </div>
          <div className="text-[11px] text-neutral-500">বাংলা টেক্সট-টু-স্পিচ</div>
        </div>
        {/* speed control */}
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-border p-0.5 dark:border-neutral-700">
          {[0.75, 1, 1.25].map((r) => (
            <button
              key={r}
              onClick={() => {
                setRate(r);
                if (speaking) {
                  stop();
                  setTimeout(() => {
                    const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').slice(0, 4200));
                    u.lang = bnVoice?.lang || 'bn-BD';
                    if (bnVoice) u.voice = bnVoice;
                    u.rate = r;
                    u.onend = () => setSpeaking(false);
                    u.onerror = () => setSpeaking(false);
                    window.speechSynthesis.speak(u);
                    setSpeaking(true);
                  }, 50);
                }
              }}
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${rate === r ? 'bg-ink text-paper dark:bg-paper dark:text-ink' : 'text-neutral-500'}`}
            >
              {r}×
            </button>
          ))}
        </div>
        <button
          onClick={stop}
          className="shrink-0 rounded-full p-2 text-neutral-400 hover:bg-muted hover:text-neutral-600 dark:hover:bg-neutral-800"
          aria-label="বন্ধ"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
