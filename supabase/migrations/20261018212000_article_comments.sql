begin;

create schema if not exists private;

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  display_name text not null check (
    display_name = btrim(display_name, E' \t\n\r')
    and char_length(display_name) between 2 and 60
    and display_name ~ '[^[:space:]]'
    and display_name !~ '[[:cntrl:]]'
  ),
  body text not null check (
    body = btrim(body, E' \t\n\r')
    and char_length(body) between 3 and 2000
    and body ~ '[^[:space:]]'
    and translate(body, E'\n\t', '') !~ '[[:cntrl:]]'
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null,
  constraint article_comments_moderation_metadata_consistent
    check (
      (status = 'pending' and moderated_at is null and moderated_by is null)
      or (status in ('approved', 'rejected') and moderated_at is not null)
    )
);

create index if not exists article_comments_article_status_created_idx
  on public.article_comments (article_id, status, created_at desc);

alter table public.article_comments enable row level security;

-- The private ledger enforces the same IP rate limit for every direct Data API
-- insert, not only requests passing through a frontend route. It stores only a
-- deterministic 64-bit pseudonymous key, never the raw client IP; expired rows
-- are pruned on a later successful submission.
create table if not exists private.article_comment_rate_limits (
  client_key bigint not null,
  occurred_at timestamptz not null default clock_timestamp()
);

create index if not exists article_comment_rate_limits_key_time_idx
  on private.article_comment_rate_limits (client_key, occurred_at desc);

revoke all on table private.article_comment_rate_limits from public, anon, authenticated, service_role;

create or replace function private.enforce_article_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_headers jsonb;
  v_ip inet;
  v_ip_hash bigint;
  v_count integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  -- Trusted service-role maintenance is not a public submission path.
  if auth.role() = 'service_role' then
    return new;
  end if;

  begin
    v_headers := nullif(pg_catalog.current_setting('request.headers', true), '')::jsonb;
    v_ip := nullif(
      pg_catalog.btrim(
        pg_catalog.split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)
      ),
      ''
    )::inet;
  exception when others then
    raise exception 'comment_rate_limit_ip_unavailable' using errcode = 'P0001';
  end;

  if v_ip is null then
    raise exception 'comment_rate_limit_ip_unavailable' using errcode = 'P0001';
  end if;

  -- Serialize submissions for a single IP so concurrent requests cannot race
  -- past the 3-per-10-minute limit.
  v_ip_hash := pg_catalog.hashtextextended(v_ip::text, 0);
  perform pg_catalog.pg_advisory_xact_lock(v_ip_hash);

  delete from private.article_comment_rate_limits
  where occurred_at < v_now - interval '10 minutes';

  select count(*)::integer
    into v_count
    from private.article_comment_rate_limits
    where client_key = v_ip_hash
      and occurred_at >= v_now - interval '10 minutes';

  if v_count >= 3 then
    raise exception 'comment_rate_limit_exceeded' using errcode = 'P0001';
  end if;

  insert into private.article_comment_rate_limits (client_key, occurred_at)
  values (v_ip_hash, v_now);

  return new;
end;
$function$;

revoke all on function private.enforce_article_comment_rate_limit() from public, anon, authenticated, service_role;

drop trigger if exists article_comments_rate_limit_before_insert on public.article_comments;
create trigger article_comments_rate_limit_before_insert
  before insert on public.article_comments
  for each row execute function private.enforce_article_comment_rate_limit();

create or replace function private.set_article_comment_moderation_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status is distinct from old.status then
    if old.status <> 'pending' or new.status not in ('approved', 'rejected') then
      raise exception 'invalid_comment_moderation_transition' using errcode = 'P0001';
    end if;

    if auth.uid() is null then
      raise exception 'comment_moderation_requires_authenticated_editor' using errcode = 'P0001';
    end if;

    -- Never trust client-supplied actor or timestamp values.
    new.moderated_by := auth.uid();
    new.moderated_at := pg_catalog.clock_timestamp();
  elsif new.moderated_at is distinct from old.moderated_at
     or new.moderated_by is distinct from old.moderated_by then
    raise exception 'comment_moderation_metadata_is_server_managed' using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

revoke all on function private.set_article_comment_moderation_metadata() from public, anon, authenticated, service_role;

drop trigger if exists article_comments_moderation_metadata_before_update on public.article_comments;
create trigger article_comments_moderation_metadata_before_update
  before update on public.article_comments
  for each row execute function private.set_article_comment_moderation_metadata();

grant select (id, article_id, display_name, body, status, created_at)
  on table public.article_comments to anon, authenticated;
grant insert (article_id, display_name, body)
  on table public.article_comments to anon, authenticated;
grant update (status, moderated_at, moderated_by)
  on table public.article_comments to authenticated;
grant delete on table public.article_comments to authenticated;

drop policy if exists article_comments_read_approved on public.article_comments;
  create policy article_comments_read_approved
  on public.article_comments
  for select
  to anon, authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.articles as a
      where a.id = article_comments.article_id
        and a.status = 'published'
    )
  );

drop policy if exists article_comments_editor_read_all on public.article_comments;
  create policy article_comments_editor_read_all
  on public.article_comments
  for select
  to authenticated
  using (public.current_app_role()::text = any (array['desk_editor', 'chief_editor', 'admin']));

drop policy if exists article_comments_insert_pending_for_published on public.article_comments;
  create policy article_comments_insert_pending_for_published
  on public.article_comments
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and moderated_at is null
    and moderated_by is null
    and exists (
      select 1
      from public.articles as a
      where a.id = article_comments.article_id
        and a.status = 'published'
    )
  );

drop policy if exists article_comments_editor_moderate on public.article_comments;
  create policy article_comments_editor_moderate
  on public.article_comments
  for update
  to authenticated
  using (public.current_app_role()::text = any (array['desk_editor', 'chief_editor', 'admin']))
  with check (
    public.current_app_role()::text = any (array['desk_editor', 'chief_editor', 'admin'])
    and (
      (status = 'pending' and moderated_at is null and moderated_by is null)
      or (status in ('approved', 'rejected') and moderated_at is not null and moderated_by = auth.uid())
    )
  );

drop policy if exists article_comments_editor_delete on public.article_comments;
  create policy article_comments_editor_delete
  on public.article_comments
  for delete
  to authenticated
  using (public.current_app_role()::text = any (array['desk_editor', 'chief_editor', 'admin']));

comment on table public.article_comments is
  'Public article comments; submissions remain pending until an editorial role approves them.';

comment on table private.article_comment_rate_limits is
  'Pseudonymous per-IP rate-limit keys for article comment submissions; raw IPs are not persisted and expired entries are pruned on submission.';

commit;
