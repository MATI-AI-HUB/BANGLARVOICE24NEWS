# Banglar Voice — Post-Deployment Production Readiness Report

**তারিখ:** ১৫ অক্টোবর ২০২৬  
**Repository:** `MATI-AI-HUB/automation-king-`  
**Verified commit:** `7e476a245e5cfa66369ac1d23199e462134ad7cd`  
**Supabase project:** `fqqdpngmftoddffvdukn`  
**Vercel project:** `automation-king-lcb2`

## ১. Executive summary

Production hardening-এর নির্দিষ্ট, নিরাপদ এবং reversible অংশগুলো বাস্তবায়ন করা হয়েছে। Supabase migration এবং `getApiKey` Edge Function production-এ সফলভাবে deploy হয়েছে। Public health, public e-paper reader এবং unauthenticated cron/security smoke test সফল।

তবে নতুন GitHub commit-এর Vercel production deployment build শুরু হওয়ার আগেই `BLOCKED` হয়েছে; Vercel-এর reported reason `account-configuration`। ফলে নতুন commit-টি এখনো Vercel traffic serve করছে না। আগের `READY` deployment production traffic serve করছে এবং live endpoint healthy। এটি **সম্পূর্ণ নতুন commit production-ready deploy হয়েছে**—এমন দাবি করার অনুমতি দেয় না।

## ২. বাস্তবায়িত পরিবর্তন

### ২.১ Secret boundary hardening

- `getApiKey` Edge Function-এ Supabase platform JWT enforcement সক্রিয় রাখা হয়েছে (`verify_jwt=true`)।
- Handler-level role authorization (`admin` / `chief_editor`) retained হয়েছে।
- Function এখন plaintext API key ফেরত দেয় না।
- Response এখন কেবল `service_name`, `environment`, `key_available`, `usage_percent`, `last_tested` metadata দেয়।
- Provider key decryption server-side AI gateway/worker path-এর মধ্যে সীমাবদ্ধ রাখা হয়েছে।
- Production version: **`getApiKey` v5, ACTIVE, verify_jwt=true**।

### ২.২ Social schema contract

- `social_posts.platform` constraint এখন registry-র TikTok value গ্রহণ করে।
- TikTok dispatch এখনো readiness registry-তে fail-closed এবং disabled; কেবল schema mismatch দূর করা হয়েছে।
- কোনো social row delete বা bulk replay করা হয়নি।

### ২.৩ Article quality benchmark

`/scripts/quality-benchmark.mjs` যোগ করা হয়েছে। এটি credential ও production database ছাড়াই redacted fixture-এর উপর deterministic checks চালায়:

| Metric | Result |
|---|---:|
| Bengali quality | 4/4 (100%) |
| Number preservation | 3/4 (75%) |
| Source relevance | 3/4 (75%) |
| Structured-output validity | 3/4 (75%) |
| Fixture expectation checks | 4/4 passed |

এই ফলাফল model quality-এর চূড়ান্ত প্রমাণ নয়; এটি formal benchmark suite-এর reproducible baseline। বিশেষভাবে number drift, unrelated output এবং invalid JSON fixture শনাক্ত হয়েছে।

## ৩. Production deployment evidence

### ৩.১ Supabase

- Migration `social_platform_contract` সফলভাবে applied হয়েছে।
- Production migration history-তে version `20261015135836` উপস্থিত।
- `getApiKey` function production version 5 ACTIVE।
- Unauthenticated smoke test:

```text
HTTP/2 401
sb-error-code: UNAUTHORIZED_NO_AUTH_HEADER
```

এটি edge-level JWT gate কার্যকর থাকার প্রমাণ। কোনো secret response পাওয়া যায়নি।

### ৩.২ Vercel

নতুন commit-এর deployment:

- Deployment ID: `dpl_2EqcFtooa4kAnaTcp7PXJySmq5JF`
- Commit: `7e476a2`
- State: **BLOCKED**
- Reason link/category: **account-configuration**
- Build events: শুরু হওয়ার আগেই blocked; build log পাওয়া যায়নি।

শেষ কার্যকর Vercel deployment:

- Commit: `dcde7f8`
- State: **READY**
- এটি বর্তমানে production traffic serve করছে।

### ৩.৩ Live endpoint smoke tests

| Endpoint | Result | Evidence |
|---|---:|---|
| `https://www.banglarvoice24news.com/api/health` | 200 | `status=ok`, `stale=false`, `published=326` |
| `https://www.banglarvoice24news.com/api/public/epaper/latest` | 200 | Non-empty edition, date `2026-10-14` |
| `https://www.banglarvoice24news.com/api/cron/epaper` without secret | 401 | `{"error":"unauthorized"}` |
| `https://fqqdpngmftoddffvdukn.supabase.co/functions/v1/getApiKey` without JWT | 401 | `UNAUTHORIZED_NO_AUTH_HEADER` |

