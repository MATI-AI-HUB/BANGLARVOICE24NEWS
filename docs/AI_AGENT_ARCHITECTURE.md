# বাংলার ভয়েস — AI এজেন্ট আর্কিটেকচার ডকুমেন্ট

> **সংস্করণ:** 1.0 · **তারিখ:** ২০২৬-০৯-০৮ · **স্থিতি:** প্রোডাকশন-রেডি ডিজাইন
> এই ডকুমেন্টটি `bv-allinone_v2` রিপোজিটরির **বাস্তব কোড** থেকে লেখা — প্রতিটি এজেন্ট, ফাইল, API ও টুলের নাম প্রকৃত সোর্স থেকে নেওয়া। কোনো কাল্পনিক তথ্য নেই।

---

## ১. ভূমিকা — এই ডকুমেন্ট কী উত্তর দেয়

নিচের ১০টি প্রশ্নের পূর্ণাঙ্গ, কোড-গ্রাউন্ডেড উত্তর এই ফাইলে আছে:

1. কয়টি AI এজেন্ট আছে এবং প্রতিটির ভূমিকা কী?
2. সুপারভাইজার কীভাবে সিদ্ধান্ত নেয় (কনফিডেন্স স্কোর, হিউম্যান-ইন-দ্য-লুপ)?
3. নিউজ সোর্সের তালিকা ও ফ্রিকোয়েন্সি কী?
4. রিরাইট/মিডিয়া/অডিও পাইপলাইনের টুল কী কী?
5. ফ্যাক্ট-চেক ডিজাইন (ai_score 0–100, থ্রেশহোল্ড)?
6. এনরিচমেন্ট (সমৃদ্ধকরণ) পদ্ধতি কী?
7. টিম/এজেন্ট মালিকানা টেবিল?
8. রেভিনিউ প্ল্যান (AdSense/স্পনসর/মেম্বারশিপ/নিউজলেটার/অ্যাফিলিয়েট)?
9. ওপেন-সোর্স TTS উত্তর (Coqui/Piper/Kokoro/Web Speech, ল্যাটেন্সি, বাংলা সাপোর্ট)?
10. প্রতিযোগিতামূলক এজ (AI অ্যাংকর, পার্সোনালাইজড ফিড, PWA, i18n)?

---

## ২. এজেন্ট তালিকা ও ভূমিকা (Agent Registry)

বাস্তব কোড: `docs/design-web-v6/worker/src/agents/` — `types.ts`, `registry.ts`, `chain-agents.ts`, `supervisor.ts`

### ২.১ এজেন্ট রেজিস্ট্রি (registry.ts)

| # | এজেন্ট | ফাইল | ভূমিকা | ইনপুট → আউটপুট | টুল | ফ্রিকোয়েন্সি |
|---|--------|------|--------|----------------|-----|--------------|
| 01 | **Collector** (সংগ্রাহক) | `collector.ts` | RSS/Atom ফিড থেকে কাঁচা নিউজ সংগ্রহ | ফিড URL → কাঁচা আইটেম | RSS পার্সার, HTTP fetch | প্রতি ১৫ মিনিট (INTERVAL_MINUTES) |
| 02 | **Rewriter** (পুনর্লিখক) | `rewriter.ts` | কপিরাইট-মুক্ত বাংলা প্রসা তৈরি | কাঁচা আইটেম → মূল বাংলা লেখা | OpenAI-compatible chat (gpt-4o-mini) অথবা ডিটারমিনিস্টিক বাংলা প্যারাফ্রেজ ইঞ্জিন | প্রতি চক্র |
| 03 | **Media** (মিডিয়া) | `media.ts` | CC0 ছবি/ভিডিও সোর্সিং | লেখা → ছবি URL | Wikimedia Commons, Openverse (কোনো key লাগে না), Pexels (ঐচ্ছিক) | প্রতি চক্র |
| 04 | **Editor** (সম্পাদক) | `chain-agents.ts` | ড্রাফট যাচাই, হেডলাইন, ট্যাগ | রিরাইট করা লেখা → এডিটেড ড্রাফট | chat (gpt-4o-mini) | প্রতি চক্র |
| 05 | **Publisher** (প্রকাশক) | `orchestrator.ts` | পাইপলাইন স্টেট মেশিন, ড্রাফট POST | এডিটেড ড্রাফট → `BV_BASE_URL`-এ POST | HTTP POST (NEWSROOM_INGEST_KEY) | প্রতি চক্র |
| 06 | **Social** (সোশ্যাল) | `chain-agents.ts` | মাল্টি-প্ল্যাটফর্ম ব্রডকাস্ট | প্রকাশিত আইটেম → FB/X/IG/LinkedIn/Telegram | Graph API, X API v2, LinkedIn API, Telegram Bot | প্রতি প্রকাশ |
| 07 | **Supervisor** (তত্ত্বাবধায়ক) | `supervisor.ts` | সিদ্ধান্ত, কনফিডেন্স, হিউম্যান-ইন-দ্য-লুপ | সব এজেন্টের আউটপুট → publish/approve/reject | Telegram কমান্ড কন্ট্রোল প্লেন | ক্রমাগত |

