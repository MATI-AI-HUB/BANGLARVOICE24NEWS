-- Additive platform contract. Do not apply until the user confirms production.
-- Maps existing app_role values onto reader/reporter/editor/admin without
-- dropping the historical enum. Extends articles workflow and adds sources.
--
-- Idempotent: ADD VALUE IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS then CREATE POLICY.
--
-- Rollback (manual, after confirm): 
--   drop trigger if exists articles_state_change_audit on public.articles;
--   drop function if exists public.article_state_change();
--   drop function if exists public.platform_role();
--   drop policy if exists "reporters insert own original drafts" on public.articles;
--   drop policy if exists "reporters update own drafts" on public.articles;
--   drop policy if exists "editors approve articles" on public.articles;
--   alter table public.articles drop constraint if exists articles_origin_check;
--   alter table public.articles drop constraint if exists articles_workflow_status_check;
--   drop table if exists public.news_sources;
-- Enum values and added columns are not dropped (Postgres cannot un-add enum values).

do $$ begin
  alter type public.app_role add value if not exists 'reader';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'reporter';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'editor';
exception when duplicate_object then null; end $$;

create or replace function public.platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_app_role()
    when 'admin' then 'admin'
    when 'editor' then 'editor'
    when 'desk_editor' then 'editor'
    when 'chief_editor' then 'editor'
    when 'reporter' then 'reporter'
    when 'staff_reporter' then 'reporter'
    when 'citizen_reporter' then 'reporter'
    when 'reader' then 'reader'
    else coalesce(public.current_app_role()::text, 'reader')
  end;
$$;

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text not null default '',
  feed_url text not null,
  licence_note text not null default '',
  enabled boolean not null default true,
  interval_minutes int not null default 15,
  etag text,
  last_modified text,
  kill_switch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists news_sources_feed_url_uidx
  on public.news_sources (feed_url);

alter table public.news_sources enable row level security;

drop policy if exists "public read enabled sources" on public.news_sources;
create policy "public read enabled sources"
  on public.news_sources for select
  using (enabled = true and kill_switch = false);

drop policy if exists "admin manage sources" on public.news_sources;
create policy "admin manage sources"
  on public.news_sources for all
  to authenticated
  using (public.platform_role() = 'admin')
  with check (public.platform_role() = 'admin');

grant select on public.news_sources to anon, authenticated;
grant all on public.news_sources to service_role;

alter table public.articles
  add column if not exists origin text not null default 'aggregated',
  add column if not exists is_fallback boolean not null default false,
  add column if not exists source_id uuid references public.news_sources(id) on delete set null,
  add column if not exists image_license text not null default '',
  add column if not exists workflow_status text not null default 'draft';

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
      and conname like '%status%'
  loop
    execute format('alter table public.articles drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.articles
  drop constraint if exists articles_status_check;

alter table public.articles
  add constraint articles_status_check
  check (status in (
    'draft', 'scheduled', 'pending', 'submitted', 'approved',
    'published', 'archived', 'retracted'
  ));

alter table public.articles
  drop constraint if exists articles_origin_check;

alter table public.articles
  add constraint articles_origin_check
  check (origin in ('aggregated', 'original'));

alter table public.articles
  drop constraint if exists articles_workflow_status_check;

alter table public.articles
  add constraint articles_workflow_status_check
  check (workflow_status in (
    'draft', 'submitted', 'approved', 'published', 'retracted'
  ));

create or replace function public.article_state_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (old.status is distinct from new.status or old.workflow_status is distinct from new.workflow_status) then
    insert into public.audit_log (actor_id, action, detail)
    values (
      auth.uid(),
      'article_state_change',
      jsonb_build_object(
        'article_id', new.id,
        'from_status', old.status,
        'to_status', new.status,
        'from_workflow', old.workflow_status,
        'to_workflow', new.workflow_status
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists articles_state_change_audit on public.articles;
create trigger articles_state_change_audit
  after update on public.articles
  for each row
  execute function public.article_state_change();

drop policy if exists "reporters insert own original drafts" on public.articles;
create policy "reporters insert own original drafts"
  on public.articles for insert
  to authenticated
  with check (
    public.platform_role() in ('reporter', 'editor', 'admin')
    and status in ('draft', 'submitted', 'pending')
  );

drop policy if exists "reporters update own drafts" on public.articles;
create policy "reporters update own drafts"
  on public.articles for update
  to authenticated
  using (
    public.platform_role() = 'reporter'
    and status in ('draft', 'pending', 'submitted')
  )
  with check (
    public.platform_role() = 'reporter'
    and status in ('draft', 'pending', 'submitted')
    and status <> 'published'
  );

drop policy if exists "editors approve articles" on public.articles;
create policy "editors approve articles"
  on public.articles for update
  to authenticated
  using (public.platform_role() in ('editor', 'admin'))
  with check (public.platform_role() in ('editor', 'admin'));

-- Public SELECT remains the existing "public read published articles" policy
-- (anon/authenticated may read status='published' only). Writes stay
-- authenticated-role or service_role. audit_log insert is service/definer.
