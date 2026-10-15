alter table public.videos
  add column if not exists audit_reason text;

do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.videos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.videos drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.videos
  add constraint videos_status_check
  check (status in ('draft', 'published', 'live', 'archived', 'needs_enrichment', 'quarantined'));
