'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Banglar Voice — Learning Hub chatbot.
 *
 * A self-contained, key-free assistant that answers common questions about the
 * newsroom, the AI pipeline, fact-checking, and how to use the site. It uses a
 * deterministic Bengali rule engine (fast, offline, zero-latency) and, when a
 * chat AI endpoint is configured via NEXT_PUBLIC_CHAT_AI_URL + NEXT_PUBLIC_CHAT_AI_KEY,
 * falls back to that endpoint for open-ended questions. No secrets are hardcoded.
 */

type ChatMessage = { role: 'user' | 'bot'; text: string };

const CHAT_AI_URL = process.env.NEXT_PUBLIC_CHAT_AI_URL || '';
const CHAT_AI_KEY = process.env.NEXT_PUBLIC_CHAT_AI_KEY || '';

const SUGGESTIONS = [
  'বাংলার ভয়েস কী?',
  'সংবাদ কীভাবে যাচাই করা হয়?',
  'AI অ্যাংকর কী?',
  'কীভাবে রিপোর্ট পাঠাবো?',
  'ই-পেপার কোথায় পাবো?',
];

/** Deterministic Bengali answer engine — instant, offline, no API key needed. */
export function answer(question: string): string {
  const q = question.toLowerCase();

  if (/(বাংলার ভয়েস|banglar voice|পরিচয়|about)/.test(q) && /(কী|কি|about|পরিচয়|কেমন|কেন)/.test(q)) {
    return (
      'বাংলার ভয়েস একটি স্বাধীন, নিরপেক্ষ ও দায়িত্বশীল অনলাইন সংবাদমাধ্যম। ' +
      'আমরা ২৪/৭ AI-চালিত নিউজরুমে দেশ-বিদেশের খবর সংগ্রহ, যাচাই ও প্রকাশ করি — ' +
      'সত্যের সন্ধানে, নিরপেক্ষ সংবাদ।'
    );
  }
  if (/(যাচাই|fact|সত্য|নিরপেক্ষ|বিশ্বাস)/.test(q)) {
    return (
      'প্রতিটি সংবাদ ৩-স্তরের যাচাইয়ের মধ্য দিয়ে যায়: (১) উৎসের বিশ্বাসযোগ্যতা স্কোর, ' +
      '(২) একাধিক নির্ভরযোগ্য সোর্সের সাথে cross-reference, (৩) AI ফ্যাক্ট-চেক (ai_score 0–100)। ' +
      'ai_score ৮০+ হলে অটো-প্রকাশ, ৫০–৭৯ হলে এডিটর রিভিউ, ৫০-এর নিচে প্রত্যাখ্যান।'
    );
  }
  if (/(ai|অ্যাংকর|anchor|ভয়েস|voice|পডকাস্ট)/.test(q)) {
    return (
      'AI নিউজ অ্যাংকর একটি ভার্চুয়াল প্রেজেন্টার যা বাংলায় সংবাদ পড়ে শোনায়। ' +
      'এটি ElevenLabs (ঐচ্ছিক) বা Web Speech API দিয়ে বাংলা ভয়েসওভার তৈরি করে — ' +
      'হোমপেজের "AI নিউজ অ্যাংকর" সেকশনে প্লে/পজ/গতি নিয়ন্ত্রণসহ দেখতে পাবেন।'
    );
  }
  if (/(রিপোর্ট|report|পাঠান|submit|নাগরিক|সাংবাদিক)/.test(q)) {
    return (
      'আপনি নাগরিক রিপোর্টার হিসেবে ছবি/ভিডিও/লেখা পাঠাতে পারেন। ' +
      'রিপোর্ট জমা দিলে তা field_reports টেবিলে যায়, এডিটর বোর্ডে লাইভ আপডেট হয়, ' +
      'এবং অনুমোদিত হলে ব্রেকিং/লাইভ সেকশনে চলে আসে।'
    );
  }
  if (/(ই-পেপার|epaper|e-paper|পেপার|সংবাদপত্র)/.test(q)) {
    return (
      'প্রতিদিন রাত ১১টা–১২টার মধ্যে দিনের সেরা সংবাদ থেকে স্বয়ংক্রিয়ভাবে ই-পেপার (PDF) তৈরি হয় ' +
      'এবং নিজের আর্কাইভে যুক্ত হয়। "ই-পেপার" পেজ থেকে আজকের ও আগের সব সংস্করণ পড়তে পারবেন।'
    );
  }
  if (/(অ্যাপ|app|ডাউনলোড|android|apk)/.test(q)) {
    return (
      'আমাদের Android অ্যাপটি /download পেজ থেকে ডাউনলোড করতে পারবেন — ' +
      'সেখানে APK ফাইল, SHA-256 চেকসাম ও ইনস্টল ধাপ দেওয়া আছে।'
    );
  }
  if (/(নিউজলেটার|সাবস্ক্রাইব|subscribe|ইমেইল)/.test(q)) {
    return (
      'হোমপেজের নিউজলেটার ফর্মে ইমেইল দিলে প্রতিদিনের গুরুত্বপূর্ণ সংবাদ আপনার ইনবক্সে পাবেন। ' +
      'মেম্বারশিপ নিলে বিজ্ঞাপন-মুক্ত পড়া ও এক্সক্লুসিভ কনটেন্ট পাবেন।'
    );
  }
  if (/(রাজস্ব|বিজ্ঞাপন|ad|স্পনসর|মেম্বার|টাকা)/.test(q)) {
    return (
      'বাংলার ভয়েসের আয়ের উৎস: বিজ্ঞাপন (AdSense), স্পনসরড কনটেন্ট, মেম্বারশিপ/সাবস্ক্রিপশন, ' +
      'নিউজলেটার ও অ্যাফিলিয়েট। সবগুলো সিস্টেমে কোড-হুকসহ বাস্তবায়িত।'
    );
  }
  if (/(লাইভ|live|ব্রেকিং|breaking)/.test(q)) {
    return (
      'ব্রেকিং নিউজ হেডারের উপরে লাল টিকার মতো চলতে থাকে, আর লাইভ সেকশনে রিয়েল-টাইম আপডেট + ভিডিও স্ট্রিম দেখতে পাবেন।'
    );
  }
  if (/(ধন্যবাদ|thanks|thank)/.test(q)) {
    return 'আপনাকে ধন্যবাদ! আরও কিছু জানতে চাইলে লিখুন।';
  }
  return (
    'দুঃখিত, এই প্রশ্নের উত্তর আমার কাছে নেই। ' +
    'আমি জানি: বাংলার ভয়েস পরিচয়, সংবাদ যাচাই, AI অ্যাংকর, রিপোর্ট পাঠানো, ই-পেপার, অ্যাপ, নিউজলেটার ও রাজস্ব। ' +
    'অন্য প্রশ্নে "সাহায্য" লিখুন।'
  );
}

