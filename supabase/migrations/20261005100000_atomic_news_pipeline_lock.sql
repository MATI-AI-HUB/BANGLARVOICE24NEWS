-- Atomic, database-backed lock for the Vercel news pipeline.
--
-- The old route performed SELECT -> UPDATE -> INSERT from application code.
-- Two concurrent Vercel instances could both observe no active run and then
-- both insert a running row. This function serializes acquisition inside one
-- transaction and the partial unique index provides a second line of defense.

begin;

-- Reconcile duplicate active rows created by the old non-atomic implementation
-- before creating the unique index. Keep the oldest active row.
with ranked as (
  select id,
         row_number() over (order by created_at asc, id asc) as row_number
  from public.news_pipeline_runs
  where stage = 'cron'
    and status = 'running'
    and completed_at is null
)
update public.news_pipeline_runs r
set status = 'failed',
    error_message = 'duplicate_lock_reconciled',
    completed_at = coalesce(r.completed_at, now())
from ranked
where r.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists news_pipeline_runs_active_cron_uidx
  on public.news_pipeline_runs (stage)
  where stage = 'cron' and status = 'running' and completed_at is null;

create or replace function public.acquire_news_pipeline_lock(p_stale_before timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  run_id uuid;
begin
  -- Transaction-scoped advisory lock serializes cleanup and insertion.
  perform pg_advisory_xact_lock(hashtextextended('banglarvoice:news-cron', 0));

  update public.news_pipeline_runs
  set status = 'failed',
      error_message = 'stale_lock',
      completed_at = coalesce(completed_at, now())
  where stage = 'cron'
    and status = 'running'
    and completed_at is null
    and created_at <= p_stale_before;

  if exists (
    select 1
    from public.news_pipeline_runs
    where stage = 'cron'
      and status = 'running'
      and completed_at is null
  ) then
    return null;
  end if;

  insert into public.news_pipeline_runs (stage, status, details)
  values ('cron', 'running', jsonb_build_object('locked_by', 'cron', 'sources', '{}'::jsonb))
  returning id into run_id;

  return run_id;
end;
$$;

revoke all on function public.acquire_news_pipeline_lock(timestamptz) from public;
grant execute on function public.acquire_news_pipeline_lock(timestamptz) to service_role;

commit;
