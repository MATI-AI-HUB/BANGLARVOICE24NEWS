-- Atomically lease social queue rows to the existing dispatcher. This keeps one
-- canonical publisher and avoids concurrent cron invocations posting the same row.
-- Expired claims can be retried after a worker crash; provider-side exactly-once
-- delivery still depends on each provider's own idempotency support.

alter table public.social_posts
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz;

create index if not exists social_posts_dispatch_claim_idx
  on public.social_posts (status, created_at, updated_at)
  where status in ('pending', 'failed');

create or replace function public.claim_social_posts(
  p_platforms text[],
  p_limit integer,
  p_lease_seconds integer
)
returns table (
  id uuid,
  article_id uuid,
  platform text,
  attempt_count integer,
  claim_token uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 40 then
    raise exception 'p_limit must be between 1 and 40';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 120 or p_lease_seconds > 3600 then
    raise exception 'p_lease_seconds must be between 120 and 3600';
  end if;
  if p_platforms is null or cardinality(p_platforms) = 0 then
    return;
  end if;

  return query
  with candidates as (
    select post.id
    from public.social_posts as post
    where post.platform = any (p_platforms)
      and (
        post.status = 'pending'
        or (post.status = 'failed' and post.attempt_count < 5)
      )
      and (
        post.claim_token is null
        or post.claimed_at < clock_timestamp() - make_interval(secs => p_lease_seconds)
      )
    order by
      case when post.status = 'pending' then post.created_at else post.updated_at end,
      post.created_at
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.social_posts as post
    set claim_token = gen_random_uuid(),
        claimed_at = clock_timestamp()
    from candidates
    where post.id = candidates.id
    returning post.id, post.article_id, post.platform, post.attempt_count, post.claim_token
  )
  select claimed.id, claimed.article_id, claimed.platform, claimed.attempt_count, claimed.claim_token
  from claimed;
end;
$$;

revoke all on function public.claim_social_posts(text[], integer, integer) from public;
revoke all on function public.claim_social_posts(text[], integer, integer) from anon, authenticated;
grant execute on function public.claim_social_posts(text[], integer, integer) to service_role;

comment on function public.claim_social_posts(text[], integer, integer) is
  'Service-role-only atomic lease for eligible social_posts rows; caller must release the matching claim_token when finishing.';
