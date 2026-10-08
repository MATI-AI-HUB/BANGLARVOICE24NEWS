# Banglar Voice production automation audit

**Audit time:** 2026-10-08 (BDT)  
**Repository:** `MATI-AI-HUB/automation-king-`  
**Production site:** https://www.banglarvoice24news.com

## Executive finding

আগের implementation note অনুযায়ী সবকিছু production-এ সম্পূর্ণ সক্রিয়—এই দাবি বর্তমানে প্রমাণিত নয়। Code ও schema-এর বেশ কিছু অংশ প্রস্তুত, কিন্তু live production evidence অনুযায়ী AI rewrite, video automation এবং social publishing সম্পূর্ণ কার্যকর নয়।

## যা সংশোধন করা হয়েছে

- Daytime cron **প্রতি ১৫ মিনিটে** করা হয়েছে: `*/15 0-17 * * *` UTC = 06:00–24:00 BDT।
- Overnight cron **প্রতি ঘণ্টায়** রাখা হয়েছে: `0 18-23 * * *` UTC = 00:00–06:00 BDT।
- সংশোধনটি GitHub `main` branch-এ push হয়েছে: commit `06831c3`।
- Priority audit fields code-এ আছে: `priority_candidates_selected` এবং `priority_candidate_target_percent: 70`।
- Sensitive শব্দ priority pool থেকে বাদ দেওয়ার logic আছে।
- AI ব্যর্থ হলে raw RSS public publish না করে pending review/queue-তে রাখার behavior আছে।
- Supabase-এ `ai-gateway` এবং `newsroom-worker` Edge Function ACTIVE দেখা গেছে।

## Live evidence: যা এখনো কাজ করছে না

### AI Gateway

সর্বশেষ production pipeline run-এ:

- fetched: 156
- queued: 5
- published: 0
- pending review: 5
- error: `ai_rewrite_invalid_key`
- priority candidates selected: 5
- target: 70%

Supabase `api_vault`-এ বর্তমানে আছে:

- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `NEWSROOM_INGEST_KEY`

কিন্তু Gateway-এর enrollment-এর জন্য প্রয়োজনীয় service names নেই:

- `AI_GATEWAY_OPENROUTER_PRIMARY`
- `AI_GATEWAY_GROQ_BACKUP`

তাই `ai_gateway_key_state`-এ কোনো enrolled provider row নেই এবং live gateway routing provider পাচ্ছে না। Vault row থাকলেই যথেষ্ট নয়; key-এর **সঠিক নাম, valid provider key, active=true, production environment, এবং live probe success** আবশ্যক।

### Vercel / GitHub secret placement

Vercel production environment-এ provider secret names এখনও দেখা যাচ্ছে, যার মধ্যে `OPENROUTER_API_KEY` এবং `GROQ_API_KEY` রয়েছে। Code-এর video workflow-এও `GROQ_API_KEY` ও `OPENROUTER_API_KEY` GitHub Actions secret হিসেবে চাওয়া হচ্ছে। এটি “provider secret শুধুমাত্র Supabase Vault-এ” নীতির সঙ্গে সামঞ্জস্যপূর্ণ নয়।

Social route-এ এখনও সরাসরি Vercel environment পড়া হচ্ছে:

