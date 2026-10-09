# Banglar Voice — AI Context

## Project
Bangladeshi news portal — Next.js 15 frontend + Supabase backend + AI news pipeline + Termux dev environment.
Live: https://www.banglarvoice24news.com
Repo: https://github.com/OWNER/REPO

## Critical environment facts
- Termux on Android (no /tmp writable — use $HOME or repo for scripts)
- Push to origin only (old-origin repo deleted)
- Vercel project: TBD (new account) — previous: hizlanews46-1285s-projects / banglarvoice-apps
- Vercel domain: www.banglarvoice24news.com
- Vercel auto-GitHub-integration works; `.github/workflows/vercel-deploy.yml` is BROKEN and redundant (ignore red X)

## i18n system (current state, as of 2026-09-19)
- Locale via cookie `bv_locale` (values: 'bn' | 'en'), NOT URL-based (yet)
- `lib/i18n.ts`: dictionary + `t(locale, key)` + `translateCategory(locale, bnLabel)`
- DB: articles has `title_bn`, `title_en`, `content_bn`, `content_en`, `category` (ASCII key like 'politics')
- 156/164 published articles have EN translations
- Done: Header, Footer, page.tsx, article/[slug], RelatedArticles, Breadcrumb — all locale-aware
- Not done: VideoHub, LiveBlog, AudioPlayerWidget narration

## Roadmap
1. ✅ DONE (web side) — VideoHub + LiveBlog + Audio locale (commits `bd56a7f`, `bc369fe`, `bb6c161`)
   - Remaining: mobile app (tv_app) locale — separate branch `fix/tv-app-listener`
2. ✅ DONE — `.github/workflows/vercel-deploy.yml` + `build_apks` disabled in `4bc028f`
3. ⏳ (next) Backfill 8 missing `_en` translations via `frontend/backfill-v5.js`
4. URL-based locale routing (`/bn/...`, `/en/...`) — SEO priority
5. hreflang + per-language sitemaps
6. Translation editorial workspace (AI draft + human review)
7. `article_translations` table — only if going 5+ languages
8. **AI Specialist Fact-Check Phase 3** — vision LLM, credibility weights, `article_verifications` table, admin dashboard

## Key commands
- Audit i18n coverage: `cd frontend && node scripts/audit-i18n-coverage.js`
- Smoke test DB: see docs/DB-SMOKE.md
- Deploy: push to main; Vercel auto-deploys

## Session startup (paste this at start of new chat)
"Read docs/AI-CONTEXT.md and check git log --oneline -10"

## Session log

### 2026-09-19
7 PRs merged: #1–#7.
Web i18n 70% complete. Mobile foundation ready.
Keystore verified not committed.
Disabled broken build_apks + vercel-deploy workflows.

### Known remaining web bugs
All 7 known bugs fixed as of 2026-09-19:
- ✅ Card meta, category chip, bias chip (commit `bd56a7f`)
- ✅ Live Blog, App banner (commit `bc369fe`)
- ✅ AudioPlayer, Breaking ticker (commit `bd56a7f`)

### 2026-09-19
- Closed all 7 known homepage/web i18n bugs (commits `bd56a7f`, `bc369fe`)
- homepages cards (LeadCard/ArticleCard/TrendingItem) fully locale-aware: timeAgo, biasBadge, read time, category chip
- AudioPlayer + BreakingMarquee now locale-aware, support `text_en` fallback
- LiveBlog: locale prop, `body_en` support, i18n heading/aria, locale-aware timeLabel
- App download banner (inline in `app/page.tsx`): i18n keys wired (`app_banner_title`, `app_banner_body`, `app_download_cta`)
- Added ~18 i18n keys × 2 locales (`bn` + `en`)
- Roadmap updated: items 1 (web) + 2 closed
- Next: backfill 8 missing `_en` (item 3), then URL-based locale routing (item 4)

### 2026-09-19 — detailed
- i18n fixes: 7/7 known bugs closed
- Commits: `bd56a7f` (cards+audio+ticker), `bc369fe` (liveblog+banner)
- Files touched: `components/hero-bento.tsx`, `audio-player.tsx`, `breaking-marquee.tsx`, `live-blog.tsx`, `Header.tsx`, `app/page.tsx`, `app/article/[slug]/page.tsx`, `lib/i18n.ts`
- All TypeScript clean, all builds clean

## AI Specialist Fact-Check System (new — 2026-09-20)

### Flow
Collect → Rewrite → Media → **Specialist Verify** → Editor → Supervisor → Publish

### 6 Section Specialists (`worker/src/agents/specialists/`)
- `politics.ts` — 2+ source rule, election/protest keywords
- `health.ts` — strictest weights (45% multi-source), medical-claim flags
- `sports.ts` — official board/federation sources
- `economics.ts` — BBS/IMF/WB data requirement
- `international.ts` — geopolitical 2-source rule
- `national.ts` — local govt / disaster authority sources

### 6 Checks per Specialist
1. multi-source — Google News RSS distinct-domain count
2. image-match — stub (Phase 3 vision LLM)
3. video-match — stub (Phase 3)
4. location — keyword gazetteer
5. datetime — freshness score (fresh → 1.0, stale >3d → 0.4)
6. rewriter quality — LLM similarity + hallucination penalty

### Decision Gate
- composite < 60 → reject
- 60 ≤ composite < 85 → editor review
- composite ≥ 85 + not sensitive → auto_publish
- sensitive + composite < 90 → forced review

### Safety Hardening
- `computeAiScore` max 70 (was 100) — never auto-publishes
- Specialist error → `pending_review` (fail-safe to human)
- Sensitive keyword hard gate prevents auto-publish

### Files
- `worker/src/agents/specialists/types.ts`
- `worker/src/agents/specialists/base.ts`
- `worker/src/agents/specialists/router.ts`
- 6 specialist files

### Phase 3 (pending)
- Vision LLM for image-match (Gemini 1.5 Flash)
- Video transcript similarity
- Multi-source credibility weighting (BBC=1.0, unknown=0.3)
- Per-section `article_verifications` audit table
- Admin dashboard for verification results

### 2026-09-20 (Session 2 — long)
- 7 i18n bugs closed (commits bd56a7f, bc369fe)
- AI score hardened: max 70 (was 100 dangerous)
- 6 section specialists + 6-check framework (f91f43e)
- TrustSignals widget + 19 DB field unlock (386992a)
- source_registry table + diversity enforcement (6913045)
- Source diversity: was 88.7% first-alo, target max 30% per source
- Next: Worker → Supabase writeback (verification_status, fact_sources)
