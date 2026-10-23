-- Keep social dispatch and readiness on one Vault contract.
-- No plaintext secret values are copied; api_vault points at existing Vault ids.

create or replace view public.social_platform_readiness as
select
  p.platform,
  p.tier,
  p.enabled,
  p.names_verified,
  array(
    select r.secret_name
    from unnest(p.required_secrets) r(secret_name)
    where not exists (
      select 1
      from vault.secrets v
      where v.name = r.secret_name
    )
  ) as missing_secrets,
  (
    p.enabled
    and p.names_verified
    and not exists (
      select 1
      from unnest(p.required_secrets) r(secret_name)
      where not exists (
        select 1
        from vault.secrets v
        where v.name = r.secret_name
      )
    )
  ) as ready,
  (
    p.enabled
    and p.names_verified
    and not exists (
      select 1
      from unnest(p.required_secrets) r(secret_name)
      where not exists (
        select 1
        from vault.secrets v
        where v.name = r.secret_name
      )
    )
  ) as is_ready,
  p.daily_post_limit,
  p.min_gap_minutes
from public.social_platforms p;

-- Existing Vault secrets are referenced by id only. These aliases let the
-- server dispatcher resolve the same credentials without exposing values.
insert into public.api_vault (service_name, key_encrypted, environment, is_active)
select 'SOCIAL_X_ACCESS_TOKEN', v.id, 'prod'::public.vault_env, true
from vault.secrets v
where v.name = 'X_ACCESS_TOKEN'
  and not exists (
    select 1 from public.api_vault a
    where a.service_name = 'SOCIAL_X_ACCESS_TOKEN'
      and a.environment = 'prod'::public.vault_env
  );

insert into public.api_vault (service_name, key_encrypted, environment, is_active)
select v.name, v.id, 'prod'::public.vault_env, true
from vault.secrets v
where v.name in ('OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN', 'YOUTUBE_CHANNEL_ID')
  and not exists (
    select 1 from public.api_vault a
    where a.service_name = v.name
      and a.environment = 'prod'::public.vault_env
  );

comment on view public.social_platform_readiness is
  'Fail-closed readiness: platform must be enabled, names-verified, and all required Vault secret names must exist.';
