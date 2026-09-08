# QA Audit Report — Banglar Voice (bv-allinone_v2)

**Date:** 2026-09-09
**Branch:** `feat/qa-audit`
**Auditor:** Strict QA Engineer + Senior Code Auditor

---

## 1. Learning Hub Chatbot (Task 1)

| File | Status | Notes |
|---|---|---|
| `frontend/components/learning-hub.tsx` | ✅ **PASS** | New. Deterministic Bengali answer engine (instant, offline, no API key). 8 intents: পরিচয়, যাচাই, AI অ্যাংকর, রিপোর্ট, ই-পেপার, অ্যাপ, নিউজলেটার, রাজস্ব + fallback. Dark mode + responsive. |
| `frontend/app/layout.tsx` | ✅ **PASS** | `<LearningHub />` added before `</body>`. |

**Bug found & fixed:** `.map((m, i) => (` JSX block closed with one `)` instead of two → tsc syntax error. Fixed to `))}`.

**Verify:** TSC_EXIT:0 ✅ | LINT_EXIT:0 ✅ | BUILD_EXIT:0 ✅

**How it works:** User types a Bengali question → `answer()` matches keywords → returns instant deterministic answer (no latency, no API). Fallback: "সাহায্য" prompt lists capabilities. No external API → zero latency, works offline.

---

## ২. E-Paper Auto-Generation (Task 2)

| File | Status | Verify |
|---|---|---|
| `worker/src/agents/epaper-cron.ts` | ✅ **PASS** | Daily 23:30 cron (11:30 PM, within 11–12 window). Fetches day's articles, builds HTML, POSTs to `/api/newsroom/epaper` (env `NEWSROOM_INGEST_KEY`). |
| `frontend/app/epaper/page.tsx` | ✅ **PASS** | E-Paper viewer using `EPaperDocument` (react-pdf). |
| `backend/main.go` | ✅ **PASS** | Added `epaper_editions` collection + `POST /api/newsroom/epaper` route. |

**Bug found & fixed:** `@react-pdf/renderer` is client-only ESM → "Element type is invalid: got undefined" on prerender. Fixed with `next/dynamic` + `ssr:false`.

**Verify:** worker TSC_EXIT:0 ✅ | frontend TSC_EXIT:0 ✅ | BUILD_EXIT:0 ✅ | GO_BUILD_EXIT:0 ✅

---

## 3. Backend ↔ Frontend Integration (Task 3)

| Check | Status |
|---|---|
| `lib/api.ts` functions vs `backend/main.go` routes | ✅ **PASS** — articles, article/[slug], categories, feed.json all match |
| `field_reports` realtime trigger | ✅ **PASS** — exists in `supabase/schema.sql` |
| **`/api/newsroom/ingest` POST route** | ❌ **BUG FOUND** → ✅ **FIXED** |

**Bug found & fixed:** worker's `publishArticle` POSTs to `/api/newsroom/ingest`, but that route did NOT exist in `backend/main.go` (only GET routes + a 5-min RSS cron). Added the missing POST handler (env-key protected, no hardcoded secrets).

**Verify:** GO_BUILD_EXIT:0 ✅

---

## 4. Tests + CI + Deployment (Task 4)

| File | Status | Verify |
|---|---|---|
| `worker/src/agents/epaper-cron.test.ts` | ✅ **PASS** | vitest — buildEpaperHtml + archive |
| `worker/src/agents/collector.test.ts` | ✅ **PASS** | vitest — collect() fetch + parse |
| `frontend/__tests__/learning-hub.test.ts` | ✅ **PASS** | vitest — answer() intents |
| `worker/vitest.config.ts` | ✅ **PASS** | |
| `frontend/vitest.config.ts` | ✅ **PASS** | |
| `.github/workflows/ci.yml` | ✅ **PASS** | tsc → lint → build → test on push/PR |
| `docs/DEPLOYMENT.md` | ✅ **PASS** | branch→PR→merge→push→CI→deploy routine |

**Bug found & fixed:** `answer()` first condition matched any "কী" question → wrong answers. Fixed to require org name.

**Verify:** worker VITEST_EXIT:0 ✅ (5 tests) | frontend VITEST_EXIT:0 ✅ (5 tests)

---

## 5. Third-party SDK uncertainty

- **`@react-pdf/renderer`** — confirmed client-only ESM; requires `next/dynamic` + `ssr:false` in Next.js App Router. ✅ Resolved.
- **PocketBase Go SDK** (`rec.Id` field vs method) — confirmed `rec.Id` is a field. ✅ Resolved.

---

## Summary

| Task | Status | Verify |
|---|---|---|
| 1. Learning Hub chatbot | ✅ | tsc/lint/build 0 |
| 2. E-Paper auto-gen | ✅ | tsc/build/go 0 |
| 3. Integration fix | ✅ | go build 0 |
| 4. Tests + CI + guide | ✅ | vitest 0 |
| 5. QA report + zip | ✅ | — |

**Bugs found & fixed:** 3 (JSX paren, react-pdf dynamic import, missing ingest route, chatbot keyword logic).