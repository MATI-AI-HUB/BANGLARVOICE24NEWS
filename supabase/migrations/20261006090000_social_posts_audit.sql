-- Durable social publishing audit and idempotency ledger.
-- Service-role worker writes rows; public clients never receive credentials.
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'x', 'linkedin', 'telegram', 'youtube')),
  status text not null check (status in ('pending', 'published', 'failed', 'skipped')),
  external_post_id text,
  error_message text,
  attempt_count integer not null default 1 check (attempt_count > 0),
  payload jsonb not null default '{}'::jsonb,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, platform)
);

create index if not exists social_posts_platform_status_idx
  on public.social_posts (platform, status, updated_at desc);

create index if not exists social_posts_article_idx
  on public.social_posts (article_id, updated_at desc);

alter table public.social_posts enable row level security;

revoke all on table public.social_posts from anon, authenticated;
grant select, insert, update on table public.social_posts to service_role;

comment on table public.social_posts is
  'Idempotent audit ledger for article distribution to external social platforms.';
