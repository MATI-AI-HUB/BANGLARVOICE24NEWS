-- TASK 2 — harden every SECURITY DEFINER function in the public schema.
--
-- Adds an explicit, non-mutable search_path so a caller cannot hijack name
-- resolution by shadowing objects in a schema that appears earlier on the path.
--
-- Strategy (idempotent, re-runnable, production-safe):
--   * scan the LIVE public schema, not just this repo's migration files;
--   * skip functions that already carry an empty search_path (idempotent guard);
--   * bodies that reference public relations WITHOUT schema qualification would
--     break under `search_path = ''`, so those fall back to the equally fixed
--     `pg_catalog, public` and the offending identifiers are recorded;
--   * everything else gets `search_path = ''` (pg_catalog builtins such as
--     now(), gen_random_uuid(), coalesce() always resolve and need no prefix).
--
-- Every decision is written to maintenance.security_hardening_report.

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
  r             record;
  ident         text;
  unsafe_idents text[] := '{}';
  chosen        text;
  rels          text[];
  patched       int := 0;
  fallbacks     int := 0;
begin
  -- names of relations living in public (used to detect unqualified references)
  select coalesce(array_agg(c.relname), '{}')
    into rels
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'v', 'm', 'p', 'S', 'f');

  for r in
    select p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           p.prosrc
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef = true
       -- idempotent guard: already hardened to an empty search_path
       and not exists (
         select 1
           from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
          where cfg = 'search_path=' or cfg = 'search_path=""'
       )
     order by p.proname
  loop
    unsafe_idents := '{}';

    foreach ident in array rels loop
      -- token appears NOT preceded by a dot (i.e. not already public.<ident>)
      if r.prosrc ~* ('(^|[^A-Za-z0-9_.])'
                      || regexp_replace(ident, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g')
                      || '([^A-Za-z0-9_]|$)') then
        unsafe_idents := unsafe_idents || ident;
      end if;
    end loop;

    if array_length(unsafe_idents, 1) is null then
      chosen := '';
    else
      chosen := 'pg_catalog, public';
      fallbacks := fallbacks + 1;
    end if;

    execute format('alter function public.%I(%s) set search_path = %L',
                   r.proname, r.args, chosen);
    patched := patched + 1;

    insert into maintenance.security_hardening_report (task, item, action, detail)
    values ('TASK2',
            'public.' || r.proname || '(' || r.args || ')',
            'set search_path = ' || quote_literal(chosen),
            case when array_length(unsafe_idents, 1) is null
                 then 'body fully schema-qualified; hardened to empty search_path'
                 else 'unqualified public references kept resolvable: '
                      || array_to_string(unsafe_idents, ', ')
            end);
  end loop;

  -- record functions that were already hardened (no-op proof of idempotency)
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef = true
       and exists (
         select 1
           from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
          where cfg = 'search_path=' or cfg = 'search_path=""'
       )
  loop
    insert into maintenance.security_hardening_report (task, item, action, detail)
    values ('TASK2', 'public.' || r.proname || '(' || r.args || ')',
            'no-op', 'search_path already hardened');
  end loop;

  raise notice 'TASK2: % function(s) hardened, % needed the pg_catalog,public fallback',
    patched, fallbacks;
end $$;

commit;
