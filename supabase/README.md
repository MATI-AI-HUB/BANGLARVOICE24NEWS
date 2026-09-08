# Banglar Voice — Supabase Backend

একটি **single Supabase project** যা ৪টি ক্লায়েন্টকে সার্ভ করে: **3টি Flutter অ্যাপ** (reader / reporter / admin-editorial) + **Next.js website** + **admin console**। এই ফোল্ডারে আছে সম্পূর্ণ ডেটাবেস schema, Storage bucket, Edge Functions ও ক্লায়েন্ট উদাহরণ।

> ⚠️ **বাস্তবতা:** repo-র বর্তমান backend হলো **PocketBase** (`backend/`), এবং এই ডেলিভারেবলে কোনো **live Supabase project এখনো নেই** — তাই এখানে যা যা আছে তা **deploy-ready artifact**; `supabase db push` অথবা SQL console-এ চালানোর পরই live হবে। কোনো কোড মিথ্যা "working Supabase" দাবি করে না।

---

## 📁 ফোল্ডার গঠন

```
supabase/
├── schema.sql              # ৭টি টেবিল + enums + RLS + triggers + Realtime + seed
├── storage.sql             # ৩টি bucket + policies
├── .env.example            # env ভ্যারিয়েবল নমুনা
├── examples/
│   ├── breaking-ticker.ts  # Next.js: header marquee Supabase থেকে পড়া + Realtime
│   └── get-api-key.ts      # Next.js + Flutter vault-key client helper
└── functions/
    ├── _shared/cors.ts     # CORS helper
    ├── ai-process-report/  # Whisper→translate→fact-check→summary→duplicate
    └── getApiKey/          # vault-decrypt (একমাত্র key-বিতরণ পথ)
```

---

## ✅ Supabase-এর **ভিতরে** (এই ফোল্ডার)

| বিষয় | বিস্তারিত |
|---|---|
| **Auth** | Supabase Auth (phone + email)। সাইন-আপে `profiles` সারি auto-তৈরি হয় (trigger), default role `citizen_reporter` |
| **`profiles`** | `role` enum: `citizen_reporter / staff_reporter / desk_editor / chief_editor / admin` + district, phone, `verified` |
| **`field_reports`** | reporter জমা দেয়; Realtime-enabled; AI কলাম (`ai_score`, `ai_transcript`, `ai_summary`, `ai_translation_en`, `ai_duplicate_of`) |
| **`articles`** | desk-edited বাইলিঙ্গুয়াল নিবন্ধ (field_report থেকে promote) |
| **`live_sessions`** | `rtmp_key_ref` = **vault secret id** — raw RTMP key কখনো সংরক্ষিত নয় |
| **`breaking_ticker`** | singleton সারি — website header marquee এখান থেকে পড়ে (hardcode নয়) |
| **`api_vault`** | `key_encrypted` = pgsodium vault secret ref; শুধু `getApiKey` fn ডিক্রিপ্ট করে |
| **`notifications`** | in-app push সারি (FCM fan-out worker-এর জন্য) |
| **Storage** | `field-media` (private), `thumbnails` (public), `logos` (public) |
| **Realtime** | `field_reports` INSERT→editorial board; status→`approved_for_live`→breaking/live app; `breaking_ticker` UPDATE→সব header |
| **Edge Fns** | `ai-process-report`, `getApiKey` |

### RLS সার-সংক্ষেপ

| টেবিল | citizen_reporter | staff_reporter | desk_editor | chief_editor / admin | anon |
|---|---|---|---|---|---|
| `field_reports` | নিজেরই (INSERT/দেখা/draft-সম্পাদনা) | নিজের + সব দেখে | সব দেখে + status বদলায় | সব + status | — |
| `articles` | published পড়ে | published পড়ে | insert/update | insert/update | published পড়ে |
| `breaking_ticker` | active পড়ে | active পড়ে | active পড়ে | + update | active পড়ে |
| `api_vault` | — | — | — | শুধু service-role fn (RLS 0 সারি) | — |
| `live_sessions` | চলমান দেখে | চলমান দেখে | manage | manage | চলমান দেখে |
| `notifications` | নিজের | নিজের | নিজের | নিজের | — |
| `profiles` | নিজের | নিজের + সব | সব | সব | — |

### Edge Functions

