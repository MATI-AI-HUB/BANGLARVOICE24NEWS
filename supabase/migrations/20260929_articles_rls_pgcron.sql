-- Drop duplicate unconditional public SELECT policies on articles.
-- Keep (or create) status = 'published' gated public read.
-- Enable pg_cron and pg_net. Idempotent. Does not change
-- news_ingest_queue / news_pipeline_runs deny-write policies.

drop policy if exists "Public articles are viewable by everyone" on public.articles;
drop policy if exists "Public can read articles" on public.articles;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'articles'
      and cmd = 'SELECT'
      and coalesce(qual, '') ilike '%status%published%'
  ) then
    create policy "public read published articles"
      on public.articles
      for select
      using (status = 'published');
  end if;
end $$;

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.articles
  add column if not exists content_hash text not null default '';

create unique index if not exists articles_content_hash_uidx
  on public.articles (content_hash)
  where content_hash is not null and content_hash <> '';

create or replace function public.news_pipeline_last_success()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(completed_at, created_at)
  from public.news_pipeline_runs
  where status = 'success'
  order by created_at desc
  limit 1;
$$;

revoke all on function public.news_pipeline_last_success() from public;
grant execute on function public.news_pipeline_last_success() to anon, authenticated, service_role;
