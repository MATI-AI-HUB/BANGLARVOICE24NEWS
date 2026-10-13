-- Phase 3 AI Social Manager: daily content calendar, cross-platform metrics,
-- and weekly strategy notes. All tables are service-role only; anon and
-- authenticated clients are denied because they hold no distribution policy.
-- Scheduling is owned by Supabase pg_cron; secrets are resolved at run time
-- from Vault through public.api_vault -> vault.decrypted_secrets.

create table if not exists public.social_content_calendar (
  id uuid primary key default gen_random_uuid(),
  calendar_date date not null,
  platform text not null check (platform in ('facebook', 'instagram', 'x', 'linkedin', 'telegram')),
  hour_bst integer not null check (hour_bst between 0 and 23),
  scheduled_at timestamptz not null,
  article_id uuid references public.articles(id) on delete set null,
  caption text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'enqueued', 'published', 'skipped', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_date, platform, hour_bst)
);

create index if not exists social_content_calendar_due_idx
  on public.social_content_calendar (status, scheduled_at);

create index if not exists social_content_calendar_date_idx
  on public.social_content_calendar (calendar_date, platform);

create table if not exists public.social_post_metrics (
  id uuid primary key default gen_random_uuid(),
  social_post_id uuid references public.social_posts(id) on delete set null,
  platform text not null check (platform in ('facebook', 'instagram', 'x', 'linkedin', 'telegram')),
  metrics_date date not null,
  impressions bigint not null default 0 check (impressions >= 0),
  reactions bigint not null default 0 check (reactions >= 0),
  comments bigint not null default 0 check (comments >= 0),
  shares bigint not null default 0 check (shares >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  reach bigint not null default 0 check (reach >= 0),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, metrics_date)
);

create index if not exists social_post_metrics_date_idx
  on public.social_post_metrics (metrics_date desc, platform);

create table if not exists public.social_strategy_notes (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  best_hours jsonb not null default '{}'::jsonb,
  summary text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start)
);

create index if not exists social_strategy_notes_week_idx
  on public.social_strategy_notes (week_start desc);

alter table public.social_content_calendar enable row level security;
alter table public.social_post_metrics enable row level security;
alter table public.social_strategy_notes enable row level security;

revoke all on table public.social_content_calendar from anon, authenticated;
revoke all on table public.social_post_metrics from anon, authenticated;
revoke all on table public.social_strategy_notes from anon, authenticated;

grant select, insert, update on table public.social_content_calendar to service_role;
grant select, insert, update on table public.social_post_metrics to service_role;
grant select, insert, update on table public.social_strategy_notes to service_role;

comment on table public.social_content_calendar is
  'AI Social Manager daily content calendar: platform x BST hour slots with scheduled UTC instants.';
comment on table public.social_post_metrics is
  'Aggregated cross-platform engagement metrics captured every six hours from Vault-backed APIs.';
comment on table public.social_strategy_notes is
  'Weekly best-hour strategy produced by the AI gateway with a deterministic fallback.';

select cron.unschedule('social-manager-daily')
  where exists (select 1 from cron.job where jobname = 'social-manager-daily');
select cron.unschedule('social-manager-metrics')
  where exists (select 1 from cron.job where jobname = 'social-manager-metrics');
select cron.unschedule('social-manager-weekly')
  where exists (select 1 from cron.job where jobname = 'social-manager-weekly');

select cron.schedule('social-manager-daily', '10 1 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/social/manager',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted = ds.id where v.service_name = 'NEWSROOM_INGEST_KEY' and v.environment = 'prod' and v.is_active = true limit 1), '')
    ),
    body := jsonb_build_object('task', 'daily_plan'),
    timeout_milliseconds := 90000
  );
$$);

select cron.schedule('social-manager-metrics', '20 */6 * * *', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/social/manager',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted = ds.id where v.service_name = 'NEWSROOM_INGEST_KEY' and v.environment = 'prod' and v.is_active = true limit 1), '')
    ),
    body := jsonb_build_object('task', 'metrics'),
    timeout_milliseconds := 90000
  );
$$);

select cron.schedule('social-manager-weekly', '40 1 * * 1', $$
  select net.http_post(
    url := 'https://www.banglarvoice24news.com/api/social/manager',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select ds.decrypted_secret from vault.decrypted_secrets ds join public.api_vault v on v.key_encrypted = ds.id where v.service_name = 'NEWSROOM_INGEST_KEY' and v.environment = 'prod' and v.is_active = true limit 1), '')
    ),
    body := jsonb_build_object('task', 'weekly_strategy'),
    timeout_milliseconds := 90000
  );
$$);
