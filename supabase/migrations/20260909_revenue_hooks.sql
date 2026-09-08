-- =============================================================================
-- revenue.sql — Revenue hooks: subscriptions + ads tables with RLS.
-- Part of the Banglar Voice monetization plan (AdSense, sponsored, membership,
-- newsletter, affiliate). Idempotent — safe to run repeatedly.
-- =============================================================================

-- --- subscriptions -----------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','premium','team')),
  status text not null default 'active' check (status in ('active','past_due','canceled','expired')),
  amount_bdt numeric(10,2) not null default 0,
  interval text not null default 'monthly' check (interval in ('monthly','yearly')),
  provider text not null default 'bkash' check (provider in ('bkash','nagad','stripe','manual')),
  provider_ref text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx
  on public.subscriptions (user_id, status, expires_at desc);

-- -----------------------------------------------------------------------------
-- ads — programmatic + sponsored placements. placement_key mirrors the
-- frontend ad slots (header / sidebar / in_article / homepage_top).
-- -----------------------------------------------------------------------------
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null check (placement_key in ('header','sidebar','in_article','homepage_top')),
  title text not null,
  image_url text,
  link_url text,
  html_code text,               -- raw ad snippet (AdSense / sponsored)
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  revenue_bdt numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ads_placement_idx
  on public.ads (placement_key, is_active);

-- ---------------------------------------------------------------------------
-- RLS ------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;
alter table public.ads enable row level security;

-- Subscriptions: user reads/writes own row; service_role manages all.
create policy "user reads own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "user updates own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id);

create policy "service manages subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Ads: everyone (incl. anon) reads active ads; only service_role writes.
create policy "anyone reads active ads"
  on public.ads for select
  using (is_active = true or auth.role() = 'service_role');

create policy "service manages ads"
  on public.ads for all
  using (auth.role() = 'service_role');

-- Grants
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;
grant select on public.ads to anon, authenticated;
grant all on public.ads to service_role;

-- ---------------------------------------------------------------------------
-- reading_history — metered paywall counter (one row per user+article).
-- ---------------------------------------------------------------------------
create table if not exists public.reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid,
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  last_read_at timestamptz not null default now(),
  unique (user_id, article_id)
);

alter table public.reading_history enable row level security;

create policy "user reads own reading history"
  on public.reading_history for select
  using (auth.uid() = user_id);

create policy "user writes own reading history"
  on public.reading_history for insert
  with check (auth.uid() = user_id);

create policy "service manages reading history"
  on public.reading_history for all
  using (auth.role() = 'service_role');

grant select, insert, update, delete on public.reading_history to authenticated;
grant all on public.reading_history to service_role;

-- ---------------------------------------------------------------------------
-- Revenue hook: keep updated_at fresh on subscription changes. Membership
-- gating (premium/team) is read from the subscriptions table by the frontend
-- and by the paywall edge function — the app_role enum is left untouched.
-- ---------------------------------------------------------------------------
create or replace function public.on_subscription_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_subscription_created on public.subscriptions;
create trigger trg_subscription_created
  after insert on public.subscriptions
  for each row execute function public.on_subscription_created();