### ২.২ এজেন্ট IO ও টুল (বিস্তারিত)

**Collector** — `NEWS_RSS_URLS` (কমা-বিচ্ছিন্ন) থেকে ফিড পড়ে; খালি থাকলে বিল্ট-ইন সোর্স লিস্ট (বাংলাদেশ জাতীয়, রাজনীতি, অর্থনীতি, খেলাধুলা, প্রযুক্তি, বিনোদন, আন্তর্জাতিক — Google News RSS index)। লুপ ইন্টারভাল ডিফল্ট ১৫ মিনিট, ন্যূনতম ১০।

**Rewriter** — `CHAT_AI_BASE_URL` OpenAI-compatible (OpenAI/Gemini/Groq/Ollama)। `CHAT_AI_KEY` খালি থাকলে **deterministic বাংলা প্যারাফ্রেজ ইঞ্জিন** (কপিরাইট-মুক্ত, মূল প্রসা) — অর্থাৎ AI key ছাড়াও কাজ করে।

**Media** — Wikimedia Commons + Openverse (key-মুক্ত), Pexels (ঐচ্ছিক, বিনামূল্যে key)। সব ছবি CC0/লাইসেন্স-নিরাপদ।

**Publisher** — `BV_BASE_URL`-এ ড্রাফট POST করে; `NEWSROOM_INGEST_KEY` শেয়ার্ড সিক্রেট দিয়ে যাচাই। `AUTO_PUBLISH=false` হলে আইটেম `newsroom_queue`/pipeline state-এ অপেক্ষা করে এডিটরের জন্য।

**Social** — প্রতিটি প্ল্যাটফর্মের ক্রেডেনশিয়াল মিসিং থাকলে সেই প্ল্যাটফর্ম স্কিপ হয়। Telegram শুধু ব্রডকাস্ট নয় — **এডিটোরিয়াল কমান্ড কন্ট্রোলার**ও: `/publish`, `/approve`, `/reject`, `/status`, `/sources`, `/pause`।

---

## ৩. সুপারভাইজার সিদ্ধান্ত লজিক

### ৩.১ কনফিডেন্স স্কোর (ai_score 0–100)

সুপারভাইজার প্রতিটি ফিল্ড রিপোর্ট/আইটেমে **0–100 স্কোর** দেয়:

| স্কোর | অর্থ | অ্যাকশন |
|-------|------|---------|
| **100** | সম্পূর্ণ যাচাইযোগ্য/সমর্থিত | স্বয়ংক্রিয় প্রকাশ (যদি AUTO_PUBLISH=true) |
| **50** | প্লসিবল কিন্তু অযাচাইকৃত | এডিটর রিভিউ-এ পাঠানো হয় |
| **0** | স্পষ্ট মিথ্যা / হোয়াক্স | প্রত্যাখ্যান |

- ফ্যাক্ট-চেকার প্রম্পট: *"Given a short field report, return ONLY an integer 0-100 where 100 = fully verifiable/corroborated, 50 = plausible but unverified, 0 = clearly false or hoax."*
- `parseInt` + `Math.max(0, Math.min(100, …))` দিয়ে ক্ল্যাম্প করা হয়; অ-সংখ্যা হলে ডিফল্ট 50।

