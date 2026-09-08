# Banglar Voice — FILE MANIFEST
# প্রতিটি ফাইলের নাম + ফোল্ডার + কাজ

## Frontend (frontend/)
- `components/learning-hub.tsx` — Learning Hub চ্যাটবট (deterministic বাংলা উত্তর, offline, dark mode)
- `components/epaper/EPaperDocument.tsx` — ই-পেপার PDF renderer (react-pdf)
- `app/epaper/page.tsx` — ই-পেপার ভিউয়ার পেজ (dynamic import)
- `app/layout.tsx` — LearningHub যোগ করা হয়েছে
- `lib/api.ts` — ব্যাকএন্ড API client (articles, feed, live)
- `__tests__/learning-hub.test.ts` — চ্যাটবট unit test
- `vitest.config.ts` — vitest config

## Worker (worker/)
- `src/agents/epaper-cron.ts` — daily 23:30 ই-পেপার cron + archive
- `src/agents/collector.ts` — RSS collector
- `src/agents/rewriter.ts` — রিরাইটার
- `src/agents/orchestrator.ts` — publisher state machine
- `src/agents/supervisor.ts` — ai_score + Telegram
- `src/agents/epaper-cron.test.ts` — epaper unit test
- `src/agents/collector.test.ts` — collector unit test
- `vitest.config.ts` — vitest config

## Backend (backend/)
- `main.go` — PocketBase Go server; যোগ করা হয়েছে: `/api/newsroom/ingest` POST + `/api/newsroom/epaper` POST + `epaper_articles` collection

## CI / Docs
- `.github/workflows/ci.yml` — tsc→lint→build→test on push/PR
- `docs/DEPLOYMENT.md` — branch→PR→merge→push→CI→deploy রুটিন
- `docs/QA_AUDIT_REPORT.md` — QA অডিট রিপোর্ট