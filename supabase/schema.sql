-- =============================================================================
-- Banglar Voice — Supabase Backend Schema
-- -----------------------------------------------------------------------------
-- Single source of truth for ONE Supabase project serving:
--   3 Flutter apps (reader, reporter, admin/editorial) + Next.js website + admin console
--
-- Design rules:
--   * Every table has RLS enabled. Server-only tables get service_role GRANT and
--     DENY policies for anon/authenticated. Public-read tables get SELECT USING(true).
--   * Secrets NEVER stored raw: api_vault.key_encrypted holds a pgsodium Vault
--     secret reference (uuid from vault.create_secret). Raw keys are only ever
--     returned by the getApiKey edge function, never by the client.
--   * RTMP keys are never stored raw: live_sessions.rtmp_key_ref references the
--     vault secret id (same pattern as api_vault).
--
-- Apply with:  supabase db push        (after `supabase link`)
--              psql "$DATABASE_URL" -f supabase/schema.sql
-- Safe to run more than once (idempotent constructs only).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Extensions
--    pgsodium is pre-enabled on hosted Supabase (vault schema lives there).
--    On local CLI / self-host, uncomment if not already enabled:
-- ---------------------------------------------------------------------------
-- create extension if not exists pgsodium with schema extensions;
-- create extension if not exists pg_cron;   -- optional: for scheduled AI pipeline

-- =============================================================================
-- 1) ENUMS
-- =============================================================================
do $$ begin
  create type public.app_role as enum (
    'citizen_reporter',   -- Nagorik Sangbadik: needs editor approval before live
    'staff_reporter',     -- verified staff: direct publish request
    'desk_editor',        -- sees pending_review queue, edits articles
    'chief_editor',       -- can approve_for_live / publish
    'admin'               -- full control incl. vault & roles
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum (
    'draft',
    'pending_review',      -- submitted, awaiting desk
    'approved_for_live',   -- editor approved -> feeds breaking/live apps
    'published',
    'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.live_status as enum ('idle','live','ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vault_env as enum ('prod','staging');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 2) TABLES
-- =============================================================================

-- a) profiles --------------------------------------------------------------
-- One row per auth.users. Role drives every RLS decision below.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.app_role not null default 'citizen_reporter',
  district    text not null default '',
  phone       text not null default '',
  verified    boolean not null default false,   -- staff badge / verified reporter
  full_name   text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- b) field_reports ----------------------------------------------------------
-- Citizen & staff reporters submit here. Realtime-enabled so the editorial
-- app and the breaking/live app react instantly to inserts & status changes.
create table if not exists public.field_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  title         text not null default '',
  description   text not null default '',
  media_urls    text[] not null default '{}',      -- Supabase Storage paths in field-media
  location      text not null default '',          -- auto GPS label e.g. 'Ghoraghat, Dinajpur'
  lat           double precision,
  lng           double precision,
  captured_at   timestamptz,                        -- auto timestamp from device
  status        public.report_status not null default 'draft',
  -- AI fields (filled by ai-process-report edge function)
  ai_score      int check (ai_score between 0 and 100),  -- fact-check confidence %
  ai_transcript text not null default '',           -- Whisper -> Bangla text
  ai_summary    text not null default '',           -- 3-bullet AI সারাংশ
  ai_translation_en text not null default '',       -- bn -> en translation of the report
  ai_duplicate_of uuid references public.field_reports(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists field_reports_status_created_idx
  on public.field_reports (status, created_at desc);
create index if not exists field_reports_reporter_idx
  on public.field_reports (reporter_id);

-- c) articles ---------------------------------------------------------------
-- Desk-edited bilingual article promoted from a field report (or written live).
create table if not exists public.articles (
  id               uuid primary key default gen_random_uuid(),
  field_report_id  uuid references public.field_reports(id) on delete set null,
  title_bn         text not null,
  title_en         text not null default '',
  content_bn       text not null default '',
  content_en       text not null default '',
  thumbnail_url    text not null default '',
  category         text not null default 'national',
  status           text not null default 'draft'
                   check (status in ('draft','scheduled','published','archived')),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc);

