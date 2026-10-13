-- Phase 1 — Social Dispatch readiness registry.
--
-- A single source of truth that answers "is this platform actually ready to
-- receive a post right now?". Dispatch and every enqueue site read the
-- `social_platform_readiness` view and fail closed: if a platform is not ready
-- (disabled, secret names unverified, or a required Vault secret missing) no
-- social_posts row is created and nothing is published for it.
--
-- Secret *names* live here (never values). Values stay in Supabase Vault via
-- public.api_vault -> vault.decrypted_secrets and are only reachable by the
-- service_role worker.

begin;

-- ---------------------------------------------------------------------------
-- Registry table
-- ---------------------------------------------------------------------------
create table if not exists public.social_platforms (
  platform          text primary key
                    check (platform in ('facebook','instagram','x','linkedin','telegram','tiktok','youtube')),
  display_name      text not null,
  -- Master switch. A disabled platform is never enqueued or dispatched.
  is_enabled        boolean not null default false,
  -- Exact api_vault.service_name values this platform needs (names only).
  required_secrets  text[] not null default '{}',
  -- Set true only after the names above are confirmed to match the names the
  -- dispatch worker actually reads from Vault. Prevents typos silently
  -- turning a platform "ready" against the wrong secret.
  names_verified    boolean not null default false,
  -- Optional safety rails enforced by the dispatcher.
  daily_post_limit  integer check (daily_post_limit is null or daily_post_limit > 0),
  min_gap_minutes   integer not null default 0 check (min_gap_minutes >= 0),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists social_platforms_updated_at on public.social_platforms;
create trigger social_platforms_updated_at
  before update on public.social_platforms
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Readiness view
-- is_ready = enabled AND names verified AND every required secret present in
-- prod Vault (active, with a real secod ref). security_invoker keeps the view
-- subject to the caller's privileges; only service_role is granted access.
-- ---------------------------------------------------------------------------
create or replace view public.social_platform_readiness
with (security_invoker = true) as
select
  p.platform,
  p.display_name,
  p.is_enabled,
  p.names_verified,
  p.required_secrets,
  coalesce(v.present_count, 0) as present_secret_count,
  coalesce(array_length(p.required_secrets, 1), 0) as required_secret_count,
  (
    p.is_enabled
    and p.names_verified
    and coalesce(v.present_count, 0) >= coalesce(array_length(p.required_secrets, 1), 0)
  ) as is_ready,
  p.daily_post_limit,
  p.min_gap_minutes,
  p.updated_at
from public.social_platforms p
left join lateral (
  select count(*)::int as present_count
  from public.api_vault av
  where av.service_name = any (p.required_secrets)
    and av.environment = 'prod'
    and av.is_active = true
    and av.key_encrypted is not null
) v on true;

-- ---------------------------------------------------------------------------
-- Privileges: server-side service_role only. No anon/authenticated access.
-- ---------------------------------------------------------------------------
alter table public.social_platforms enable row level security;

revoke all on table public.social_platforms from anon, authenticated;
revoke all on table public.social_platform_readiness from anon, authenticated;
grant select, insert, update on table public.social_platforms to service_role;
grant select on table public.social_platform_readiness to service_role;

comment on table public.social_platforms is
  'Phase 1 readiness registry: per-platform enable switch, required Vault secret names and dispatch safety rails.';
comment on view public.social_platform_readiness is
  'Computed readiness per platform: enabled + names_verified + all required prod Vault secrets present.';

-- ---------------------------------------------------------------------------
-- Seed the current code names. names_verified is true because these names are
-- the exact strings the dispatch worker passes to vaultSecret() in this PR.
-- Secrets are NOT created here; a platform stays not-ready until its Vault
-- entries exist, which is the intended fail-closed behaviour.
-- ---------------------------------------------------------------------------
insert into public.social_platforms
  (platform, display_name, is_enabled, required_secrets, names_verified, daily_post_limit, min_gap_minutes, notes)
values
  ('facebook', 'Facebook Page', true,
   array['SOCIAL_FACEBOOK_PAGE_ID','SOCIAL_FACEBOOK_PAGE_TOKEN'], true, 30, 30,
   'Caption capped at 450 chars; article link is posted as the first comment.'),
  ('instagram', 'Instagram Business', true,
   array['SOCIAL_INSTAGRAM_BUSINESS_ACCOUNT_ID','SOCIAL_INSTAGRAM_ACCESS_TOKEN'], true, 8, 60,
   'Requires a public https image; caption capped at 2200 chars; link lives in bio.'),
  ('x', 'X (Twitter)', true,
   array['SOCIAL_X_ACCESS_TOKEN'], true, 30, 30,
   'Link is appended to the tweet text.'),
  ('linkedin', 'LinkedIn Organization', true,
   array['SOCIAL_LINKEDIN_ACCESS_TOKEN','SOCIAL_LINKEDIN_ORGANIZATION_ID'], true, 10, 60,
   'Article shared with rich link preview.'),
  ('telegram', 'Telegram Channel', true,
   array['SOCIAL_TELEGRAM_BOT_TOKEN','SOCIAL_TELEGRAM_CHANNEL_ID'], true, 50, 10,
   'Photo card with caption; card is where the article link is embedded for Telegram.'),
  ('tiktok', 'TikTok', false,
   array['SOCIAL_TIKTOK_ACCESS_TOKEN'], false, null, 0,
   'Disabled stub for Phase 1; dispatch skips with tiktok_not_configured.')
on conflict (platform) do update set
  display_name     = excluded.display_name,
  required_secrets = excluded.required_secrets,
  daily_post_limit = excluded.daily_post_limit,
  min_gap_minutes  = excluded.min_gap_minutes,
  notes            = excluded.notes,
  updated_at       = now();

commit;
