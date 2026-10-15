-- Keyless YouTube inventory contract. Real feed rows may be visible while
-- duration enrichment remains pending; no placeholder metadata is introduced.
alter table public.videos
  add column if not exists channel_id text,
  add column if not exists source_url text;

alter table public.videos
  alter column duration_sec drop not null,
  alter column duration_sec drop default;

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
  check (status in ('draft', 'published', 'live', 'archived', 'needs_enrichment'));

drop policy if exists "public read published videos" on public.videos;
create policy "public read published videos"
  on public.videos for select
  using (status in ('published', 'live', 'needs_enrichment'));

create index if not exists videos_channel_published_idx
  on public.videos (channel_id, published_at desc);
