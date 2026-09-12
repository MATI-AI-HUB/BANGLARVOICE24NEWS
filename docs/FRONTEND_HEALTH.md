# Frontend Health & Fixes Tracker

**Last audit:** 2026-09-12 (Next.js 15.5.25, commit `06eae9a`)
**Audit method:** curl HTTP status + size check on 11 routes, grep duplicates, structure inspection

---

## Verified Safe (no fixes needed)

1. `components/learning-hub.tsx` — no duplicates; renders only in `app/layout.tsx:62`
2. `components/breaking-marquee.tsx` — no duplicates; renders only in `components/Header.tsx:196`
3. `app/(legal)/layout.tsx` — passthrough layout; `/about`, `/privacy` resolve
4. `app/layout.tsx` — correct order: Font → Header → main → Footer → CookieBanner → LearningHub
5. `middleware.ts` — matcher only `/admin/:path*`, safe
6. `components/related-articles.tsx` — Server Component (no `'use client'`) — API call server-side, safe
7. `lib/supabase/client.ts` — lazy init + try/catch, build-safe
8. `app/epaper/page.tsx` — uses `EPaperViewer` wrapper for `ssr:false`, build-safe
9. `app/login/page.tsx` — `useSearchParams` wrapped in Suspense, build-safe
10. `app/page.tsx` — restored from `.bak`, 151 KB render, full homepage live

**Build:** 23/23 static pages.

**Runtime (dev server):**

| Route | Status | Size |
|---|---|---|
| `/` | 200 | 151,356 B |
| `/epaper` | 200 | 67,247 B |
| `/login` | 200 | 49,734 B |
| `/checkout` | 200 | 50,113 B |
| `/pricing` | 200 | 55,813 B |
| `/download` | 200 | 100,725 B |
| `/admin/analytics` | 307 | expected |
| `/about` | 200 | 77,051 B |
| `/privacy` | 200 | 123,812 B |
| `/contact` | 200 | 74,385 B |

---

## Pending Fixes

### Fix #1 — Article 404 when backend offline [HIGH]

**File:** `app/article/[slug]/page.tsx`
**Problem:** `api.article(slug)` fails → `notFound()` → 404, even for mock articles linked from homepage.
**Impact:** Every article click from homepage → 404.
**Fix:** Add `mockFeedItems` fallback before `notFound()`.
**Status:** pending

### Fix #2 — Middleware env-var assertion [MEDIUM]

**File:** `middleware.ts`
**Problem:** `process.env.NEXT_PUBLIC_SUPABASE_URL!` — non-null assertion. If env missing on Vercel, `/admin/*` returns 500.
**Fix:** Guard at top: if env missing, skip auth gracefully.
**Status:** pending

### Fix #3 — Duplicate mock slugs [LOW]

**File:** `lib/mockData.ts`
**Problem:** `mockFeedItems` has duplicate slugs (`election-commission-new-guideline`, `fuel-price-new-rate`).
**Fix:** Deduplicate array.
**Status:** pending

### Fix #4 — img tag warning [LOW]

**File:** `app/article/[slug]/page.tsx:107`
**Problem:** ESLint warning, hurts LCP.
**Fix:** Use `next/image` Image component.
**Status:** pending