-- d) live_sessions ----------------------------------------------------------
-- rtmp_key_ref is a pgsodium Vault secret id — NEVER the raw RTMP key.
create table if not exists public.live_sessions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default '',
  rtmp_key_ref  uuid,                             -- vault secret ref (server-only)
  stream_url    text not null default '',        -- public HLS/embed after start
  status        public.live_status not null default 'idle',
  viewer_count  int not null default 0,
  started_by    uuid references auth.users(id) on delete set null,
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- e) breaking_ticker ---------------------------------------------------------
-- Single-row feed for the website header marquee. The Next.js frontend fetches
-- this row (NOT a hardcoded string). Editors update via the admin console.
create table if not exists public.breaking_ticker (
  id         int primary key default 1 check (id = 1),  -- singleton row
  text_bn    text not null default 'এআই অটোমেশন এর মাধ্যমে পরিচালিত বাংলার ভয়েস এর পরীক্ষামূলক সম্প্রচার চলছে।',
  is_active  boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.breaking_ticker (id, text_bn, is_active)
values (1, 'এআই অটোমেশন এর মাধ্যমে পরিচালিত বাংলার ভয়েস এর পরীক্ষামূলক সম্প্রচার চলছে।', true)
on conflict (id) do nothing;

-- f) api_vault ---------------------------------------------------------------
-- Encrypted third-party keys. key_encrypted stores the pgsodium Vault secret id
-- (uuid), NOT ciphertext inline — so raw keys never touch this table and can be
-- rotated by writing a new vault secret without a schema change.
-- Only the getApiKey edge function (service_role) may decrypt.
create table if not exists public.api_vault (
  id            uuid primary key default gen_random_uuid(),
  service_name  text not null,               -- e.g. 'OPENAI_API_KEY','ELEVENLABS_API_KEY','ONESIGNAL_REST_KEY'
  key_encrypted uuid,                        -- vault secret ref (see vault.create_secret)
  environment   public.vault_env not null default 'prod',
  is_active     boolean not null default true,
  last_tested   timestamptz,
  usage_percent int not null default 0 check (usage_percent between 0 and 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (service_name, environment)
);
create index if not exists api_vault_service_idx on public.api_vault (service_name);

-- g) notifications -----------------------------------------------------------
-- In-app push (breaking, approved_for_live, comment, subscription).
-- FCM delivery handled OUTSIDE Supabase (see README) using a vault-stored key.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  type       text not null default 'breaking'
             check (type in ('breaking','approved_for_live','comment','report_status','subscription')),
  payload    jsonb not null default '{}',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_read_idx
  on public.notifications (user_id, is_read, created_at desc);

-- =============================================================================
-- 3) GRANTS  (explicit; default Supabase grants nothing to anon/authenticated)
-- =============================================================================
grant usage on schema public to anon, authenticated;
grant all on public.profiles, public.field_reports, public.articles,
  public.live_sessions, public.breaking_ticker, public.api_vault,
  public.notifications to service_role;

-- Public / reader (anon) — only articles, ticker, live-session meta (RLS filters rows)
grant select on public.articles, public.breaking_ticker, public.live_sessions to anon, authenticated;

-- Authenticated client app roles (RLS below enforces per-row rules)
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.field_reports to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select on public.api_vault to authenticated;   -- shape only; no policies -> 0 rows

-- =============================================================================
-- 4) ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles        enable row level security;
alter table public.field_reports   enable row level security;
alter table public.articles        enable row level security;
alter table public.live_sessions   enable row level security;
alter table public.breaking_ticker enable row level security;
alter table public.api_vault       enable row level security;
alter table public.notifications   enable row level security;

-- --- helper: current user's app role (NULL if not in profiles yet) ----------
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- --- profiles ----------------------------------------------------------------
-- Everyone reads own row; editorial & admin read all (staff directory, badges).
create policy "profiles read own or editorial"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() in ('staff_reporter','desk_editor','chief_editor','admin')
);

-- Row auto-created by trigger on signup; users may update their own public fields
-- (never their own role — role changes are admin-only via a separate RPC).
create policy "profiles update own fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select role from public.profiles where id = auth.uid())
);

-- --- field_reports -------------------------------------------------------------
-- INSERT: a reporter can only file for themselves.
create policy "reporters insert own report"
on public.field_reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and public.current_app_role() in ('citizen_reporter','staff_reporter')
);

-- SELECT: owner always; staff/editorial see everything; published visible to all auth.
create policy "report owner or staff or published"
on public.field_reports for select
to authenticated
using (
  reporter_id = auth.uid()
  or public.current_app_role() in ('staff_reporter','desk_editor','chief_editor','admin')
  or status = 'published'
);

-- UPDATE:
--   * owner may edit while draft (e.g. add media before submit)
--   * editorial/admin may transition status (pending_review -> approved_for_live)
create policy "owner edits own draft"
on public.field_reports for update
to authenticated
using (reporter_id = auth.uid() and status = 'draft')
with check (reporter_id = auth.uid() and status = 'draft');

create policy "editorial updates status"
on public.field_reports for update
to authenticated
using (public.current_app_role() in ('desk_editor','chief_editor','admin'))
with check (public.current_app_role() in ('desk_editor','chief_editor','admin'));

-- DELETE: owner may delete a draft; admins may delete anything.
create policy "owner deletes own draft"
on public.field_reports for delete
to authenticated
using (reporter_id = auth.uid() and status = 'draft');
create policy "admin deletes any report"
on public.field_reports for delete
to authenticated
using (public.current_app_role() = 'admin');

-- --- articles ------------------------------------------------------------------
-- Desk & above write; everyone (incl. anon) reads published.
create policy "public read published articles"
on public.articles for select
using (status = 'published');

create policy "editorial insert articles"
on public.articles for insert
to authenticated
with check (public.current_app_role() in ('desk_editor','chief_editor','admin'));

