# HANDOFF — auto-publish pipeline (T0–T8)

Date: 2026-10-02
Branch: `wip/t0-t3-v2` (created from `origin/wip/t0-t3-partial`; do not work on the old `wip/t0-t3-fixes` history)
Rules: `.env` / `DATABASE_URL` / secrets were not committed or printed. No SQL was applied to production. Only `worker/src/lib/publish-gate.test.ts` was added as a test file.

## Goal

Every 14 minutes new, complete, image-bearing news is published automatically and safely; the Vercel cron path and the worker path follow identical rules.

## Cadence — 14 minutes

- `PIPELINE_INTERVAL_MINUTES = 14`, `PIPELINE_CRON = '*/14 * * * *'` (`worker/src/lib/publish-gate.ts`).
- `frontend/vercel.json` cron: `*/14 * * * *` → `/api/newsroom/cron-trigger`.
- `.github/workflows/news-ingest.yml`: `*/14 * * * *`, `timeout-minutes: 14`.
- Lock: both paths insert a `news_pipeline_runs` row with `status='running'`
  (cron `stage='cron'`, worker `stage='cycle'`). Acquisition inspects the
  **oldest** running `created_at`; a lock older than `STALE_LOCK_MS = 10 min`
  is marked `failed` (`stale_lock`). A run only ever updates its own `id`
  (never another run's lock) and writes its final status in a `finally` block.
- Per-source due check: `isSourceDue` uses `news_sources.interval_minutes` with a
  `SOURCE_DUE_GRACE_MINUTES = 2` margin (`elapsed >= interval - 2 min`), so
  `interval_minutes = 15` sources are fetched on every 14-minute run.

## Shared publish gate (single source of truth)

- Canonical: `worker/src/lib/publish-gate.ts`; `frontend/lib/publish-gate.ts` must stay
  byte-identical (`npm run check:publish-gate` in both packages).
- Both the Vercel cron route (`decidePublish` directly) and the worker
  (`supervisor.decide` → `decidePublish`) use the same gate. No duplicated gate
  logic. `MIN_AI_CONFIDENCE` is gone. There is no `ai_score` column;
  `ai_confidence = score / 100` where `score` is 0–100.

### Gate rules (all must hold to publish)

1. `AUTO_PUBLISH === "true"` (unset ⇒ hold).
2. Source `enabled` and `kill_switch = false`.
3. `source_url` is a non-local https URL.
4. `rewriteMethod === "ai"` (non-AI/fallback ⇒ hold `rewrite_not_ai`).
5. Bengali body ≥ `MIN_BODY_CHARS = 200`.
6. https image and `is_fallback = false` (fallback ⇒ hold `image_fallback`).
7. Age ≤ 48 hours (`ITEM_MAX_AGE_MS`), else `reject older_than_48h`.
8. High risk never auto-publishes; medium risk needs `score >= MIN_AI_SCORE + 10`;
   low risk needs `score >= MIN_AI_SCORE`.

`DEFAULT_MIN_AI_SCORE = 40` (`MIN_AI_SCORE` overrides it).

### Scoring (weights sum to exactly 100)

bengali body ratio ≥ 0.6 `+20`; body ≥ 200 chars `+20`; title ≥ 8 chars and
bengali ratio ≥ 0.3 `+15`; https non-fallback image `+15`; https source `+10`;
non-copy (`copySimilarity < COPY_SIMILARITY_MAX = 0.85` or no source text) `+10`;
`rewriteMethod === "ai"` `+10`.

### Risk levels

Bangla/English high-risk keyword lists ⇒ `high`. Medium keyword lists (arrest,
election, clash, vaccine, …) and the `politics` / `health` categories ⇒ `medium`.
Otherwise `low`. `high` = hold.

## 403 rule

Per-source outcomes are written to `news_pipeline_runs.details.sources` keyed by
source id (`feed_url` fallback). The current run counts as one. After
`FEED_403_DISABLE_THRESHOLD = 3` **consecutive final-403** runs including the
current one, `news_sources.enabled` is set to `false`; the auto-disable is
recorded in `details.disabled` and in logs. `kill_switch` is never written.

## Dedupe

Cron path checks `canonical_url`, `source_url`, and `content_hash` before insert
(unique violations are treated as skips). `20261002120000_article_unique_indexes.sql`
adds `canonical_url` and `source_guid` unique indexes guarded by an
`information_schema` column check, plus the source-URL/hash indexes.

## Intentional behavior changes

1. **Brand fallback images no longer auto-publish.** `is_fallback = true` ⇒ hold
   (`image_fallback`). Only real RSS / Pexels images publish.
2. **48-hour title-duplicate check status.** Retained in the worker supervisor
   (`supervisor.isDuplicate`, in-memory, 48 h) and applied in the worker flow. It is
   process-local and is **not** part of the shared cron gate; the cron path relies on
   the DB dedupe in the section above.

## Security / migrations

- `20261002000000_public_article_views.sql` is re-runnable: `DROP VIEW IF EXISTS`
  + `CREATE` in one transaction, `WITH (security_invoker = true)`, `GRANT SELECT`
  to `anon`, `authenticated`, `service_role` re-issued.
- `anon` gets column-level `SELECT` on `public.articles` for view columns only.
  `claims`, `fact_sources`, `review_reason`, `risk_level`, `ai_model`,
  `human_verified` are not directly readable by `anon` or `authenticated`.
  Admin routes use `service_role`; frontend clients (`lib/api.ts`,
  `lib/supabase/*`) read only the public views.

## Env var names (names only)

`AUTO_PUBLISH`, `MIN_AI_SCORE`, `FEED_403_DISABLE_THRESHOLD` (code constant 3),
`CRON_SECRET`, `NEWSROOM_INGEST_KEY`, `INTERVAL_MINUTES`, `PEXELS_API_KEY`,
`CHAT_AI_KEY`, `CHAT_AI_BASE_URL`, `CHAT_AI_MODEL` / `GROQ_API_KEY` /
`OPENROUTER_API_KEY`, `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`.

Auth: `GET /api/newsroom/cron-trigger` requires `Authorization: Bearer <CRON_SECRET>`
and fails closed with 401 when `CRON_SECRET` is unset. `POST` accepts
`NEWSROOM_INGEST_KEY` (header or Bearer) or the cron secret.

## Owner manual steps

1. Apply migrations on **staging first**: `20261002000000_public_article_views.sql`,
   `20261002120000_article_unique_indexes.sql`, `20261001000000_grant_articles_access.sql`.
2. Run the duplicate pre-check query (in the comment at the top of
   `20261002120000_article_unique_indexes.sql`) before the unique-index migration,
   and clean any duplicates.
3. Confirm `news_sources.interval_minutes` values (15-minute feeds work with the 2-minute grace).
4. Set the env vars on **both** Vercel and the worker.
5. Keep `AUTO_PUBLISH=false` until several runs have been observed, then enable.
6. Note: the Vercel `*/14 * * * *` cron requires a plan that supports minute-level cron.