### ৩.২ হিউম্যান-ইন-দ্য-লুপ (Telegram কন্ট্রোল প্লেন)

- `AUTO_PUBLISH=false` (ডিফল্ট) → প্রতিটি আইটেম এডিটরের অনুমোদনের অপেক্ষায় থাকে।
- এডিটর Telegram-এ `/approve <id>` বা `/publish <id>` দিয়ে মুভ করে।
- `TELEGRAM_ALLOWED_CHAT_IDS` (ঐচ্ছিক) — শুধু নির্দিষ্ট chat id-কে কমান্ড দেওয়ার অনুমতি (সুপারিশকৃত)।
- **ডুপ্লিকেট চেক:** গত ৪৮ ঘণ্টার রিপোর্টের সাথে title/ai_summary মিলিয়ে `ai_duplicate_of` সেট হয় — একই খবর দ্বিগুণ প্রকাশ রোধ।

---

## ৪. নিউজ সোর্স ও ফ্রিকোয়েন্সি

| সোর্স | ধরন | ফ্রিকোয়েন্সি |
|-------|------|--------------|
| বাংলাদেশ জাতীয় (বিল্ট-ইন) | RSS | প্রতি ১৫ মিনিট |
| রাজনীতি | RSS | প্রতি ১৫ মিনিট |
| অর্থনীতি | RSS | প্রতি ১৫ মিনিট |
| খেলাধুলা | RSS | প্রতি ১৫ মিনিট |
| প্রযুক্তি | RSS | প্রতি ১৫ মিনিট |
| বিনোদন | RSS | প্রতি ১৫ মিনিট |
| আন্তর্জাতিক (Google News RSS index) | RSS | প্রতি ১৫ মিনিট |
| **নাগরিক রিপোর্টার** (field_reports) | Supabase DB | রিয়েল-টাইম (insert trigger) |

`NEWS_RSS_URLS` এনভায়রনমেন্টে কাস্টম ফিড যোগ করা যায় (কমা-বিচ্ছিন্ন)।

---

## ৫. রিরাইট / মিডিয়া / অডিও পাইপলাইন টুল

### ৫.১ রিরাইট পাইপলাইন
1. Collector → কাঁচা আইটেম
2. Rewriter → `gpt-4o-mini` (temperature 0.2) অথবা deterministic বাংলা প্যারাফ্রেজ
3. Editor → হেডলাইন/ট্যাগ/ড্রাফট যাচাই
4. Publisher → `BV_BASE_URL`-এ POST

### ৫.২ মিডিয়া পাইপলাইন
- **Wikimedia Commons** — CC0 ছবি, কোনো key লাগে না
- **Openverse** — CC0/CC-লাইসেন্স, কোনো key লাগে না
- **Pexels** — ঐচ্ছিক, বিনামূল্যে key (ভালো ফটো)
- সব ছবি `width`/`height` সহ (CLS 0), WebP 92% সেভ

### ৫.৩ অডিও / TTS পাইপলাইন (ফ্রন্টএন্ড)

বাস্তব কোড: `frontend/components/audio-player.tsx`, `frontend/components/ai-anchor.tsx`

| টুল | ব্যবহার | বাংলা সাপোর্ট | ল্যাটেন্সি |
|-----|---------|--------------|-----------|
| **Web Speech API** (`speechSynthesis`) | ডিফল্ট, কোনো key লাগে না, অফলাইন | `bn-BD` ভয়েস খোঁজে | তাৎক্ষণিক (ব্রাউজার-নেটিভ) |
| **ElevenLabs** (`eleven_multilingual_v2`) | `NEXT_PUBLIC_ELEVENLABS_API_KEY` + `VOICE_ID` সেট থাকলে | হ্যাঁ (মাল্টিলিঙ্গুয়াল) | ~১–২ সেকেন্ড (API) |
| **AI অ্যাংকর** (HeyGen/D-ID স্টাইল) | CSS/SVG প্রেজেন্টার + বাংলা ভয়েস-ওভার | হ্যাঁ | ElevenLabs fail হলে Web Speech fallback |

> **AI-অ্যাংকর লজিক:** ElevenLabs key থাকলে API কল → অডিও প্লে; key না থাকলে বা fail হলে Web Speech API-তে fallback। সম্পূর্ণ self-contained, কোনো বাহ্যিক asset নেই।

