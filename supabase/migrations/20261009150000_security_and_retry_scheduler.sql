-- Harden public live-session reads, profile secrets, gateway usage index,
-- env_guard RLS, and enqueue a failed-item retry scheduler that matches
-- the live project last-migration name without changing publish quality gates.

begin;

-- Public clients may only see live sessions, never idle rows.
drop policy if exists "public read live sessions" on public.live_sessions;
create policy "public read live sessions"
on public.live_sessions for select
to anon, authenticated
using (status = 'live');

-- Own-profile updates cannot flip verification or 2FA columns.
drop policy if exists "profiles update own fields" on public.profiles;
create policy "profiles update own fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and verified = (select p.verified from public.profiles p where p.id = auth.uid())
  and two_factor_enabled = (select p.two_factor_enabled from public.profiles p where p.id = auth.uid())
  and two_factor_secret = (select p.two_factor_secret from public.profiles p where p.id = auth.uid())
);

-- Covering index for gateway usage joins/deletes.
create index if not exists ai_gateway_usage_events_api_vault_id_idx
  on public.ai_gateway_usage_events (api_vault_id);

-- env_guard.marker is not an application table. If present, lock it down.
do $$
begin
  if to_regclass('env_guard.marker') is not null then
    execute 'alter table env_guard.marker enable row level security';
    execute 'revoke all on table env_guard.marker from public, anon, authenticated';
    if not exists (
      select 1 from pg_policies
      where schemaname = 'env_guard' and tablename = 'marker' and policyname = 'env_guard marker deny clients'
    ) then
      execute $policy$
        create policy "env_guard marker deny clients"
        on env_guard.marker
        for all
        to anon, authenticated
        using (false)
        with check (false)
      $policy$;
    end if;
  end if;
end $$;

-- Restrict public execute on sensitive SECURITY DEFINER helpers.
do $$
declare
  fn record;
begin
  for fn in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and p.proname in (
        'requeue_failed_news',
        'is_rate_limited',
        'sync_ai_gateway_key_state',
        'acquire_news_pipeline_lock'
      )
  loop
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated', fn.proname, fn.args);
    execute format('grant execute on function public.%I(%s) to service_role', fn.proname, fn.args);
  end loop;
end $$;

revoke all on function public.news_pipeline_last_success() from public;
grant execute on function public.news_pipeline_last_success() to anon, authenticated, service_role;

-- Align retry cadence with the live last-migration name.
select cron.unschedule('newsroom-failed-retry')
where exists (select 1 from cron.job where jobname = 'newsroom-failed-retry');

select cron.schedule('newsroom-failed-retry', '7-59/15 * * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/newsroom/cron-trigger',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || coalesce((
        select ds.decrypted_secret
        from vault.decrypted_secrets ds
        join public.api_vault v on v.key_encrypted = ds.id
        where v.service_name = 'NEWSROOM_INGEST_KEY'
          and v.environment = 'prod'
          and v.is_active = true
        limit 1
      ), '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000
  );
$$);

commit;
