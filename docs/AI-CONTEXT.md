# Banglar Voice — AI Context

## Project
Bangladeshi news portal — Next.js 15 frontend + Go/PocketBase backend + Supabase DB + Termux dev environment.
Live: https://www.banglarvoice24news.com
Repo: https://github.com/banglarvoice33-byte/BANGLARVOICE-APPS

## Critical environment facts
- Termux on Android (no /tmp writable — use $HOME or repo for scripts)
- Push to origin only (old-origin repo deleted)
- Vercel project: hizlanews46-1285s-projects / banglarvoice-apps
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
1. (next) VideoHub + LiveBlog + Audio locale — PR
2. Disable broken `.github/workflows/vercel-deploy.yml` (red X, redundant)
3. Backfill 8 missing `_en` translations via `frontend/backfill-v5.js`
4. URL-based locale routing (`/bn/...`, `/en/...`) — SEO priority
5. hreflang + per-language sitemaps
6. Translation editorial workspace (AI draft + human review)
7. `article_translations` table — only if going 5+ languages

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

### Known remaining web bugs (next session)
1. Homepage card meta (`time_ago_bn`, `reading_time_bn`) not locale-aware
2. Homepage category chip not using translateCategory()
3. Homepage bias chip shows `সূক্ষ্ম 50` on EN
4. Live Blog section entirely Bengali
5. App download banner entirely Bengali
6. AudioPlayer widget shows `আ.` on EN
7. Breaking ticker content not locale-aware
