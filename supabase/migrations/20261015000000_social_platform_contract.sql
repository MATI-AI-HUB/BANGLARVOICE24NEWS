-- Keep the audit ledger contract aligned with public.social_platforms.
-- TikTok remains fail-closed in application readiness until its official API
-- contract and credentials are verified; this migration only removes the
-- structural mismatch that previously rejected a legitimate platform value.
alter table public.social_posts
  drop constraint if exists social_posts_platform_check;

alter table public.social_posts
  add constraint social_posts_platform_check
  check (platform in ('facebook', 'instagram', 'x', 'linkedin', 'telegram', 'tiktok', 'youtube'));