**`ai-process-report`** — INSERT-পরবর্তী ২৪/৭ পাইপলাইন:
1. media (audio/video) → **Whisper** → বাংলা ট্রান্সক্রিপ্ট
2. bn↔en অনুবাদ (`ai_translation_en`)
3. **fact-check** → `ai_score` 0–100
4. ৩-বুলেট **AI সারাংশ** (`ai_summary`)
5. ৪৮ ঘণ্টার ডুপ্লিকেট চেক → `ai_duplicate_of`
6. একই সারি server-side UPDATE (RLS-বাইপাস) + editorial-নোটিফিকেশন

**`getApiKey`** — ভল্ট থেকে key ডিক্রিপ্ট করে। **শুধুমাত্র `admin`/`chief_editor`** (বা service-role)। Flutter/Next.js কখনো key হার্ডকোড করে না; admin console-এ rotate করলে **app rebuild লাগে না**।

---

## 🚫 Supabase-এর **বাইরে** (এখানে নেই — ভিন্ন সিস্টেম)

| যা | কোথায় | মন্তব্য |
|---|---|---|
| **Website hosting** | Vercel | `frontend/` Next.js; breaking ticker শুধু **ডেটা** Supabase থেকে |
| **AI models** | OpenAI / Claude / Gemini | key শুধু api_vault-এ; edge fn কল করে |
| **Video transcoding** | Mux / Cloudflare Stream | `live_sessions`-এ শুধু metadata/ref |
| **FCM push delivery** | OneSignal / FCM worker | `notifications` সারি + vault-key দিয়ে fan-out |
| **Media CDN** | Supabase Storage public URL / নিজস্ব CDN | thumbnails/logos public |

নিয়ম: **কোনো raw key frontend-এ নয়, কোনো raw RTMP key ডেটাবেসে নয়।**

---

## 🚀 Apply করার ধাপ (live project দরকার)

1. **Supabase project তৈরি করুন** (dashboard.supabase.com) — region Asia (Singapore) best for BD
2. `supabase login` → `supabase link --project-ref <ref>`
3. **Vault সক্রিয় করুন:** Dashboard → Database → Extensions → **pgsodium** enable (hosted-এ pre-enabled)
   - pgsodium key থাকতে হবে: `select * from pgsodium.valid_key;`
4. **Schema:** `supabase db push` (অথবা SQL editor-এ `schema.sql` পেস্ট)
5. **Storage:** `supabase db push`-এ storage.sql আলাদা ফাইল → SQL editor-এ চালান (bucket আগে dashboard থেকে বানালে policy-ই main)
6. **Edge functions:**
   ```bash
   supabase functions deploy getApiKey
   supabase functions deploy ai-process-report
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role>  # deploy-এ auto থাকে
   ```
7. **Vault-এ প্রথম key রাখুন (admin console API Vault বা SQL):**
   ```sql
   select vault.create_secret('sk-REAL-KEY', 'OPENAI_API_KEY-prod');
   -- তারপর সেই ফেরত আসা uuid দিয়ে:
   insert into api_vault (service_name, key_encrypted, environment)
   values ('OPENAI_API_KEY', '<uuid>', 'prod')
   on conflict (service_name, environment) do update set key_encrypted = excluded.key_encrypted;
   ```
8. `.env.example` → `.env` পূরণ করুন; Next.js-এ `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` দিন

---

## 🧪 যাচাই (এই pass-এ)

- `schema.sql` / `storage.sql` — **live Supabase project নেই** বলে কোনো real DB-তে চালানো হয়নি; PostgreSQL সিনট্যাক্স হাতে-যাচাই + পরবর্তী `deno check` (নিচে)। **লাইভ প্রজেক্টে apply হয়নি।**
- Edge functions TypeScript — `deno`/`supabase` CLI এই sandbox-এ নেই; তাই compile-চেক করা যায়নি (Deno-র জন্য লেখা)। স্থানীয়ভাবে `supabase functions serve` দিয়ে test করুন।

---

## 🔒 নিরাপত্তা নোট

- `api_vault`-এ anon/authenticated-এর কোনো policy নেই → ক্লায়েন্টে **0 সারি**
- রোল পরিবর্তন শুধু `set_user_role` RPC (admin) দিয়ে
- `submit_field_report` RPC reporter-এর নিজের draft → `pending_review`
- `replica identity full` → Realtime UPDATE-এ পুরো সারি পায়
