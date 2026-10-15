-- Daily keyless YouTube inventory sync. Secret is resolved from Vault at run time.
select cron.unschedule('youtube-sync-daily')
where exists (select 1 from cron.job where jobname = 'youtube-sync-daily');

select cron.schedule('youtube-sync-daily', '30 18 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/cron/youtube-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce((
        select ds.decrypted_secret
        from vault.decrypted_secrets ds
        join public.api_vault v on v.key_encrypted = ds.id
        where v.service_name = 'NEWSROOM_INGEST_KEY'
          and v.environment = 'prod'
          and v.is_active = true
        limit 1
      ), '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000
  );
$$);
