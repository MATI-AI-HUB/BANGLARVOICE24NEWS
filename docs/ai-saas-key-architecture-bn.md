# বাংলার ভয়েস: ২৪/৭ SaaS AI Key ও Provider Architecture

## সরাসরি সিদ্ধান্ত

একই Groq বা OpenRouter account-এর ভেতরে পরিবারের সদস্যদের নামে বহু API key তৈরি করলে credit, account balance বা organization-level quota গুণিতকভাবে বাড়বে না। Groq rate limit organization-level প্রয়োগ করে [1]। OpenRouter-এ account balance, per-key cap এবং in-flight spending budget—তিনটিই আলাদা সীমা; একাধিক key একই account-এর balance ভাগ করে [2]।

তাই production SaaS-এর জন্য সঠিক নকশা হলো:

- ব্যবহারকারীর browser বা mobile app-এ কোনো AI key যাবে না।
- সব AI request একটি server-side **AI Gateway** দিয়ে যাবে।
- শুরুতে **১টি primary OpenRouter account + ১টি backup Groq organization** রাখা হবে।
- ২৪/৭ Learning Hub-এর জন্য **১টি open-source Ollama/vLLM fallback** রাখা হবে Ubuntu VPS-এ।
- পরে প্রয়োজন হলে আলাদা, সত্যিকারের স্বাধীন organization/account থেকে সর্বোচ্চ আরও ১টি OpenRouter ও ১টি Groq backup যোগ করা যাবে।
- পরিবারের সদস্যরা সাহায্য করলে তারা key নিজে chat-এ পাঠাবেন না; নিজের account-এর key-র মালিকানা ও ব্যবহারের স্পষ্ট সম্মতি দিয়ে admin vault form-এ key প্রবেশ করাবেন।

**প্রস্তাবিত সর্বনিম্ন production pool:** ৩টি execution lane।

1. OpenRouter primary: paid, per-key budget সেট করা থাকবে।
2. Groq backup: আলাদা organization/account হলে backup lane হিসেবে ব্যবহৃত হবে।
3. Ollama/vLLM open-source fallback: provider credit ছাড়াই low-cost chat, summarization ও queue recovery।

এটি ১০–২০টি পরিবারের key-এর চেয়ে বেশি স্থায়ী, audit করা সহজ এবং billing dispute কমায়।

## বর্তমান repository audit

বর্তমানে AI call-এর প্রধান স্থানগুলো হলো:

1. `frontend/app/api/learning-hub/route.ts` — Learning Hub browser request-এর server-side provider loop।
2. `frontend/app/api/newsroom/cron-trigger/route.ts` — ১৫ মিনিটের newsroom ingest, rewrite ও publish gate।
3. `worker/src/agents/chat.ts` এবং `worker/src/agents/rewriter.ts` — worker-side AI path।
4. `supabase/functions/news-writer/index.ts` ও `supabase/functions/news-pipeline/index*.ts` — Edge Function path।
5. `supabase/functions/_shared/ai-client.ts` — Vault-backed helper, তবে সব call-site এটি ব্যবহার করছে না।
6. `frontend/app/api/admin/api-keys/*` এবং `supabase/functions/getApiKey` — existing API Vault management path।

বর্তমানে website route-গুলো Vercel environment variable (`OPENROUTER_API_KEY`, `GROQ_API_KEY`) সরাসরি পড়ে। একই সময়ে Supabase-এ `api_vault` এবং Vault-backed helper আছে। অর্থাৎ provider key-এর **দুটি আলাদা source of truth** তৈরি হয়েছে। এটি SaaS production-এ drift, stale key এবং কোন agent কোন key ব্যবহার করছে তা অজানা হওয়ার ঝুঁকি তৈরি করে।

বর্তমান `api_vault`-এ `(service_name, environment)` unique হওয়ায় একই provider-এর বহু independent key pool করা যায় না। আরও গুরুত্বপূর্ণ, `getApiKey` function admin/chief_editor caller-কে decrypted key response-এ ফেরত দেয়। Supabase-এর নিজস্ব Vault documentation-ও সতর্ক করে যে decrypted view বা access যার কাছে থাকবে, সে plaintext secret পেতে পারে [3]। SaaS design-এ কোনো user-facing বা admin-facing API-তে plaintext key ফেরত দেওয়া উচিত নয়।