create policy "editorial update articles"
on public.articles for update
to authenticated
using (public.current_app_role() in ('desk_editor','chief_editor','admin'));

-- --- live_sessions -------------------------------------------------------------
create policy "public read live sessions"
on public.live_sessions for select
using (status <> 'ended' or status = 'live');   -- ended sessions hidden from readers

create policy "editorial manage live sessions"
on public.live_sessions for all
to authenticated
using (public.current_app_role() in ('desk_editor','chief_editor','admin'))
with check (public.current_app_role() in ('desk_editor','chief_editor','admin'));

-- --- breaking_ticker -------------------------------------------------------------
create policy "public read active ticker"
on public.breaking_ticker for select
using (is_active = true);

create policy "admin update ticker"
on public.breaking_ticker for update
to authenticated
using (public.current_app_role() = 'admin');

-- --- api_vault ---------------------------------------------------------------------
-- No policies for anon/authenticated => zero rows reach any client.
-- The getApiKey edge function uses service_role (bypasses RLS) to decrypt.
create policy "deny all api_vault clients"
on public.api_vault for all
to anon, authenticated
using (false)
with check (false);

-- --- notifications ---------------------------------------------------------------
create policy "user reads own notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "service inserts notifications"
on public.notifications for insert
to service_role
with check (true);

create policy "user marks own read"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =============================================================================
-- 5) TRIGGERS
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at        on public.profiles;
drop trigger if exists field_reports_updated_at   on public.field_reports;
drop trigger if exists articles_updated_at        on public.articles;
drop trigger if exists live_sessions_updated_at   on public.live_sessions;
drop trigger if exists breaking_ticker_updated_at on public.breaking_ticker;
drop trigger if exists api_vault_updated_at       on public.api_vault;

create trigger profiles_updated_at        before update on public.profiles        for each row execute function public.set_updated_at();
create trigger field_reports_updated_at   before update on public.field_reports   for each row execute function public.set_updated_at();
create trigger articles_updated_at        before update on public.articles        for each row execute function public.set_updated_at();
create trigger live_sessions_updated_at   before update on public.live_sessions   for each row execute function public.set_updated_at();
create trigger breaking_ticker_updated_at before update on public.breaking_ticker for each row execute function public.set_updated_at();
create trigger api_vault_updated_at       before update on public.api_vault       for each row execute function public.set_updated_at();

-- Auto-create a profile row on signup (default citizen_reporter).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 6) REALTIME
--   field_reports: reporter INSERT -> editorial app board updates live.
--                  status -> 'approved_for_live' -> breaking/live app reacts.
--   breaking_ticker: ticker change -> every website header updates live.
-- =============================================================================
-- (alter publication works on hosted Supabase; on local CLI the publication is
--  created by `supabase start` — these statements are idempotent-ish and safe.)
do $$ begin
  alter publication supabase_realtime add table public.field_reports;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.breaking_ticker;
exception when duplicate_object then null; end $$;

-- Ensure replica identity sends full rows on UPDATE (so editors see new status)
alter table public.field_reports replica identity full;

-- =============================================================================
-- 7) HELPER RPCS
-- =============================================================================

-- Admin: set breaking ticker text (also usable by the AI automation webhook).
create or replace function public.set_breaking_ticker(p_text text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.breaking_ticker set text_bn = p_text, is_active = true where id = 1;
  return found;
end $$;

-- Admin: change a user's role (no direct profile UPDATE can change role).
create or replace function public.set_user_role(p_user_id uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'only admin can change roles';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end $$;

-- Reporter: move own draft -> pending_review (submit).
create or replace function public.submit_field_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.field_reports
     where id = p_report_id and reporter_id = auth.uid() and status = 'draft'
  ) then
    raise exception 'report not found or not in draft';
  end if;
  update public.field_reports
     set status = 'pending_review', updated_at = now()
   where id = p_report_id;
end $$;

-- Decrypt one api_vault secret for the getApiKey / ai-process-report edge
-- functions (security definer so only service_role callers can use it; the
-- vault.decrypted_secrets view requires the pgsodium key-holder role).
create or replace function public.decrypt_vault_secret(p_secret_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_plain text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  select decrypted_secret into v_plain
    from vault.decrypted_secrets
   where id = p_secret_id
   limit 1;
  return v_plain;
exception
  when others then return null;   -- secret missing or key not mounted
end $$;

-- =============================================================================
-- 8) COMMENTS
-- =============================================================================
comment on table public.field_reports is 'Reporter submissions; Realtime-enabled. Status approved_for_live feeds breaking/live apps.';
comment on table public.api_vault is 'Encrypted 3rd-party keys. key_encrypted = pgsodium vault secret id. Decrypt ONLY via getApiKey edge fn.';
comment on table public.live_sessions is 'Live TV sessions. rtmp_key_ref is a vault secret id — raw RTMP key never stored.';
comment on table public.breaking_ticker is 'Singleton row feeding the website header marquee.';
