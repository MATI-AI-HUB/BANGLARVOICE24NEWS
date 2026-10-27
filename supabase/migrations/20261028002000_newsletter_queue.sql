-- Newsletter async queue. This migration is additive and must be applied only
-- after verifying pgmq availability and configuring the Resend secret.
create schema if not exists pgmq;
create extension if not exists pgmq with schema pgmq;

do $$
begin
  if not exists (select 1 from pgmq.meta where queue_name = 'newsletter_queue') then
    perform pgmq.create('newsletter_queue');
  end if;
end;
$$;

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;
grant all on public.subscribers to service_role;

create or replace function public.subscribe_and_queue_newsletter(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pgmq
as $$
declare
  v_id uuid;
  v_status text;
  v_message_id bigint;
begin
  if p_email is null or length(p_email) > 254 or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email';
  end if;

  insert into public.subscribers(email, status)
  values (lower(trim(p_email)), 'active')
  on conflict (email) do update
    set status = 'active', updated_at = now()
    where public.subscribers.status = 'unsubscribed'
  returning id, status into v_id, v_status;

  if v_id is null then
    select id, status into v_id, v_status
    from public.subscribers where email = lower(trim(p_email));
  else
    v_message_id := pgmq.send(
      'newsletter_queue',
      jsonb_build_object('subscriber_id', v_id, 'email', lower(trim(p_email)))
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'queued', v_message_id is not null,
    'already_active', v_message_id is null,
    'subscriber_id', v_id
  );
end;
$$;

create or replace function public.read_newsletter_queue(p_visibility_seconds integer default 60, p_batch integer default 10)
returns table(msg_id bigint, message jsonb, read_ct integer)
language sql
security definer
set search_path = pg_catalog, public, pgmq
as $$
  select q.msg_id, q.message, q.read_ct
  from pgmq.read('newsletter_queue', greatest(1, least(p_visibility_seconds, 3600)), greatest(1, least(p_batch, 50))) as q;
$$;

create or replace function public.archive_newsletter_message(p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, pgmq
as $$ select pgmq.archive('newsletter_queue', p_msg_id); $$;

create or replace function public.defer_newsletter_message(p_msg_id bigint, p_seconds integer)
returns void
language sql
security definer
set search_path = pg_catalog, public, pgmq
as $$ select pgmq.set_vt('newsletter_queue', p_msg_id, greatest(5, least(p_seconds, 86400))); $$;

revoke all on function public.subscribe_and_queue_newsletter(text) from public, anon, authenticated;
revoke all on function public.read_newsletter_queue(integer, integer) from public, anon, authenticated;
revoke all on function public.archive_newsletter_message(bigint) from public, anon, authenticated;
revoke all on function public.defer_newsletter_message(bigint, integer) from public, anon, authenticated;
grant execute on function public.subscribe_and_queue_newsletter(text) to service_role;
grant execute on function public.read_newsletter_queue(integer, integer) to service_role;
grant execute on function public.archive_newsletter_message(bigint) to service_role;
grant execute on function public.defer_newsletter_message(bigint, integer) to service_role;
