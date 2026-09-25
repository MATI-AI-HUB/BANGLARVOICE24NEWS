-- Additive newsroom automation schema (idempotent).
-- Queue + run log + writer article columns + videos.
-- Do not apply until the production Supabase ref is locked (Gate 4).

-- ---------------------------------------------------------------------------
-- articles: expand status + writer/video columns
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.articles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.articles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.articles
  add constraint articles_status_check
  check (status in ('draft', 'scheduled', 'published', 'archived', 'pending'));

alter table public.articles
  add column if not exists excerpt_bn text not null default '',
  add column if not exists category_key text not null default 'national',
  add column if not exists editorial_status text not null default 'pending_review',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists human_verified boolean not null default false,
  add column if not exists risk_level text not null default 'low',
  add column if not exists review_reason text,
  add column if not exists source_type text not null default '',
  add column if not exists source_language text not null default 'bn',
  add column if not exists source_name text not null default '',
  add column if not exists source_url text,
  add column if not exists canonical_url text,
  add column if not exists source_published_at timestamptz,
  add column if not exists fact_sources jsonb not null default '[]'::jsonb,
  add column if not exists claims jsonb not null default '[]'::jsonb,
  add column if not exists context_blocks jsonb not null default '[]'::jsonb,
  add column if not exists featured_image text not null default '',
  add column if not exists image_alt_bn text not null default '',
  add column if not exists image_credit text not null default '',
  add column if not exists image_is_representational boolean not null default false,
  add column if not exists media_type text not null default 'none',
  add column if not exists ai_model text not null default '',
  add column if not exists ai_confidence numeric,
  add column if not exists video_id text,
  add column if not exists video_generated_at timestamptz;

create unique index if not exists articles_source_url_uidx
  on public.articles (source_url)
  where source_url is not null and source_url <> '';

create index if not exists articles_category_key_idx
  on public.articles (category_key);

-- ---------------------------------------------------------------------------
-- news_ingest_queue
-- ---------------------------------------------------------------------------
create table if not exists public.news_ingest_queue (
  id                   uuid primary key default gen_random_uuid(),
  source_name          text not null default '',
  source_url           text not null,
  source_published_at  timestamptz,
  title                text not null default '',
  description          text not null default '',
  category_hint        text,
  status               text not null default 'queued'
                       check (status in (
                         'queued',
                         'processing',
                         'skipped',
                         'published',
                         'pending_review',
                         'failed'
                       )),
  attempts             int not null default 0,
  locked_at            timestamptz,
  locked_by            text,
  article_id           uuid references public.articles(id) on delete set null,
  processed_at         timestamptz,
  last_error           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists news_ingest_queue_source_url_uidx
  on public.news_ingest_queue (source_url);

create index if not exists news_ingest_queue_status_created_idx
  on public.news_ingest_queue (status, created_at desc);

alter table public.news_ingest_queue enable row level security;

drop policy if exists "deny client news_ingest_queue" on public.news_ingest_queue;
create policy "deny client news_ingest_queue"
  on public.news_ingest_queue for all
  to anon, authenticated
  using (false)
  with check (false);

grant all on public.news_ingest_queue to service_role;

-- ---------------------------------------------------------------------------
-- news_pipeline_runs
-- ---------------------------------------------------------------------------
create table if not exists public.news_pipeline_runs (
  id              uuid primary key default gen_random_uuid(),
  stage           text not null,
  status          text not null default 'success',
  fetched         int not null default 0,
  queued          int not null default 0,
  processed       int not null default 0,
  published       int not null default 0,
  pending_review  int not null default 0,
  skipped         int not null default 0,
  failed          int not null default 0,
  duration_ms     int not null default 0,
  details         jsonb not null default '{}'::jsonb,
  error_message   text,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists news_pipeline_runs_stage_created_idx
  on public.news_pipeline_runs (stage, created_at desc);

alter table public.news_pipeline_runs enable row level security;

drop policy if exists "deny client news_pipeline_runs" on public.news_pipeline_runs;
create policy "deny client news_pipeline_runs"
  on public.news_pipeline_runs for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "editorial read news_pipeline_runs" on public.news_pipeline_runs;
create policy "editorial read news_pipeline_runs"
  on public.news_pipeline_runs for select
  to authenticated
  using (public.current_app_role() in ('desk_editor', 'chief_editor', 'admin'));

grant all on public.news_pipeline_runs to service_role;
grant select on public.news_pipeline_runs to authenticated;

-- ---------------------------------------------------------------------------
-- videos
-- ---------------------------------------------------------------------------
create table if not exists public.videos (
  id              uuid primary key default gen_random_uuid(),
  title_bn        text not null,
  title_en        text not null default '',
  description_bn  text not null default '',
  category_key    text not null default 'national',
  thumbnail_url   text not null default '',
  video_url       text,
  embed_url       text,
  youtube_id      text,
  duration_sec    int not null default 0,
  is_live         boolean not null default false,
  view_count      int not null default 0,
  status          text not null default 'published'
                  check (status in ('draft', 'published', 'live', 'archived')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists videos_youtube_id_uidx
  on public.videos (youtube_id)
  where youtube_id is not null and youtube_id <> '';

create index if not exists videos_status_published_idx
  on public.videos (status, is_live desc, published_at desc);

alter table public.videos enable row level security;

drop policy if exists "public read published videos" on public.videos;
create policy "public read published videos"
  on public.videos for select
  using (status in ('published', 'live'));

drop policy if exists "editorial manage videos" on public.videos;
create policy "editorial manage videos"
  on public.videos for all
  to authenticated
  using (public.current_app_role() in ('desk_editor', 'chief_editor', 'admin'))
  with check (public.current_app_role() in ('desk_editor', 'chief_editor', 'admin'));

grant all on public.videos to service_role;
grant select on public.videos to anon, authenticated;
