-- VidPilot compatibility layer for Banglar Voice.
-- Additive only: existing articles, videos, social_posts, Vault, cron jobs,
-- e-paper, and Facebook dispatch are not altered.

create table if not exists public.video_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  video_id uuid references public.videos(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  status text not null default 'queued'
    check (status in ('queued','scripting','rendering','needs_review','publishing','published','rejected','failed','cancelled')),
  script_json jsonb,
  caption_bn text,
  caption_en text,
  voice_path text,
  render_path text,
  attempts integer not null default 0 check (attempts >= 0),
  claimed_by text,
  claimed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  error_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_generation_jobs_queue_idx
  on public.video_generation_jobs (status, next_attempt_at, created_at);
create index if not exists video_generation_jobs_article_idx
  on public.video_generation_jobs (article_id, created_at desc);
create unique index if not exists video_generation_jobs_article_active_idx
  on public.video_generation_jobs (article_id)
  where article_id is not null and status not in ('published','rejected','cancelled','failed');

create table if not exists public.video_generation_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.video_generation_jobs(id) on delete cascade,
  kind text not null check (kind in ('stock_video','audio','render','thumbnail')),
  provider text not null,
  external_id text,
  url text,
  page_url text,
  license text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists video_generation_assets_external_idx
  on public.video_generation_assets (job_id, provider, external_id)
  where external_id is not null;
create index if not exists video_generation_assets_job_idx
  on public.video_generation_assets (job_id, created_at);

create table if not exists public.video_generation_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.video_generation_jobs(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists video_generation_events_job_idx
  on public.video_generation_events (job_id, created_at desc);

create or replace function public.video_generation_set_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists video_generation_jobs_updated_at on public.video_generation_jobs;
create trigger video_generation_jobs_updated_at
before update on public.video_generation_jobs
for each row execute function public.video_generation_set_updated_at();

create or replace function public.video_generation_guard_transition()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not (
    (old.status = 'queued' and new.status in ('scripting','failed','cancelled')) or
    (old.status = 'scripting' and new.status in ('rendering','failed','cancelled')) or
    (old.status = 'rendering' and new.status in ('needs_review','failed','cancelled')) or
    (old.status = 'needs_review' and new.status in ('rendering','publishing','rejected','cancelled')) or
    (old.status = 'publishing' and new.status in ('published','failed')) or
    (old.status = 'failed' and new.status = 'queued') or
    (old.status in ('published','rejected','cancelled') and false)
  ) then
    raise exception 'illegal video generation transition % -> %', old.status, new.status;
  end if;
  if new.status in ('publishing','published') and new.video_id is null then
    raise exception 'video_id is required before video generation job can be published';
  end if;
  return new;
end;
$$;

drop trigger if exists video_generation_jobs_guard on public.video_generation_jobs;
create trigger video_generation_jobs_guard
before update on public.video_generation_jobs
for each row execute function public.video_generation_guard_transition();

create or replace function public.video_generation_record_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.video_generation_events(job_id, event_type, to_status, actor)
    values (new.id, 'created', new.status, coalesce(new.claimed_by, 'system'));
  elsif new.status is distinct from old.status then
    insert into public.video_generation_events(job_id, event_type, from_status, to_status, actor)
    values (new.id, 'status_changed', old.status, new.status, coalesce(new.claimed_by, 'system'));
  end if;
  return new;
end;
$$;

drop trigger if exists video_generation_jobs_event on public.video_generation_jobs;
create trigger video_generation_jobs_event
after insert or update on public.video_generation_jobs
for each row execute function public.video_generation_record_event();

create or replace function public.claim_video_generation_job(p_worker text)
returns public.video_generation_jobs
language plpgsql security definer set search_path = public as $$
declare j public.video_generation_jobs;
begin
  if p_worker is null or length(trim(p_worker)) < 3 then
    raise exception 'worker id is required';
  end if;

  update public.video_generation_jobs
     set status = 'failed',
         claimed_by = null,
         claimed_at = null,
         error_log = error_log || jsonb_build_array(jsonb_build_object('at', now(), 'error', 'max attempts reached'))
   where status in ('queued','scripting','rendering','publishing')
     and attempts >= 5
     and (claimed_at is null or claimed_at < now() - interval '5 minutes');

  select * into j
    from public.video_generation_jobs
   where status in ('queued','scripting','rendering','publishing')
     and attempts < 5
     and next_attempt_at <= now()
     and (claimed_at is null or claimed_at < now() - interval '5 minutes')
   order by created_at
   for update skip locked
   limit 1;

  if not found then return null; end if;

  update public.video_generation_jobs
     set claimed_by = p_worker,
         claimed_at = now(),
         attempts = attempts + 1,
         next_attempt_at = now() + make_interval(secs => least(30 * power(2, attempts)::integer, 3600))
   where id = j.id
   returning * into j;
  return j;
end;
$$;

create or replace function public.finish_video_generation_step(p_job uuid, p_worker text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.video_generation_jobs
     set status = p_status,
         attempts = 0,
         claimed_by = null,
         claimed_at = null,
         next_attempt_at = now()
   where id = p_job and claimed_by = p_worker;
  if not found then raise exception 'job not found or worker does not own claim'; end if;
end;
$$;

create or replace function public.record_video_generation_error(p_job uuid, p_worker text, p_error text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.video_generation_jobs
     set error_log = error_log || jsonb_build_array(jsonb_build_object('at', now(), 'status', status, 'error', left(p_error, 2000))),
         claimed_by = null,
         claimed_at = null,
         next_attempt_at = now()
   where id = p_job and claimed_by = p_worker;
  if not found then raise exception 'job not found or worker does not own claim'; end if;
end;
$$;

create or replace function public.approve_video_generation(p_job uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() not in ('desk_editor','chief_editor','admin') then
    raise exception 'editorial role required';
  end if;
  update public.video_generation_jobs
     set status = 'publishing', next_attempt_at = now()
   where id = p_job and status = 'needs_review' and video_id is not null;
  if not found then raise exception 'job not found, not reviewable, or video is not linked'; end if;
end;
$$;

alter table public.video_generation_jobs enable row level security;
alter table public.video_generation_assets enable row level security;
alter table public.video_generation_events enable row level security;
revoke all on public.video_generation_jobs, public.video_generation_assets, public.video_generation_events from anon, authenticated;
grant all on public.video_generation_jobs, public.video_generation_assets, public.video_generation_events to service_role;
revoke execute on function public.claim_video_generation_job(text), public.finish_video_generation_step(uuid,text,text), public.record_video_generation_error(uuid,text,text) from public, anon, authenticated;
grant execute on function public.claim_video_generation_job(text), public.finish_video_generation_step(uuid,text,text), public.record_video_generation_error(uuid,text,text) to service_role;
revoke execute on function public.approve_video_generation(uuid) from public, anon, authenticated;
grant execute on function public.approve_video_generation(uuid) to authenticated, service_role;

comment on table public.video_generation_jobs is 'Additive VidPilot orchestration layer. Public video inventory remains public.videos.';
comment on table public.video_generation_assets is 'Server-only media metadata; provider credentials remain in Supabase Vault.';
comment on table public.video_generation_events is 'Immutable generation state audit trail.';
