-- Source registry observability and safe feed quarantine.
-- No source rows are deleted; malformed feeds remain recoverable.
begin;

alter table public.news_sources
  add column if not exists last_probe_at timestamptz,
  add column if not exists last_probe_status text,
  add column if not exists last_probe_http_status integer,
  add column if not exists last_probe_items integer,
  add column if not exists last_probe_error text,
  add column if not exists consecutive_failures integer not null default 0;

alter table public.news_sources
  drop constraint if exists news_sources_last_probe_status_chk;
alter table public.news_sources
  add constraint news_sources_last_probe_status_chk
  check (last_probe_status is null or last_probe_status in ('ok', 'error', 'disabled', 'skipped'));

-- The current BDNews24 endpoint returns malformed HTML/XML and cannot be safely ingested.
-- Keep the row for auditability, but fail closed until a valid feed is supplied.
update public.news_sources
set enabled = false,
    kill_switch = false,
    last_probe_at = now(),
    last_probe_status = 'disabled',
    last_probe_http_status = 200,
    last_probe_items = 0,
    last_probe_error = 'malformed XML/HTML response from configured RSS endpoint',
    consecutive_failures = greatest(consecutive_failures, 1),
    updated_at = now()
where lower(name) in ('বিডিনিউজ২৪', 'bdnews24')
  and feed_url = 'https://bangla.bdnews24.com/rss.xml';

commit;
