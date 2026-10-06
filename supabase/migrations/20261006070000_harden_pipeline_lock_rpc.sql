-- Harden the pipeline lock RPC without changing its application behavior.
-- The lock is acquired only by the server-side cron route using service_role.

begin;

alter function public.acquire_news_pipeline_lock(timestamptz)
  set search_path = pg_catalog, public;

revoke execute on function public.acquire_news_pipeline_lock(timestamptz)
  from anon, authenticated;
grant execute on function public.acquire_news_pipeline_lock(timestamptz)
  to service_role;

-- This health RPC is intentionally public for the anonymous health endpoint;
-- pin its search path while preserving that read-only contract.
alter function public.news_pipeline_last_success()
  set search_path = pg_catalog, public;

commit;
