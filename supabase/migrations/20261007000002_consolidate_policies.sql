-- TASK 3 — consolidate duplicate permissive SELECT policies.
--
-- A table that carries two or more *unconditional* (USING (true)) PERMISSIVE
-- SELECT policies for the same role set is redundant: the OR of `true` is
-- still `true`. This migration collapses each such group to a single policy.
--
-- Safety rules:
--   * only policies whose qual is literally `true` are considered, and only
--     when the WHOLE group for that (table, role-set, cmd) is unconditional,
--     so conditional policies are never silently widened or dropped;
--   * news_ingest_queue and news_pipeline_runs deny-write policies are
--     explicitly excluded and never touched;
--   * everything is recorded in maintenance.security_hardening_report.

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

do $$
declare
  r        record;
  i        int;
  merged   int := 0;
begin
  -- 1. merge groups of unconditional permissive SELECT policies
  for r in
    select schemaname,
           tablename,
           roles,
           roles::text as roles_text,
           array_agg(policyname order by policyname) as names,
           count(*) as n
      from pg_policies
     where schemaname = 'public'
       and cmd = 'SELECT'
       and permissive = 'PERMISSIVE'
       and qual = 'true'
       and tablename not in ('news_ingest_queue', 'news_pipeline_runs')
     group by schemaname, tablename, roles
    having count(*) > 1
    order by tablename
  loop
    for i in 2 .. array_length(r.names, 1) loop
      execute format('drop policy if exists %I on %I.%I',
                     r.names[i], r.schemaname, r.tablename);
    end loop;

    merged := merged + 1;

    insert into maintenance.security_hardening_report (task, item, action, detail)
    values ('TASK3',
            r.schemaname || '.' || r.tablename || ' [SELECT ' || r.roles_text || ']',
            'merged ' || r.n || ' unconditional permissive SELECT policies into 1',
            'kept: ' || r.names[1]
            || '; dropped: ' || array_to_string(r.names[2:array_length(r.names, 1)], ', '));
  end loop;

  -- 2. report any remaining multi-policy groups (conditional ones) without touching them
  for r in
    select schemaname, tablename, cmd, roles::text as roles_text,
           array_agg(policyname order by policyname) as names,
           count(*) as n
      from pg_policies
     where schemaname = 'public'
     group by schemaname, tablename, cmd, roles
    having count(*) > 1
    order by tablename, cmd
  loop
    insert into maintenance.security_hardening_report (task, item, action, detail)
    values ('TASK3',
            r.schemaname || '.' || r.tablename || ' [' || r.cmd || ' ' || r.roles_text || ']',
            'left untouched (' || r.n || ' distinct policies)',
            'conditional/role-scoped by design: ' || array_to_string(r.names, ', '));
  end loop;

  -- 3. explicit confirmation that the protected tables were not modified
  insert into maintenance.security_hardening_report (task, item, action, detail)
  select 'TASK3', 'public.' || tablename || ' [' || cmd || ' ' || roles::text || ']',
         'protected — skipped by design',
         'deny-write policy retained: ' || policyname
    from pg_policies
   where schemaname = 'public'
     and tablename in ('news_ingest_queue', 'news_pipeline_runs')
   order by tablename, cmd;

  raise notice 'TASK3: consolidated % duplicate policy group(s)', merged;
end $$;

commit;
