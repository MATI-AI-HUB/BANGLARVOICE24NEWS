# HANDOFF — auto-publish pipeline (quality-gate)

Date: 2026-10-04
Branch: `wip/quality-gate` (from `origin/main`; do not push to `main`)
Rules: `.env` / secrets were not committed or printed. No SQL was applied to production. Existing articles were not touched.

## Goal

`AUTO_PUBLISH=true` stays on. Auto-publish only non-sensitive, full original-wording articles with a low-risk-licence picture. Anything sensitive is held as `pending` with `review_reason`.

## Cadence

- Source due interval still uses `PIPELINE_INTERVAL_MINUTES = 14` (`worker/src/lib/publish-gate.ts`).
- Production scheduler is Supabase `pg_cron` + Vault → `https://www.banglarvoice24news.com/api/newsroom/cron-trigger` (`*/15 0-17`, overnight hourly). Failed-item retry: `7-59/15 * * * *`.
- Do not rely on Vercel Hobby cron or the old `automation-king.vercel.app` webhook.
- Lock: `news_pipeline_runs` `status='running'`; stale after `STALE_LOCK_MS = 10 min`.
- Per-source due: `SOURCE_DUE_GRACE_MINUTES = 2`.

## Shared publish gate

- Canonical: `worker/src/lib/publish-gate.ts`; `frontend/lib/publish-gate.ts` must stay byte-identical (`npm run check:publish-gate`).
- Cron (`decidePublish`) and worker (`supervisor.decide` → `decidePublish`) share the gate.
- Ingest `POST /api/newsroom/ingest` defaults status to `pending`. `status=published` is honoured only if `decidePublish` returns `publish`.

### Gate rules (all must hold to publish)

1. `AUTO_PUBLISH === "true"` (unset ⇒ hold).
2. Source `enabled` and `kill_switch = false`.
3. `source_url` is a non-local https URL.
4. `rewriteMethod === "ai"` (else hold `rewrite_not_ai`).
5. Bengali body ≥ `MIN_BODY_CHARS = 600`.
6. Image is Pexels, or the source image **and** `news_sources.licence_note` allows reuse (`licenceNoteAllowsReuse`). Brand-logo fallback never auto-publishes (`image_fallback`).
7. Age ≤ 48 hours (`ITEM_MAX_AGE_MS`), else `reject older_than_48h`.
8. Only `riskLevel === 'low'` may auto-publish. Keyword `medium`/`high` ⇒ hold with `review_reason`.
9. AI sensitivity JSON `{sensitive:boolean, reasons:string[]}` for death/killing, crime accusation/arrest, religion/communal, election/political violence, medical/health claims, rumours/unverified, minors, sexual content. Hold if keyword **or** AI says sensitive. AI failure or invalid JSON ⇒ hold `ai_sensitivity_failed`.
10. Originality: 4-gram overlap with source ≤ `MAX_NGRAM_OVERLAP = 0.2`; no run of `MAX_IDENTICAL_RUN = 8` identical consecutive words; every number and 4-digit year in the output appears in the source. Else hold. Missing source text ⇒ `source_fetch_failed` / `source_text_missing`.

`DEFAULT_MIN_AI_SCORE = 40` (`MIN_AI_SCORE` overrides it).

### Scoring (weights sum to 100)

bengali body ratio ≥ 0.6 `+20`; body ≥ `MIN_BODY_CHARS` `+20`; title ≥ 8 chars and bengali ratio ≥ 0.3 `+15`; https non-fallback image `+15`; https source `+10`; non-copy (`copySimilarity < COPY_SIMILARITY_MAX = 0.85` or no source text) `+10`; `rewriteMethod === "ai"` `+10`.

### Risk levels

High-risk keywords ⇒ `high`. Medium keywords (arrest, election, clash, vaccine, …) and `politics` / `health` ⇒ `medium`. Otherwise `low`. Medium and high never auto-publish.

## Full text and rewriter

Rewriter previously received RSS description only. Both cron and worker now fetch the article page (respect `robots.txt`, 10s timeout, no new dependencies). If full text cannot be fetched, hold. Never pad with invented facts. Lead + 3–5 paragraphs; ≥ 600 Bengali characters; source line with name and link; no quote longer than 12 words.

## Pictures

Auto-publish only if (a) Pexels or (b) source image **and** `licence_note` allows reuse. Else try Pexels with AI English `image_keywords`. If none, hold. Stock images set `image_credit`, `image_license`, `image_is_representational=true`. Brand-logo fallback never auto-publishes.

## Volume

Per-run counts are written to `news_pipeline_runs.details` as `fetched`, `queued`, `processed`, `published`. Cron caps: `MAX_ITEMS_PER_SOURCE = 6`, `MAX_CANDIDATES = 12`, deadline `INTERNAL_DEADLINE_MS = 54_000` (Vercel 60s).

## 403 rule

`FEED_403_DISABLE_THRESHOLD = 3` consecutive final-403 runs including the current one disables the source. `kill_switch` is never written.

## Env var names (names only)

`AUTO_PUBLISH`, `MIN_AI_SCORE`, `CRON_SECRET`, `NEWSROOM_INGEST_KEY`, `INTERVAL_MINUTES`, `PEXELS_API_KEY`, `CHAT_AI_KEY`, `CHAT_AI_BASE_URL`, `CHAT_AI_MODEL` / `GROQ_API_KEY` / `OPENROUTER_API_KEY`, `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`.