---

## ৬. ফ্যাক্ট-চেক ডিজাইন

বাস্তব কোড: `supabase/functions/ai-process-report/index.ts`

1. **ট্রান্সক্রিপশন:** প্রথম অডিও/ভিডিও → Whisper (`whisper-1`, language `bn`) → `ai_transcript`
2. **অনুবাদ:** বাংলা ↔ ইংরেজি অটো-ডিটেক্ট (ইউনিকোড রেঞ্জ `\u0980-\u09FF`) → `ai_translation_en`
3. **ফ্যাক্ট-চেক:** `gpt-4o-mini` → `ai_score` 0–100
4. **সারাংশ:** ৩-বুলেট বাংলা `ai_summary` (প্রতি বুলেট ১৫ শব্দ)
5. **ডুপ্লিকেট:** গত ৪৮ ঘণ্টার সাথে মিল → `ai_duplicate_of`

**থ্রিনহোল্ড:**
- `ai_score >= 80` → স্বয়ংক্রিয় প্রকাশের যোগ্য
- `50–79` → এডিটর রিভিউ
- `< 50` → প্রত্যাখ্যান/ফ্ল্যাগ

**সিকিউরিটি:** API key কখনো ক্লায়েন্টে থাকে না — `api_vault` টেবিলে pgsodium-এনক্রিপ্টেড, `getApiKey` edge function দিয়ে শুধু admin/chief_editor পায়। key না থাকলে graceful skip (রিপোর্ট সেভ হয়, AI ফিল্ড খালি থাকে)।

---

## ৭. এনরিচমেন্ট (সমৃদ্ধকরণ) পদ্ধতি

1. **ট্রান্সক্রিপশন** — অডিও/ভিডিও → বাংলা টেক্সট (Whisper)
2. **অনুবাদ** — বাংলা ↔ ইংরেজি (দ্বিভাষিক অডিয়েন্স)
3. **৩-বুলেট সারাংশ** — দ্রুত স্ক্যানযোগ্য
4. **ফ্যাক্ট-চেক স্কোর** — বিশ্বাসযোগ্যতা ব্যাজ
5. **ডুপ্লিকেট ডিটেকশন** — কনটেন্ট গুণমান
6. **CC0 মিডিয়া** — ভিজ্যুয়াল সমৃদ্ধি
7. **AI অ্যাংকর + অডিও প্লেয়ার** — মাল্টিমিডিয়া অভিজ্ঞতা

---

## ৮. টিম / এজেন্ট মালিকানা টেবিল

| এজেন্ট | মালিকানা | কোড ফাইল | ডিপ্লয় |
|--------|---------|---------|---------|
| Collector | নিউজ ডেস্ক | `worker/src/agents/collector.ts` | Worker (Render) |
| Rewriter | নিউজ ডেস্ক | `worker/src/agents/rewriter.ts` | Worker |
| Media | নিউজ ডেস্ক | `worker/src/agents/media.ts` | Worker |
| Editor | এডিটোরিয়াল | `worker/src/agents/chain-agents.ts` | Worker |
| Publisher | এডিটোরিয়াল | `worker/src/agents/orchestrator.ts` | Worker |
| Social | মার্কেটিং | `worker/src/agents/chain-agents.ts` | Worker |
| Supervisor | চিফ এডিটর | `worker/src/agents/supervisor.ts` | Worker + Telegram |
| AI ফ্যাক্ট-চেক | এডিটোরিয়াল | `supabase/functions/ai-process-report` | Supabase Edge |
| API Vault | অ্যাডমিন | `supabase/functions/getApiKey` | Supabase Edge |

---

## ৯. রেভিনিউ প্ল্যান (কোড-হুক সহ)

| স্ট্রিম | পদ্ধতি | কোড হুক |
|--------|--------|---------|
| **AdSense** | ইন-আর্টিকেল/সাইডবার বিজ্ঞাপন | `frontend/components/` — CLS 0, width/height, lazy |
| **স্পনসরড** | ব্র্যান্ডেড কনটেন্ট | `field_reports` + `ads` টেবিল |
| **মেম্বারশিপ** | প্রিমিয়াম/টিম প্ল্যান | `subscriptions` টেবিল (plan free/premium/team, amount ৳) |
| **নিউজলেটার** | ইমেইল সাবস্ক্রিপশন | `notifications` টেবিল + Telegram ব্রডকাস্ট |
| **অ্যাফিলিয়েট** | লিংক কমিশন | `ads` টেবিল (link_url, clicks, revenue ৳) |

