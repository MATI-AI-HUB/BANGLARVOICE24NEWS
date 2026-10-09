-- Prefer world-class RSS sources and keep the 15-minute production cadence.
begin;

insert into public.news_sources (name, feed_url, enabled, kill_switch, interval_minutes, licence_note)
values
  ('BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml', true, false, 15, 'Public RSS'),
  ('BBC Bangla', 'https://feeds.bbci.co.uk/bengali/rss.xml', true, false, 15, 'Public RSS'),
  ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', true, false, 15, 'Public RSS'),
  ('The New York Times World', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', true, false, 15, 'Public RSS'),
  ('The Guardian World', 'https://www.theguardian.com/world/rss', true, false, 15, 'Public RSS'),
  ('DW World', 'https://rss.dw.com/rdf/rss-en-world', true, false, 15, 'Public RSS'),
  ('NPR News', 'https://feeds.npr.org/1004/rss.xml', true, false, 15, 'Public RSS'),
  ('The Hindu International', 'https://www.thehindu.com/news/international/feeder/default.rss', true, false, 15, 'Public RSS')
on conflict (feed_url) do update
set enabled = true,
    kill_switch = false,
    interval_minutes = 15,
    licence_note = excluded.licence_note,
    updated_at = now();

update public.news_sources
set enabled = false,
    updated_at = now()
where enabled = true
  and kill_switch = false
  and feed_url not ilike '%bbci.co.uk%'
  and feed_url not ilike '%bbc.com%'
  and feed_url not ilike '%aljazeera.com%'
  and feed_url not ilike '%nytimes.com%'
  and feed_url not ilike '%theguardian.com%'
  and feed_url not ilike '%npr.org%'
  and feed_url not ilike '%dw.com%'
  and feed_url not ilike '%france24.com%'
  and feed_url not ilike '%thehindu.com%'
  and feed_url not ilike '%japantimes.co.jp%'
  and feed_url not ilike '%reuters.com%'
  and feed_url not ilike '%apnews.com%';

select cron.unschedule('news-ingest-daytime') where exists (select 1 from cron.job where jobname = 'news-ingest-daytime');
select cron.unschedule('news-ingest-overnight') where exists (select 1 from cron.job where jobname = 'news-ingest-overnight');
select cron.unschedule('social-dispatch-daytime') where exists (select 1 from cron.job where jobname = 'social-dispatch-daytime');
select cron.unschedule('social-dispatch-overnight') where exists (select 1 from cron.job where jobname = 'social-dispatch-overnight');

select cron.schedule('news-ingest-daytime', '*/15 0-17 * * *', $$
  select net.http_post(
    url := 'https://YOUR_DOMAIN/api/newsroom/cron-trigger',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);

select cron.schedule('news-ingest-overnight', '*/15 18-23 * * *', $$
  select net.http_post(
    url := 'https://YOUR_DOMAIN/api/newsroom/cron-trigger',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);

select cron.schedule('social-dispatch-daytime', '5-59/15 0-17 * * *', $$
  select net.http_post(
    url := 'https://YOUR_DOMAIN/api/social/dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);

select cron.schedule('social-dispatch-overnight', '5-59/15 18-23 * * *', $$
  select net.http_post(
    url := 'https://YOUR_DOMAIN/api/social/dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);

commit;