- `FACEBOOK_PAGE_TOKEN`
- `INSTAGRAM_ACCESS_TOKEN`
- `X_ACCESS_TOKEN`
- `LINKEDIN_ACCESS_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- সংশ্লিষ্ট account/page/channel identifiers

এগুলো Vault-backed server-side resolver-এ স্থানান্তর না করা পর্যন্ত social secret placement সম্পূর্ণ নিরাপদ বলা যাবে না।

### Social publishing

- `social_posts` production row count: 0
- Dispatch route আছে এবং Facebook/Instagram/X/LinkedIn/Telegram API calls-এর code আছে।
- Brand social-card route আছে এবং headline + article URL তৈরি করে।
- কিন্তু queue-তে কোনো pending row নেই এবং live publish evidence নেই।
- অতএব “প্রতিটি social media-তে auto-publish হচ্ছে”—এ দাবি এখন করা যাবে না।
- Platform API credential, permission, page/account ID, media publishing permission এবং successful test post প্রত্যেকটির live verification দরকার।

### Video

- Video workflow-এর schedule comment করে pause করা আছে; কেবল manual `workflow_dispatch` আছে।
- Workflow এখনও GitHub Actions secrets থেকে `SUPABASE_DB_URL`, provider keys, YouTube OAuth credentials এবং Pexels key চায়।
- `videos` production row count: 0।
- তাই প্রতি সংবাদে সংশ্লিষ্ট video auto-generate/upload হচ্ছে—এটি বর্তমানে সত্য নয়।

### E-paper

- Frontend route `/epaper` এবং public API routes দৃশ্যমান ও wired আছে।
- `epaper_editions`-এ 2টি row আছে; অর্থাৎ feature schema/UI উপস্থিত।
- Daily e-paper workflow 17:30 UTC = 23:30 BDT-এ চলে, রাত ১২টা–ভোর ৬টার প্রতি ঘণ্টার news-ingest schedule-এর অংশ নয়।
- তাই e-paper “প্রতিদিন স্বয়ংক্রিয়ভাবে সর্বশেষ verified news দিয়ে live তৈরি হচ্ছে”—এটি একটি সফল recent run দিয়ে আলাদা করে verify করতে হবে।

## Desired production secret contract

### Supabase Vault-এ থাকা উচিত

| Secret name | ব্যবহারের উদ্দেশ্য | ন্যূনতম criteria |
|---|---|---|
| `AI_GATEWAY_OPENROUTER_PRIMARY` | AI Gateway primary rewrite/classification | valid OpenRouter key; active; prod; live probe pass; priority 10 |
| `AI_GATEWAY_GROQ_BACKUP` | AI Gateway failover | valid Groq key; active; prod; live probe pass; priority 20 |
| Social Facebook token | Page feed publishing | Page access token; required publish permission; test post pass |
| Social Instagram token | Business media publishing | Business account ID; image publishing permission; public HTTPS image test pass |
| Social X token | X post publishing | write-enabled user token; 280-character/link test pass |
| Social LinkedIn token | Organization article publishing | organization ID; `w_member_social`/organization permission; test pass |
| Social Telegram bot token | Channel photo publishing | bot admin permission; channel ID; sendPhoto test pass |
| Media/Pexels key | Relevant image fallback | provider quota and license validation pass |
| YouTube OAuth credentials | Video upload | refresh token valid; channel ownership; unlisted test upload pass before public mode |

### Vercel-এ রাখা যেতে পারে

শুধু application runtime-এর non-provider configuration এবং Supabase connection configuration রাখা উচিত, যেমন Supabase URL, public key এবং server-side Supabase service-role credential। Provider keys সেখানে রাখা উচিত নয়। `CRON_SECRET`/`NEWSROOM_INGEST_KEY` orchestration authentication হিসেবে থাকলে সেটির জন্য আলাদা rotation policy, least privilege এবং audit দরকার।

### GitHub Actions-এ রাখা উচিত নয়

Provider API keys, social tokens, YouTube refresh token এবং database URL-এর raw values workflow env-এ pass করা উচিত নয়। Workflow ideally একটি authenticated Supabase worker/Edge Function trigger করবে; provider secret worker Vault থেকে নেবে।

## Auto-publish policy acceptance criteria

একটি article public publish হওয়ার আগে production-এ সবগুলো true হতে হবে:

1. RSS/source fetch সফল।
2. Bengali rewrite validation pass।
3. Source attribution ও canonical URL আছে।
4. Relevant image/credit/alt validation pass।
5. AI sensitivity detection low-risk।
6. Duplicate detection pass।
7. Publish score threshold pass।
8. Editorial safety gate pass।
9. Workflow state `approved` এবং `auto_publish_allowed=true`।
10. AI Gateway provider success audit row লেখা হয়েছে।
11. Gateway failure হলে publish=0 এবং queue/pending_review বৃদ্ধি পাবে।

**70% policy** হলো candidate selection preference, unconditional publication guarantee নয়। প্রতিটি batch-এর audit details-এ target ও actual selection দুটোই রাখতে হবে।

## Vercel deployment failure evidence

সর্বশেষ দুইটি production deployment—commit `06831c3` এবং `99a0174`—দুটিই `BLOCKED` হয়েছে। Vercel deployment detail-এ build/compile error নেই; error link হলো account configuration troubleshooting। একই সময়ে GitHub Authority check-এ commit author `3.31898859e+08+MATI-AI-HUB@users.noreply.github.com`-কে unauthorized বলা হয়েছে, যেখানে workflow `matiailearninghub@gmail.com` অনুমোদিত ধরে। ফলে deployment block-এর একটি সরাসরি configuration cause হলো commit identity বনাম authorized identity mismatch।

আরও একটি গুরুত্বপূর্ণ পার্থক্য: এই `BLOCKED` status AI provider key বা news pipeline runtime failure নয়; provider key failure আলাদা Supabase runtime সমস্যা (`ai_rewrite_invalid_key`)।

## Final status

- Schedule: **সংশোধিত এবং pushed**
- Priority policy: **code-level উপস্থিত; live effect AI key না থাকায় অসম্পূর্ণ**
- AI Gateway: **deployed কিন্তু provider enrollment অনুপস্থিত**
- News auto-publish: **বর্তমানে ০টি live publish evidence**
- Social auto-publish: **code আছে, production queue/publish evidence নেই**
- Video auto-publish: **paused; ০টি production video row**
- E-paper frontend: **দৃশ্যমান ও wired; automated freshness আলাদা live run দিয়ে যাচাই বাকি**
- Vercel/GitHub provider secret removal: **এখনও সম্পূর্ণ হয়নি**

## Required next action

Supabase Vault-এ valid keys **সঠিক নতুন names**-এ যোগ/rotate করে live probe pass করাতে হবে। এরপর provider rows-এর `state`, `last_probe_at`, `last_success_at` যাচাই করে একটি manual production ingest চালাতে হবে। Successful ingest-এর পরে social queue, test publication এবং video/e-paper run আলাদা করে যাচাই না করা পর্যন্ত পূর্ণ production sign-off দেওয়া যাবে না।
