# Deployment Guide — Banglar Voice

এই গাইডটি প্রতিটি ফিচার ব্রাঞ্চ → main → GitHub → CI → deploy-এর নিয়মিত রুটিন বর্ণনা করে।

## ১. ফিচার ব্রাঞ্চে কাজ

```bash
git checkout -b feat/<feature-name>   # e.g. feat/learning-hub
# ... কোড লিখুন ...
```

**নিয়ম:** main-এ সরাসরি push নয়। প্রতিটি ফিচার আলাদা ব্রাঞ্চে।

## ২. লোকাল verify (প্রতিটি ফিচার শেষে)

```bash
# Frontend
cd frontend
npx tsc --noEmit          # TSC_EXIT:0
npm run lint              # LINT_EXIT:0
npm run build             # BUILD_EXIT:0

# Worker
cd ../worker
npx tsc --noEmit          # TSC_EXIT:0
npx vitest run            # VITEST_EXIT:0

# Backend
cd ../backend
go build ./...            # GO_BUILD_EXIT:0
```

## ৩. Commit + push

```bash
git add -A
git commit -m "feat: <বর্ণনা>"
git push -u origin feat/<feature-name>
```

## ৪. Pull Request → main merge

GitHub-এ PR খুলুন (`feat/<feature-name>` → `main`)। CI স্বয়ংক্রিয়ভাবে চলে
(`.github/workflows/ci.yml`): tsc → lint → build → test। সব সবুজ হলে merge করুন।

```bash
git checkout main
git pull origin main
git merge feat/<feature-name>
git push origin main
```

## ৫. Deploy

- **Frontend (Vercel/Netlify):** main-এ push হলে auto-deploy (CI-এর build আর্টিফ্যাক্ট)।
- **Backend (PocketBase Go):** `cd backend && go build -o pocketbase . && ./pocketbase serve` (systemd/PM2)।
- **Worker (cron):** `cd worker && npm run build && node dist/index.js` (PM2/`systemd` timer)।
- **Supabase functions:** `supabase functions deploy ai-process-report getApiKey paywall two-factor`।

## ৬. রোলব্যাক

- Frontend: Vercel-এ আগের deploy-এ rollback।
- Backend/Worker: git revert + redeploy।

## Env (কখনো commit করবেন না)

`.env.example`-এ সব key-এর নাম আছে। প্রকৃত key সার্ভারে `env`/secret manager-এ রাখুন:
`NEWSROOM_INGEST_KEY`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `ELEVENLABS_API_KEY`, `PEXELS_API_KEY` ইত্যাদি।