## ৪. বর্তমান production data evidence

Read-only bounded query-এর ফলাফল:

| Area | Rows | সর্বশেষ update |
|---|---:|---|
| `epaper_editions` | 9 | 2026-10-14 17:30 UTC |
| `videos` | 0 | নেই |
| `social_posts` | 964 | 2026-10-15 13:45 UTC |
| `ai_gateway_usage_events` | 1,328 | 2026-10-15 14:00 UTC |

এর অর্থ:

- E-paper public reader কাজ করছে এবং non-empty edition আছে।
- YouTube content inventory এখনো শূন্য; player code থাকা সত্ত্বেও published video content readiness প্রমাণিত নয়।
- Social ledger আছে; backlog reconciliation এখনো আলাদা operational কাজ।
- AI gateway telemetry সক্রিয়।

## ৫. Validation results

- Frontend TypeScript check: PASS
- Frontend lint: PASS, বিদ্যমান `<img>` performance warnings আছে
- Frontend production build: PASS
- Frontend tests: **60 passed**
- Worker TypeScript check: PASS
- Worker tests: **59 passed**
- Supabase Edge Functions Deno check: PASS
- Quality benchmark: PASS, 4/4 fixture expectation checks
- Git working tree after commit: clean

## ৬. এখনো অসম্পূর্ণ / blocked বিষয়

### Vercel account configuration

এটি code failure নয়; Vercel account/project configuration-এর কারণে deployment blocked। Vercel dashboard-এ project/account configuration resolve না হওয়া পর্যন্ত commit `7e476a2` production traffic পাবে না। Resolve করার পর নতুন deployment তৈরি করে `READY` state এবং live commit SHA যাচাই করতে হবে।

### E-paper production execution

Public reader-এ ১৪ অক্টোবরের non-empty edition আছে। কিন্তু নতুন generator commit-এর পর fresh e-paper generation সফল হয়েছে—এমন evidence নেই, কারণ নতুন Vercel deployment blocked এবং GitHub Actions workflow-এর আগের run runner শুরু হওয়ার আগেই failed হয়েছিল। Secret সহ manual authenticated invocation না করে production write trigger করা হয়নি।

### Article quality governance

Benchmark baseline যোগ হয়েছে, কিন্তু provider/model comparative benchmark, factual claim scoring, entity preservation, Bengali spelling এবং human-labeled gold set এখনো প্রয়োজন। Auto-publish policy পরিবর্তন করা হয়নি।

### Social automation

Facebook production evidence আছে, কিন্তু pending/overdue ledger-এর সম্পূর্ণ reconciliation প্রমাণিত নয়। Instagram, LinkedIn, X, TikTok এবং YouTube-এর credential/name/content readiness আলাদাভাবে সম্পন্ন করতে হবে। কোনো bulk publish বা delete করা হয়নি।

### YouTube

`videos` table-এ 0 rows। শুধুমাত্র verified channel uploads synchronize করে provenance, thumbnail, duration, status এবং embed URL validate করতে হবে। Placeholder video seed করা হয়নি।

### Learning Hub persistent agent

বর্তমান Learning Hub response/gateway path সচল; persistent conversation state, approved tools, tool-result validation, bounded memory, retention policy এবং audit trace এখনো পূর্ণাঙ্গভাবে implement করা হয়নি।

## ৭. পরবর্তী নিরাপদ পদক্ষেপ

1. Vercel account/project configuration ঠিক করে commit `7e476a2` redeploy করুন; `READY` এবং live commit SHA যাচাই করুন।
2. Authenticated e-paper dry run চালিয়ে response, HTML length, page count, article count এবং public reader payload cross-check করুন।
3. Benchmark fixture-এ human-labeled expected outputs বাড়িয়ে provider/model comparative run চালান।
4. Social overdue rows-কে audit-preserving retry/skip state-এ reconcile করুন; delete বা blind replay নয়।
5. TikTok official Content Posting API scope, account identity, asset contract ও sandbox evidence ছাড়া enable করবেন না।
6. Verified YouTube channel inventory sync করে `videos` rows ও player smoke test করুন।
7. Plaintext secret-returning internal paths-ও gateway-only architecture-এ ধাপে ধাপে migrate করুন।

## Final status

**Rating: Partially production-hardened; not yet fully production-grade SaaS release.**

সফলভাবে সম্পন্ন: Supabase migration, JWT-protected metadata-only API-key boundary, schema contract alignment, deterministic quality baseline, type/test/build validation, live health/e-paper/security smoke tests।

অমীমাংসিত critical release gate: **Vercel account-configuration block**।

এই audit/deployment cycle-এ কোনো published article, API key value, secret, social row বা production setting ইচ্ছাকৃতভাবে delete করা হয়নি।