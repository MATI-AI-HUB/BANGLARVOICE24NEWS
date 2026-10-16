-- Align the live registry with the exact service_name values read by the
-- dispatcher and OAuth code. Readiness remains fail-closed on names_verified.
begin;

update public.social_platforms
set required_secrets = case platform
  when 'facebook' then array['SOCIAL_FACEBOOK_PAGE_ID','SOCIAL_FACEBOOK_PAGE_TOKEN']
  when 'instagram' then array['SOCIAL_INSTAGRAM_BUSINESS_ACCOUNT_ID','SOCIAL_INSTAGRAM_ACCESS_TOKEN']
  when 'x' then array['SOCIAL_X_ACCESS_TOKEN']
  when 'linkedin' then array['SOCIAL_LINKEDIN_ACCESS_TOKEN','SOCIAL_LINKEDIN_ORGANIZATION_ID']
  when 'telegram' then array['SOCIAL_TELEGRAM_BOT_TOKEN','SOCIAL_TELEGRAM_CHANNEL_ID']
  when 'tiktok' then array['SOCIAL_TIKTOK_ACCESS_TOKEN']
  when 'youtube' then array['YOUTUBE_REFRESH_TOKEN','OAUTH_CLIENT_ID','OAUTH_CLIENT_SECRET']
  else required_secrets
end,
updated_at = now();

-- Account identity is intentionally not inferred from secret presence.
update public.social_platforms
set names_verified = case platform
  when 'facebook' then true
  else false
end,
updated_at = now();

create or replace view public.social_platform_readiness
with (security_invoker = true) as
select
  p.platform,
  p.tier,
  p.enabled,
  p.names_verified,
  coalesce(m.missing_secrets, array[]::text[]) as missing_secrets,
  (p.enabled and p.names_verified and cardinality(coalesce(m.missing_secrets, array[]::text[])) = 0) as ready,
  (p.enabled and p.names_verified and cardinality(coalesce(m.missing_secrets, array[]::text[])) = 0) as is_ready,
  p.daily_post_limit,
  p.min_gap_minutes
from public.social_platforms p
left join lateral (
  select array_agg(required_name order by required_name) filter (where av.key_encrypted is null) as missing_secrets
  from unnest(p.required_secrets) as required_name
  left join public.api_vault av
    on av.service_name = required_name
   and av.environment = 'prod'
   and av.is_active = true
   and av.key_encrypted is not null
) m on true;

comment on view public.social_platform_readiness is
  'Fail-closed readiness: enabled + names_verified + exact active prod Vault mapping for every required secret.';
commit;