**টার্গেট:** MRR ৳৪৫k, ৪৫০ সাবস্ক্রাইবার, AdSense + স্পনসর + মেম্বারশিপ মিলিয়ে।

---

## ১০. AI-অ্যাংকর ও কোর্পিটিটিভ এজ

| ফিচার | বাস্তবায়ন | কোড |
|--------|-----------|-----|
| **AI নিউজ অ্যাংকর** | CSS/SVG প্রেজেন্টট + বাংলা TTS | `frontend/components/ai-anchor.tsx` |
| **অডিও প্লেয়ার** | ফ্লোটিং বাংলা TTS বার | `frontend/components/audio-player.tsx` |
| **ভিডিও হাব** | ডার্ক লাইভ/পডকাস্ট রেল | `frontend/components/video-hub.tsx` |
| **পার্সোনালাইজড ফিড** | ক্যাটাগরি/ট্যাগ ফিল্টার | `frontend/app/` |
| **PWA** | manifest + sw.js, অফলাইন | `frontend/public/` |
| **i18n** | বাংলা + English | `frontend/lib/` |

---

## ১১. রোডম্যাপ — Phase 0 → 5

| Phase | কাজ | ফাইল/ব্রাঞ্চ | যাচাই কমান্ড |
|-------|-----|-------------|-------------|
| **0** | সেটআপ, env, ডিপ্লয় | `worker/.env`, `supabase/` | `cp .env.example .env` |
| **1** | Collector + Rewriter | `worker/src/agents/collector.ts`, `rewriter.ts` | `npx tsc --noEmit` |
| **2** | Media + Editor | `media.ts`, `chain-agents.ts` | `npx tsc --noEmit` |
| **3** | Publisher + Social | `orchestrator.ts`, `chain-agents.ts` | `npm run lint` |
| **4** | Supervisor + Telegram | `supervisor.ts` | `npm run build` |
| **5** | AI ফ্যাক্ট-চেক + Vault | `supabase/functions/*` | `supabase functions deploy` |

**যাচাই:** `npx tsc --noEmit` → `npm run lint` → `npm run build` → `supabase functions deploy`।

---

## ১২. ওপেন-সোর্স TTS উত্তর

| ইঞ্জিন | বাংলা সাপোর্ট | ল্যাটেন্সি | নোট |
|--------|--------------|-----------|-----|
| **Coqui TTS** | আংশিক (বাংলা মডেল সীমিত) | মাঝারি | Python, self-host |
| **Piper** | ✅ ভালো | কম (CPU-তে দ্রুত) | ONNX, offline |
| **Kokoro** | ✅ (বাংলা মডেল) | কম | হালকা, এমবেডেড |
| **Web Speech API** | ✅ (ব্রাউজার bn-BD) | তাৎক্ষণিক | কোনো key নেই, অফলাইন |

**সুপারিশ:** প্রোডাকশনে **Piper** (offline, কম ল্যাটেন্সি, বাংলা সাপোর্ট) — Web Speech API-র fallback হিসেবে। ElevenLabs প্রিমিয়াম ভয়েসের জন্য ঐচ্ছিক।

---

## ১৩. সিকিউরিটি ও কমপ্লায়েন্স

- **RLS** — প্রতিটি টেবিলে Row-Level Security
- **API Vault** — pgsodium-এনক্রিপ্টেড key, কখনো ক্লায়েন্টে না
- **Rate Limit** — Upstash Redis 60/min
- **2FA** — speakeasy TOTP (অ্যাডমিন)
- **S3 Backup** — pg_dump cron 2 AM + Slack
- **Legal** — Privacy, Terms, DMCA পেজ

---

*ডকুমেন্টটি `bv-allinone_v2` কোডবেসের বাস্তব সোর্স থেকে তৈরি — কোনো ফিকশনাল তথ্য নেই।*