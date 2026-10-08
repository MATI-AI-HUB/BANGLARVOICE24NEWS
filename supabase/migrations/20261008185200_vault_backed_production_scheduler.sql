-- Production scheduling is owned by Supabase pg_cron. Secrets are resolved at run time
-- from Vault through public.api_vault -> vault.decrypted_secrets.
select cron.unschedule('news-ingest-5min') where exists (select 1 from cron.job where jobname = 'news-ingest-5min');
select cron.unschedule('news-ingest-daytime') where exists (select 1 from cron.job where jobname = 'news-ingest-daytime');
select cron.unschedule('news-ingest-overnight') where exists (select 1 from cron.job where jobname = 'news-ingest-overnight');
select cron.unschedule('social-dispatch-daytime') where exists (select 1 from cron.job where jobname = 'social-dispatch-daytime');
select cron.unschedule('social-dispatch-overnight') where exists (select 1 from cron.job where jobname = 'social-dispatch-overnight');
select cron.unschedule('epaper-daily') where exists (select 1 from cron.job where jobname = 'epaper-daily');

select cron.schedule('news-ingest-daytime', '*/15 0-17 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/newsroom/cron-trigger',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);
select cron.schedule('news-ingest-overnight', '0 18-23 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/newsroom/cron-trigger',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);
select cron.schedule('social-dispatch-daytime', '5-59/15 0-17 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/social/dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);
select cron.schedule('social-dispatch-overnight', '5 18-23 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/social/dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);
select cron.schedule('epaper-daily', '30 17 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/newsroom/epaper',
    headers := jsonb_build_object('Content-Type','application/json','x-ingest-key',coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted=ds.id where v.service_name='NEWSROOM_INGEST_KEY' and v.environment='prod' and v.is_active=true limit 1),'')),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$$);
