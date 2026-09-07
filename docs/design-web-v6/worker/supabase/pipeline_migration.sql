-- =============================================================================
-- Banglar Voice — autonomous pipeline schema (Supabase / PostgreSQL)
-- -----------------------------------------------------------------------------
-- Adds the columns + tables the autonomous newsroom pipeline needs on top of
-- the existing newsroom_queue flow. Run this in the Supabase SQL editor
-- (Dashboard → SQL → New query). Safe to run twice (idempotent).
--
-- NOTE about newsroom_queue: if that table does not exist in your project yet,
-- create it first (see the app's earlier migration) — the ALTERs below assume
-- it exists. If your project instead stores drafts in a `posts` table with a
-- status column, adapt the table name at the top.
-- =============================================================================

\set ON_ERROR_STOP off

-- -----------------------------------------------------------------------------
-- 1) Extra columns on newsroom_queue for the pipeline state machine
-- -----------------------------------------------------------------------------
ALTER TABLE public.newsroom_queue
  ADD COLUMN IF NOT EXISTS pipeline_state      TEXT        DEFAULT 'collected',
  ADD COLUMN IF NOT EXISTS rewritten_headline  TEXT,
  ADD COLUMN IF NOT EXISTS rewritten_dek       TEXT,
  ADD COLUMN IF NOT EXISTS rewritten_body      JSONB,
  ADD COLUMN IF NOT EXISTS rewritten_keywords  JSONB,
  ADD COLUMN IF NOT EXISTS rewrite_method      TEXT,          -- 'ai' | 'fallback'
  ADD COLUMN IF NOT EXISTS source_hash         TEXT,
  ADD COLUMN IF NOT EXISTS approved_by         TEXT,
  ADD COLUMN IF NOT EXISTS approved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at        TIMESTAMPTZ;

-- Optional status values used by the pipeline. If your queue currently uses a
-- CHECK constraint that only allows pending/approved/etc, replace it:
--   ALTER TABLE public.newsroom_queue DROP CONSTRAINT IF EXISTS newsroom_queue_status_check;
--   ALTER TABLE public.newsroom_queue ADD CONSTRAINT newsroom_queue_status_check
--     CHECK (status IN ('pending','approved','rejected','published','rewritten','media_attached','failed','scheduled'));

-- -----------------------------------------------------------------------------
-- 2) Media attachments (CC0/free images + videos with attribution)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id      UUID REFERENCES public.newsroom_queue(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL DEFAULT 'image',          -- image | video
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  width         INT,
  height        INT,
  alt_text      TEXT,
  attribution_author  TEXT,
  attribution_license TEXT,
  attribution_url     TEXT,
  attribution_title   TEXT,
  sourced_from  TEXT,          -- wikimedia-commons | openverse | pexels | builtin-cc0-fallback
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_attachments_queue ON public.media_attachments(queue_id);

-- -----------------------------------------------------------------------------
-- 3) Publish + broadcast log (one row per platform attempt)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publish_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id      UUID REFERENCES public.newsroom_queue(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,   -- website | facebook | twitter | instagram | linkedin | telegram
  ok            BOOLEAN NOT NULL DEFAULT false,
  ref           TEXT,            -- external post id / url
  skipped       BOOLEAN NOT NULL DEFAULT false,
  skipped_reason TEXT,
  error         TEXT,
  payload_hash  TEXT,            -- sha256 of what was broadcast (audit)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_log_queue ON public.publish_log(queue_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4) Per-platform broadcast status summary (latest state per item+platform)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcast_status (
  queue_id    UUID NOT NULL REFERENCES public.newsroom_queue(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | ok | skipped | failed
  ref         TEXT,
  error       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (queue_id, platform)
);

-- -----------------------------------------------------------------------------
-- 5) RLS: all pipeline tables are SERVER-ONLY (service-role). Lock them down.
-- -----------------------------------------------------------------------------
ALTER TABLE public.media_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_status ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically. We only allow the anon key to read
-- media_attachments (so the public website can render CC0 media URLs) and
-- nothing else. Adjust to your needs.
DROP POLICY IF EXISTS "anon can read media" ON public.media_attachments;
CREATE POLICY "anon can read media" ON public.media_attachments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "service writes publish log" ON public.publish_log;
CREATE POLICY "service writes publish log" ON public.publish_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service writes broadcast status" ON public.broadcast_status;
CREATE POLICY "service writes broadcast status" ON public.broadcast_status
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 6) Admin read helper: pipeline queue with media + latest broadcast state
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.pipeline_queue AS
SELECT
  q.id,
  q.slug,
  COALESCE(q.pipeline_state, q.status) AS state,
  COALESCE(q.rewritten_headline, q.title) AS headline,
  q.status AS queue_status,
  q.category,
  q.source,
  q.agent,
  q.approved_by,
  q.approved_at,
  q.published_at,
  q.created_at,
  (SELECT jsonb_agg(jsonb_build_object(
        'kind', ma.kind, 'url', ma.url, 'alt', ma.alt_text,
        'attribution_author', ma.attribution_author,
        'attribution_license', ma.attribution_license,
        'attribution_url', ma.attribution_url))
   FROM public.media_attachments ma WHERE ma.queue_id = q.id) AS media,
  (SELECT jsonb_object_agg(bs.platform,
        jsonb_build_object('status', bs.status, 'ref', bs.ref, 'error', bs.error, 'updated_at', bs.updated_at))
   FROM public.broadcast_status bs WHERE bs.queue_id = q.id) AS broadcast
FROM public.newsroom_queue q;

COMMENT ON VIEW public.pipeline_queue IS
  'Admin view: newsroom_queue joined with CC0 media attachments and per-platform broadcast status.';
