-- Unique indexes for double-publish safety.
-- Do not apply until production confirm. Owner applies on staging first.
-- CREATE UNIQUE INDEX fails if duplicate rows already exist; run the pre-check first:
--   select source_url, count(*) from public.articles
--     where source_url is not null and source_url <> '' group by 1 having count(*) > 1;
--   select canonical_url, count(*) from public.articles
--     where canonical_url is not null and canonical_url <> '' group by 1 having count(*) > 1;
--   select content_hash, count(*) from public.articles
--     where content_hash is not null and content_hash <> '' group by 1 having count(*) > 1;
--   select source_guid, count(*) from public.news_ingest_queue
--     where source_guid is not null and source_guid <> '' group by 1 having count(*) > 1;

begin;

create unique index if not exists articles_source_url_uidx
  on public.articles (source_url)
  where source_url is not null and source_url <> '';

create unique index if not exists articles_content_hash_uidx
  on public.articles (content_hash)
  where content_hash is not null and content_hash <> '';

alter table public.news_ingest_queue
  add column if not exists source_guid text;

create unique index if not exists news_ingest_queue_source_url_uidx
  on public.news_ingest_queue (source_url);

-- canonical_url and source_guid are created only when the column is present
-- (guarded via information_schema), keeping this migration re-runnable.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'articles'
      and column_name = 'canonical_url'
  ) then
    create unique index if not exists articles_canonical_url_uidx
      on public.articles (canonical_url)
      where canonical_url is not null and canonical_url <> '';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'news_ingest_queue'
      and column_name = 'source_guid'
  ) then
    create unique index if not exists news_ingest_queue_source_guid_uidx
      on public.news_ingest_queue (source_guid)
      where source_guid is not null and source_guid <> '';
  end if;
end $$;

commit;
