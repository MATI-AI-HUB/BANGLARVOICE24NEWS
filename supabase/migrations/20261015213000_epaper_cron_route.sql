-- Keep e-paper scheduling inside Supabase pg_cron/pg_net.
-- The secret is resolved at execution time from Supabase Vault; no secret is stored here.
select cron.unschedule('epaper-daily')
where exists (select 1 from cron.job where jobname = 'epaper-daily');

select cron.schedule('epaper-daily', '0 18 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/cron/epaper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce((
        select ds.decrypted_secret
        from vault.decrypted_secrets ds
        join public.api_vault v on v.key_encrypted = ds.id
        where v.service_name = 'CRON_SECRET'
          and v.environment = 'prod'
          and v.is_active = true
        limit 1
      ), '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000
  );
$$);
