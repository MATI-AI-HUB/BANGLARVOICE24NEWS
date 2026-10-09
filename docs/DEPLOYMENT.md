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

### Frontend — Vercel (সঠিক কনফিগারেশন)

**রিপোজিটরি:** `github.com/MATI-AI-HUB/automation-king-` (monorepo — frontend একটি subfolder)

Vercel-এ import করার সময় **এই সেটিংস** ব্যবহার করো (Vercel ডিপ্লয় ত্রুটির ৯০% কারণ এখানে ভুল):

| সেটিং | মান |
|---|---|
| **Root Directory** | `frontend` ⚠️ (সবচেয়ে গুরুত্বপূর্ণ — monorepo root নয়) |
| **Framework Preset** | Next.js (auto-detect) |
| **Node.js Version** | `22.x` (`.nvmrc` = `22` — Vercel auto-read করে) |
| **Build Command** | `npm run build` (`frontend/vercel.json`) |
| **Install Command** | `npm install --legacy-peer-deps` (`frontend/vercel.json`) |
| **Output Directory** | Next.js default (`.next` — manually override করবেন না) |
| **Include outside of Root** | **ON** ⭐ (monorepo-তে প্রয়োজন — root-এর .vercelignore/ফাইল পড়তে) |
| **Skip deployments** | OFF |
| **Ignored Build Step** | Automatic |

**Environment Variables** (Project → Settings → Environment Variables → Production/Preview):

```
NEXT_PUBLIC_API_URL=https://<আপনার backend URL>   # PocketBase/Render — trailing slash নেই
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

> **নোট:** `frontend/vercel.json`-এ `installCommand` (`npm install --legacy-peer-deps`) ও `buildCommand` সেট আছে। Root Directory = `frontend` রাখুন; Next.js output Vercel নিজেই হ্যান্ডেল করে।

**Vercel ডিপ্লয় ত্রুটি হলে চেক করো:**
1. Root Directory = `frontend` কিনা (সবচেয়ে সাধারণ ভুল — root-এ import করলে `frontend/package.json` পাওয়া যায় না)
2. Node 22 (`.nvmrc`) — Vercel auto-detect করে
3. `npm install --legacy-peer-deps` — vitest/vite peer conflict এড়ায়
4. Env vars সেট আছে কিনা (build-এ `NEXT_PUBLIC_*` দরকার)
5. Build log-এ "Collecting page data" → "Generating static pages" → success দেখো

- **Backend (PocketBase Go):** `cd backend && go build -o pocketbase . && ./pocketbase serve` (systemd/PM2)।
- **Worker (cron):** `cd worker && npm run build && node dist/index.js` (PM2/`systemd` timer)।
- **Supabase functions:** `supabase functions deploy ai-process-report getApiKey paywall two-factor`।

## ৬. রোলব্যাক

- Frontend: Vercel-এ আগের deploy-এ rollback।
- Backend/Worker: git revert + redeploy।

## Env (কখনো commit করবেন না)

`.env.example`-এ সব key-এর নাম আছে। প্রকৃত key সার্ভারে `env`/secret manager-এ রাখুন:
`NEWSROOM_INGEST_KEY`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `ELEVENLABS_API_KEY`, `PEXELS_API_KEY` ইত্যাদি।