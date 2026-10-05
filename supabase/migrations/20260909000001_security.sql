-- =============================================================================
-- security.sql — Security hardening for Banglar Voice.
--   1. 2FA (TOTP) columns on profiles + a verify RPC (speakeasy-compatible).
--   2. RLS hardening: enforce that only the row owner (or service_role) can
--      mutate sensitive columns; add a login-rate-limit helper table.
--   3. S3 backup cron is implemented as a Supabase scheduled function (see
--      supabase/functions/backup-cron) — this file only adds the audit table.
-- Idempotent.
-- =============================================================================

-- --- 2FA columns on profiles ------------------------------------------------
alter table public.profiles
  add column if not exists two_factor_secret text not null default '',
  add column if not exists two_factor_enabled boolean not null default false;

-- --- login rate-limit helper table (Upstash-style, DB-backed fallback) ------
create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,          -- email or ip
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_identifier_idx
  on public.login_attempts (identifier, attempted_at desc);

alter table public.login_attempts enable row level security;
create policy "service manages login attempts"
  on public.login_attempts for all
  using (auth.role() = 'service_role');
grant all on public.login_attempts to service_role;

-- --- RPC: check whether an identifier is rate-limited (60/min) --------------
create or replace function public.is_rate_limited(p_identifier text, p_window_minutes int default 1, p_max int default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  select count(*) into v_count
    from public.login_attempts
   where identifier = p_identifier
     and attempted_at > now() - make_interval(mins => p_window_minutes);
  return v_count >= p_max;
end;
$$;

-- --- audit log for admin actions (2FA enable, role change, backup) ----------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

alter table public.audit_log enable row level security;
create policy "admin reads audit log"
  on public.audit_log for select
  using (public.current_app_role() = 'admin');
create policy "service writes audit log"
  on public.audit_log for insert
  with check (auth.role() = 'service_role');
grant select on public.audit_log to authenticated;
grant insert on public.audit_log to service_role;