সর্বশেষ live পরীক্ষায় Learning Hub এখনও `degraded=true` দিয়েছে এবং newsroom-এর আগের runs-এ `ai_rewrite_invalid_key` দেখা গেছে। অতএব key variable থাকা মানেই provider কার্যকর—এমন দাবি করা যাবে না। প্রতিটি key-কে live `/models` বা minimal chat probe দিয়ে validate করে তারপর active করতে হবে।

## কোথায় কোন key রাখা হবে

### Supabase Vault: একমাত্র secret store

প্রতিটি provider credential Supabase Vault-এ encrypted secret হিসেবে থাকবে। Application table-এ plaintext নয়, শুধু Vault secret reference থাকবে। Vercel environment-এ কেবল gateway authentication ও Supabase server credential থাকবে; provider key থাকবে না।

প্রস্তাবিত logical record:

```text
provider        = openrouter | groq | ollama
account_label   = bv-primary-or | bv-family-consented-01
scope           = global | tenant-specific
vault_secret_id = UUID reference only
model           = configured model name
priority        = 10, 20, 30
is_active       = true/false
cooldown_until  = timestamp
failure_count   = integer
monthly_budget  = integer cents or provider units
```

### Vercel: application runtime, key store নয়

Vercel-এ থাকবে:

- Supabase URL ও server-only service credential।
- AI Gateway-এর signed internal secret।
- feature flags, যেমন `AI_GATEWAY_ENABLED`।
- কোনো OpenRouter/Groq plaintext key নয়।

### Supabase Edge Function: centralized AI Gateway

নতুন `ai-gateway` Edge Function সব provider call-এর একমাত্র entry point হবে। Learning Hub, newsroom, worker এবং future TTS agent এই gateway-তে structured request পাঠাবে। Gateway:

1. caller ও tenant যাচাই করবে;
2. task type অনুযায়ী policy নেবে;
3. eligible key pool থেকে একটি key lease করবে;
4. Vault থেকে server-side decrypt করবে;
5. provider call করবে;
6. 401/402/429/5xx আলাদা করে classify করবে;
7. failure হলে circuit breaker চালু করবে;
8. usage, latency, token estimate ও provider status audit করবে;
9. plaintext key কখনো response, log বা database-এ লিখবে না।

### Ubuntu VPS: open-source inference fallback

Vercel/Supabase-এর serverless runtime-এ Ollama বা vLLM চালানো উচিত নয়। এগুলোকে আলাদা Ubuntu VPS-এ চালানো হবে:

- Ollama অথবা vLLM
- Qwen বা Llama family-এর multilingual instruct model
- HTTPS reverse proxy
- private network/Tailscale বা signed gateway request
- request queue ও concurrency cap

এটি OpenRouter/Groq-এর সঙ্গে সমমানের সর্বশেষ model নাও দিতে পারে, কিন্তু credit outage-এর সময় Learning Hub-এর উত্তর, translation, classification ও draft rewrite চালু রাখতে পারে। Breaking-news publish gate-এ local model-এর output অবশ্যই `pending_review` বা stricter confidence gate-এর মধ্যে থাকবে, যতক্ষণ না quality benchmark পাস করে।

## ২৪/৭ Learning Hub policy

Learning Hub-কে সরাসরি তিন provider-এ browser থেকে request না পাঠিয়ে gateway policy-তে চালাতে হবে:

```text
1. Cache identical question + source snapshot for 2–10 minutes
2. Primary OpenRouter, short bounded prompt and max_tokens
3. 429/402 in-flight budget হলে Retry-After মানা
4. Invalid key হলে key-টি সঙ্গে সঙ্গে quarantine
5. Groq backup
6. Ollama fallback
7. সব provider ব্যর্থ হলে source-grounded degraded response
```

একই প্রশ্নের অসংখ্য request ঠেকাতে per-user এবং per-IP rate limit লাগবে। Anonymous user-এর জন্য দৈনিক quota, authenticated user-এর জন্য plan-based quota, এবং premium tenant-এর জন্য নিজের BYOK policy রাখা যাবে। Chat history database-এ রাখলে PII retention policy, deletion এবং tenant isolation লাগবে।

## Newsroom ও অন্যান্য agent-এর key lane