export function LearningHub() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: 'সালাম! আমি বাংলার ভয়েসের সহকারী। সংবাদ, যাচাই, AI অ্যাংকর, ই-পেপার — যেকোনো বিষয়ে জিজ্ঞাসা করুন।' },
  ]);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setMessages((m) => [...m, { role: 'user', text: trimmed }]);
    setInput('');
    setBusy(true);

    // Fast deterministic answer first.
    const local = answer(trimmed);
    if (CHAT_AI_URL && CHAT_AI_KEY) {
      try {
        const res = await fetch(`${CHAT_AI_URL}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHAT_AI_KEY}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            messages: [
              { role: 'system', content: 'You are the Banglar Voice assistant. Answer concisely in Bengali.' },
              { role: 'user', content: trimmed },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const content: string = data?.choices?.[0]?.message?.content ?? '';
          if (content) {
            setMessages((m) => [...m, { role: 'bot', text: content }]);
            setBusy(false);
            return;
          }
        }
      } catch {
        // fall through to local answer
      }
    }
    setMessages((m) => [...m, { role: 'bot', text: local }]);
    setBusy(false);
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'লিংকিং হাব বন্ধ করুন' : 'লিংকিং হাব খুলুন'}
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-card transition-transform hover:scale-105 dark:bg-primary"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="লিংকিং হাব"
          className="fixed bottom-24 right-4 z-50 flex h-[520px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-paper shadow-card dark:border-white/10 dark:bg-ink"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-primary px-4 py-3 text-white dark:border-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">ব</div>
            <div>
              <div className="text-sm font-bold">লিংকিং হাব</div>
              <div className="text-[11px] text-white/80">বাংলার ভয়েস সহকারী</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-primary text-white'
                      : 'rounded-bl-sm bg-muted text-ink dark:bg-white/10 dark:text-white'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-[13px] text-ink/60 dark:bg-white/10 dark:text-white/60">
                  লিখছি…
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-ink/70 transition-colors hover:bg-primary hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-white/70"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3 dark:border-white/10"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="প্রশ্ন লিখুন…"
              aria-label="প্রশ্ন"
              className="flex-1 rounded-full border border-border bg-muted px-4 py-2.5 text-[13px] text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-40"
              aria-label="পাঠান"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}