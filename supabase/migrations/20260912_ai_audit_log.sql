-- supabase/migrations/20260912_ai_audit_log.sql
-- Tracks AI API usage, costs, and latency for the admin dashboard

create table if not exists public.ai_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  model text not null,
  provider text not null,
  prompt_version text,
  input_tokens int default 0,
  output_tokens int default 0,
  cost_usd numeric(10,6) default 0,
  latency_ms int default 0,
  status text default 'success' check (status in ('success', 'error')),
  error_message text,
  created_at timestamptz default now()
);

-- Index for fast dashboard queries (recent logs first)
create index if not exists ai_audit_log_created_at_idx on public.ai_audit_log(created_at desc);
create index if not exists ai_audit_log_user_id_idx on public.ai_audit_log(user_id);

-- RLS: Only newsroom staff and admins can view cost logs
alter table public.ai_audit_log enable row level security;

create policy "Staff and admins can view ai_audit_log" 
  on public.ai_audit_log for select 
  using (public.current_app_role() in ('desk_editor','chief_editor','admin'));

-- Service role (worker) can insert logs
grant insert on public.ai_audit_log to service_role;
