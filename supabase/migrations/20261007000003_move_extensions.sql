-- TASK 4 — move pg_trgm and pg_net out of the public schema.
--
-- pg_trgm is relocatable  -> ALTER EXTENSION ... SET SCHEMA extensions.
-- pg_net  is NOT relocatable (Supabase-managed, extrelocatable = false), so the
--   only supported route is DROP + CREATE WITH SCHEMA extensions, exactly as the
--   Supabase documentation prescribes. That is destructive for queued requests,
--   so the whole drop/recreate runs inside a sub-transaction:
--     * if anything depends on net.*, DROP EXTENSION fails and the sub-transaction
--       rolls back, leaving pg_net exactly where it was;
--     * the dependents found beforehand are recorded for follow-up.
--
-- Idempotent: a second run finds nothing in public and only records no-ops.

begin;

create schema if not exists maintenance;
create table if not exists maintenance.security_hardening_report (
  id bigserial primary key,
  run_at timestamptz not null default now(),
  task text not null,
  item text not null,
  action text not null,
  detail text
);

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- 1. inventory: what (if anything) depends on the net.* objects?
do $$
declare
  r   record;
  dep text[] := '{}';
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
     where p.prosrc ~* '\mnet\.(http_post|http_get|http_delete|http_request_queue|_http_response)'
  loop
    dep := dep || ('function ' || r.proname || '(' || r.args || ')');
  end loop;

  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind in ('v', 'm')
       and pg_get_viewdef(c.oid) ~* '\mnet\.'
  loop
    dep := dep || ('view ' || r.relname);
  end loop;

  for r in
    select t.tgname from pg_trigger t where pg_get_triggerdef(t.oid) ~* '\mnet\.'
  loop
    dep := dep || ('trigger ' || r.tgname);
  end loop;

  if to_regclass('cron.job') is not null then
    for r in execute 'select jobname from cron.job where command ~* ''\mnet\.''' loop
      dep := dep || ('cron job ' || r.jobname);
    end loop;
  end if;

  insert into maintenance.security_hardening_report (task, item, action, detail)
  values ('TASK4', 'pg_net dependents',
          case when array_length(dep, 1) is null then 'none found' else 'found' end,
          coalesce(array_to_string(dep, '; '), 'no object references net.*'));
end $$;

-- 2. pg_trgm — relocatable, move it
do $$
begin
  if exists (select 1 from pg_extension e
               join pg_namespace n on n.oid = e.extnamespace
              where e.extname = 'pg_trgm' and n.nspname = 'public') then
    begin
      alter extension pg_trgm set schema extensions;
      insert into maintenance.security_hardening_report (task, item, action, detail)
      values ('TASK4', 'pg_trgm', 'moved to extensions',
              'alter extension pg_trgm set schema extensions');
    exception when others then
      insert into maintenance.security_hardening_report (task, item, action, detail)
      values ('TASK4', 'pg_trgm', 'move failed — left in public', sqlerrm);
    end;
  else
    insert into maintenance.security_hardening_report (task, item, action, detail)
    values ('TASK4', 'pg_trgm', 'no-op', 'not installed in public');
  end if;
end $$;

-- 3. pg_net — non-relocatable, drop + recreate inside a protected sub-transaction
do $$
begin
  if exists (select 1 from pg_extension e
               join pg_namespace n on n.oid = e.extnamespace
              where e.extname = 'pg_net' and n.nspname = 'public') then
    begin
      drop extension pg_net;
      create extension pg_net with schema extensions;
      insert into maintenance.security_hardening_report (task, item, action, detail)
      values ('TASK4', 'pg_net', 'moved to extensions',
              'dropped and recreated with schema extensions (net.* objects unchanged)');
    exception when others then
      insert into maintenance.security_hardening_report (task, item, action, detail)
      values ('TASK4', 'pg_net',
              'relocation failed — left in public (rolled back)',
              sqlerrm || ' :: resolve dependents first, then re-run this migration');
    end;
  else
    insert into maintenance.security_hardening_report (task, item, action, detail)
    values ('TASK4', 'pg_net', 'no-op', 'not installed in public');
  end if;
end $$;

grant usage on schema extensions to anon, authenticated, service_role;

commit;