একটি key সব agent-এ একসঙ্গে ব্যবহার না করে task budget আলাদা করা উচিত। তবে আলাদা key মানেই আলাদা account হওয়া বাধ্যতামূলক নয়; একই account-এর key quota বাড়ায় না। Recommended logical lanes:

- **News rewrite lane:** OpenRouter primary, Groq backup, Ollama last-resort draft.
- **Learning Hub lane:** OpenRouter/Groq shared gateway pool, cache ও per-user rate limit সহ।
- **TTS lane:** provider-specific speech key; AI text key-এর সঙ্গে মেশানো নয়। Open-source fallback হিসেবে Piper/Coqui ধরনের local TTS VPS-এ রাখা যাবে।
- **Social caption lane:** newsroom output-এর cached headline/excerpt ব্যবহার; আলাদা AI call না করাই ভালো।
- **Video pipeline lane:** queue-based worker; interactive Learning Hub-এর quota থেকে আলাদা budget।

একই সময়ে newsroom-এর ৬টি concurrent rewrite এবং Learning Hub chat call একে অপরের quota খেয়ে ফেলবে না—এই isolation gateway-এর queue ও token budget-এ enforce করতে হবে।

## Key pool ও circuit breaker

প্রতিটি key-এর জন্য নিচের state রাখা হবে:

```text
healthy -> degraded -> quarantined -> revalidated -> healthy
```

- `401/403`: key invalid বা revoked; সঙ্গে সঙ্গে quarantine।
- OpenRouter `402`: `openrouter_key_limit`, `openrouter_credits`, `openrouter_in_flight_budget` আলাদা করতে হবে; প্রথম দুইটি billing/credit action, শেষটি transient retry। [2]
- `429`: `Retry-After` ও reset header মানতে হবে; blind retry নয়। [1] [2]
- `5xx`/timeout: exponential backoff এবং provider failover।
- একই key-তে পরপর ৩টি failure হলে cooldown।
- ১০ মিনিটে সফল probe হলে আবার healthy।

কোনো 401-এর পর অন্য key-তে অনন্তভাবে retry করা যাবে না। এতে invalid credential loop ও provider abuse হতে পারে।

## Family-member consent ও credential governance

পরিবারের সদস্যদের key যুক্ত করা technically সম্ভব, কিন্তু এটি কেবল তখনই করা উচিত যখন:

1. key-র account holder স্পষ্টভাবে Banglar Voice SaaS-এ ব্যবহারের অনুমতি দিয়েছেন;
2. provider-এর terms, organization policy এবং billing owner তা অনুমোদন করে;
3. account holder জানেন কোন ধরনের কাজ হবে—chat, rewrite, TTS, video, আনুমানিক volume;
4. maximum monthly spend, model allowlist এবং automatic disable threshold লিখিতভাবে নির্ধারিত থাকে;
5. credential holder যে কোনো সময় revoke করতে পারেন;
6. keyটি chat message বা source code-এ না পাঠিয়ে admin vault form-এ একবার প্রবেশ করানো হয়;
7. audit log-এ key-এর নাম, owner label, consent timestamp, test result ও rotation date থাকে—কিন্তু plaintext key থাকে না।

পরিবারের সদস্যরা নিজেদের account-এ আলাদা key বানালেই সেটি quota bypass হিসেবে ধরে নেওয়া যাবে না। একই Groq organization-এর limits organization-level [1]। OpenRouter-এ account balance ও in-flight budget account-level [2]। সত্যিকারের redundancy চাইলে আলাদা legal/billing organization এবং provider-অনুমোদিত ব্যবহার লাগবে।

**প্রস্তাবিত সংখ্যা:** প্রথমে ১টি OpenRouter এবং ১টি Groq account। এরপর প্রয়োজন প্রমাণিত হলে ১টি independent OpenRouter backup এবং ১টি independent Groq backup। চারটির বেশি paid provider account যোগ করার আগে usage metrics, failure rate এবং monthly cost review করা উচিত।

## SaaS product model

প্ল্যাটফর্মকে SaaS করার জন্য `tenant_id`-ভিত্তিক isolation লাগবে। Global Banglar Voice newsroom এবং external tenant-এর key কখনো একই policy-তে মেশানো যাবে না। প্রতিটি tenant-এর জন্য:

- plan ও monthly token budget;
- request quota ও concurrency quota;
- enabled features;
- own article/source data boundary;
- optional BYOK provider mapping;
- audit log ও retention policy;
- billing usage meter;
- admin/member roles;
- rate-limit bucket।

Banglar Voice-এর নিজস্ব global key pool আলাদা থাকবে। External tenant চাইলে নিজের OpenRouter/Groq key ব্যবহার করবে; তখন সেই tenant-এর usage, errors এবং revocation অন্য tenant-কে প্রভাবিত করবে না।

## বাস্তবায়নের ধাপ

### ধাপ ১: এখনই

- OpenRouter ও Groq key-কে Vercel direct environment path থেকে সরিয়ে Vault source of truth করা।
- `getApiKey` থেকে plaintext key response বন্ধ করা। Admin UI-তে শুধু masked fingerprint, provider, status ও last-tested দেখানো।
- invalid OpenRouter key quarantine করা এবং নতুন key শুধু provider dashboard-এর মাধ্যমে তৈরি করা।
- Learning Hub-এ provider status, degraded reason এবং request correlation ID log করা; secret বা prompt PII নয়।
- একই provider-এর বহু key রাখার জন্য `api_vault`-এর ওপর নতুন pool metadata table করা; পুরোনো unique constraint ভেঙে সরাসরি migration না করে backward-compatible table ব্যবহার করা।

### ধাপ ২: Gateway

- `ai-gateway` Supabase Edge Function তৈরি করা।
- `ai_provider_keys`, `ai_key_leases`, `ai_usage_events` ও `ai_circuit_breakers` tables তৈরি করা।
- `service_role` ছাড়া key metadata write/decrypt বন্ধ রাখা।
- Learning Hub এবং newsroom-কে gateway client-এ migrate করা।
- gateway integration test-এ 200, 401, 402, 429, 5xx, timeout ও malformed JSON case রাখা।

### ধাপ ৩: Open-source resilience

- Ubuntu VPS-এ Ollama/vLLM এবং Piper/Coqui deploy করা।
- private HTTPS endpoint ও gateway-only authentication করা।
- local model-এর output quality benchmark তৈরি করা: Bengali ratio, factual consistency, source attribution, headline quality, hallucination rate।
- benchmark pass না করা পর্যন্ত local model দিয়ে সরাসরি auto-publish নয়।

### ধাপ ৪: SaaS controls

- tenant-aware quota ও usage metering।
- plan-based limits।
- admin consent/revocation workflow।
- monthly provider cost dashboard।
- incident alert: সব provider unavailable, key invalid, quota threshold, queue age এবং publish gap।

## যেসব কাজ এখনই করা উচিত নয়

- পরিবারের বহু key একই Vercel environment-এ রাখা।
- browser/mobile app-এ key পাঠানো।
- `getApiKey` দিয়ে admin browser-এ plaintext key ফেরত দেওয়া।
- একই account-এর key দিয়ে quota bypass আশা করা।
- invalid key-তে বারবার retry করা।
- credit outage-এ raw RSS text public publish করা।
- Ollama-কে Vercel serverless function-এর ভেতর চালানোর চেষ্টা করা।

## বর্তমান বাস্তব অবস্থা

বর্তমান codebase-এ Supabase Vault ও API-key admin foundation আছে, কিন্তু website route এবং worker এখনও direct environment provider path ব্যবহার করে। তাই architecture-এর প্রথম production fix হলো **single AI Gateway এবং single source of truth**। OpenRouter variable উপস্থিত থাকলেও live Learning Hub degraded এবং newsroom-এ invalid-key evidence আছে; নতুন valid provider credential ছাড়া AI chat বা নতুন rewrite publish-কে functioning বলা যাবে না।

এই architecture-এর ভিত্তি স্থাপন করা যায় key না জেনেও। কিন্তু কোনো পরিবারের সদস্যের credential যুক্ত করতে হলে chat-এ key পাঠানো যাবে না; account holder-এর সম্মতিতে secure admin form/connector flow ব্যবহার করতে হবে।

## References

[1]: https://console.groq.com/docs/rate-limits "Groq Rate Limits"

[2]: https://openrouter.ai/docs/api_reference/limits "OpenRouter API Credit and Rate Limits"

[3]: https://supabase.com/docs/guides/database/vault "Supabase Vault"
