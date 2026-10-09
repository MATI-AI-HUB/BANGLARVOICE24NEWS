# Banglar Voice runbook (bn + en)

## বাংলা

### লাইভ চেক
- হেলথ: `GET /api/health` — শুধু স্ট্যাটাস বুলিয়ান, `published` কাউন্ট, `last_success_at`। সিক্রেট নেই।
- ফিড: `GET /api/public/feed.json` — প্রকাশিত আইটেম, সোর্স নাম, ছবি ক্রেডিট।
- ইনজেস্ট: GitHub Action `News ingest` প্রতি ১৫ মিনিট; কনকারেন্সি গ্রুপ `news-ingest` বাতিল করে না।

### ডিপ্লয় আটকে গেলে
1. Vercel Hobby: Usage / Billing। `Payment Required` হলে রিট্রাই লুপ নয়।
2. রিসেট: বেশিরভাগ Hobby সীমা ~৩০ দিন। ওয়েব অ্যানালিটিক্স ~৭ দিন।
3. অপেক্ষা, Pro আপগ্রেড, অথবা Cloudflare Pages / Coolify-এ স্ট্যাটিক+API আলাদা। সুপারিশ: **কোটা শেষ হলে Pro** (কমার্শিয়াল নিউজ + কাস্টম ডোমেইন); ব্যক্তিগত নন-কমার্শিয়াল হলে অপেক্ষা।
4. `frontend/scripts/vercel-ignore.sh` — `frontend/` না বদলালে বিল্ড স্কিপ।

### সিক্রেট
- `NEWSROOM_INGEST_KEY`: GitHub secret + Vercel env একই মান। ভুল কী = 401, আনসেট = 500।
- `SUPABASE_SERVICE_ROLE_KEY`: শুধু ওয়ার্কার / সার্ভার। APK/ফ্রন্টএন্ডে নিষেধ।
- পুরনো সেশনের টোকেন ব্যবহার করবেন না; রোটেট করুন।

### ইনজেস্ট ব্যর্থ
- `CHAT_AI_KEY` না থাকলে আর্টিকেল `fallback=true` এবং পাবলিশ হয় না।
- ছবি না থাকলে মিডিয়া স্কিপ (`missing_image`)।
- প্রাইভেট IP ফিড SSRF গার্ডে ব্লক।

### ব্যাকআপ / মনিটর
- DB: GitHub `backup-automation.yml` (রবি ০২:০০ UTC পরিকল্পিত)।
- আপটাইম: Uptime Kuma বা সমতুল্য দিয়ে `/api/health`।
- এরর: Sentry DSN সেট থাকলে; না থাকলে GlitchTip সেলফ-হোস্ট বিবেচনা।
- অ্যানালিটিক্স: Plausible/Umami; Hobby কমার্শিয়াল অ্যাড নয়।

## English

Health JSON booleans + counts only. Ingest writes Supabase directly when `SUPABASE_URL` + service role exist, so a Vercel deploy is not required for content. Custom domain `banglarvoice24news.com` must map to a live Vercel (or other) deployment before Reader/TV APKs work. Production SQL in `supabase/migrations/20260929_platform_contract.sql` is **not applied** until you confirm.

Identity for new commits: local `user.email=YOUR_EMAIL`, `user.name=YOUR_NAME`. Push needs an owner-account PAT in the environment; none is present in this session.

### Rollback
1. Git: `git revert <sha>` on `main` (no force-push). Worker-only revert skips Vercel via `frontend/scripts/vercel-ignore.sh`.
2. Vercel: dashboard Instant Rollback to the last healthy frontend deploy.
3. Supabase: do not drop enum values. Reverse policies/triggers as noted in `supabase/migrations/20260929_platform_contract.sql` header. Confirm before any production SQL.

### Key rotation (confirm before applying)
1. Generate a new 32+ byte `NEWSROOM_INGEST_KEY`.
2. Set the same value in GitHub Actions secrets and Vercel env (frontend ingest HTTP fallback).
3. Redeploy worker job / wait for next 15-minute ingest. Old key stops working immediately.
4. Rotate leaked anon JWT in the Supabase dashboard; rebuild Flutter apps with `--dart-define`. Never put `service_role` in APK or Next client bundles.

### Incident
| Symptom | First check | Action |
|---|---|---|
| `/api/health` 503 stale, published=0 | ingest logs, `CHAT_AI_KEY` presence | Do not publish fallback; fix chat key |
| 401 on ingest | key mismatch GitHub vs Vercel | Reset both to same new secret |
| 500 ingest_unconfigured | env missing or `change-me` | Set real key |
| Vercel 402 | Hobby quota | Stop retry; wait/upgrade |
| Domain DEPLOYMENT_NOT_FOUND | Vercel project mapping | Map `banglarvoice24news.com` after quota clear |
