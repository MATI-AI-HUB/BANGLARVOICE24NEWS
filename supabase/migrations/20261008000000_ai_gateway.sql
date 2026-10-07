-- Central AI Gateway state. Provider secrets remain in Supabase Vault via api_vault.key_encrypted.
-- This migration stores only metadata, health state, budgets, and audit information.

create table if not exists public.ai_gateway_key_state (
  api_vault_id uuid primary key references public.api_vault(id) on delete cascade,
  provider text not null check (provider in ('openrouter', 'groq', 'ollama')),
  account_label text not null,
  priority integer not null default 100 check (priority between 0 and 10000),
  model text,
  base_url text,
  monthly_budget_units bigint,
  is_enabled boolean not null default true,
  state text not null default 'healthy' check (state in ('healthy', 'degraded', 'quarantined')),
  failure_count integer not null default 0 check (failure_count >= 0),
  cooldown_until timestamptz,
  last_probe_at timestamptz,
  last_success_at timestamptz,
  last_failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_gateway_key_state_route_idx
  on public.ai_gateway_key_state(provider, is_enabled, state, priority, cooldown_until);

create table if not exists public.ai_gateway_policies (
  task text primary key,
  max_tokens integer not null check (max_tokens between 64 and 8000),
  max_prompt_chars integer not null check (max_prompt_chars between 1000 and 100000),
  max_concurrency integer not null default 2 check (max_concurrency between 1 and 100),
  daily_request_limit integer,
  cache_seconds integer not null default 0 check (cache_seconds between 0 and 86400),
  updated_at timestamptz not null default now()
);

insert into public.ai_gateway_policies(task, max_tokens, max_prompt_chars, max_concurrency, daily_request_limit, cache_seconds)
values
  ('learning_hub', 1200, 24000, 8, 10000, 120),
  ('news_rewrite', 1800, 32000, 2, 3000, 0),
  ('news_classify', 500, 12000, 4, 10000, 0),
  ('tts_script', 900, 12000, 4, 5000, 300),
  ('video_script', 1400, 24000, 2, 1000, 0),
  ('default', 1000, 16000, 2, 5000, 0)
on conflict (task) do nothing;

create table if not exists public.ai_gateway_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null,
  task text not null,
  provider text not null,
  api_vault_id uuid references public.api_vault(id) on delete set null,
  account_label text,
  model text,
  status_code integer,
  outcome text not null check (outcome in ('success', 'provider_error', 'timeout', 'invalid_request', 'rejected')),
  latency_ms integer,
  input_chars integer,
  output_chars integer,
  error_code text,
  tenant_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ai_gateway_usage_created_idx
  on public.ai_gateway_usage_events(created_at desc);
create index if not exists ai_gateway_usage_request_idx
  on public.ai_gateway_usage_events(request_id);
create index if not exists ai_gateway_usage_tenant_idx
  on public.ai_gateway_usage_events(tenant_id, created_at desc);

alter table public.ai_gateway_key_state enable row level security;
alter table public.ai_gateway_policies enable row level security;
alter table public.ai_gateway_usage_events enable row level security;

revoke all on public.ai_gateway_key_state from anon, authenticated;
revoke all on public.ai_gateway_policies from anon, authenticated;
revoke all on public.ai_gateway_usage_events from anon, authenticated;
grant all on public.ai_gateway_key_state to service_role;
grant all on public.ai_gateway_policies to service_role;
grant all on public.ai_gateway_usage_events to service_role;

comment on table public.ai_gateway_key_state is 'Metadata and circuit-breaker state for Vault-backed AI provider credentials; plaintext keys never stored here.';
comment on table public.ai_gateway_usage_events is 'Server-side AI Gateway audit events; never store provider secrets or full prompts.';
