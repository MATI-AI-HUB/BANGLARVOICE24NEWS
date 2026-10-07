-- Automatically create Gateway routing metadata when a specifically named Vault key is added.
-- The secret value remains in Vault; this trigger only copies non-secret metadata.
create or replace function public.sync_ai_gateway_key_state()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_provider text;
  v_priority integer;
begin
  if new.service_name like 'AI_GATEWAY_OPENROUTER%' then
    v_provider := 'openrouter';
    v_priority := case when new.service_name = 'AI_GATEWAY_OPENROUTER_PRIMARY' then 10 else 30 end;
  elsif new.service_name like 'AI_GATEWAY_GROQ%' then
    v_provider := 'groq';
    v_priority := case when new.service_name = 'AI_GATEWAY_GROQ_BACKUP' then 20 else 40 end;
  else
    return new;
  end if;

  insert into public.ai_gateway_key_state (
    api_vault_id, provider, account_label, priority, is_enabled, state, updated_at
  ) values (
    new.id, v_provider, new.service_name, v_priority, new.is_active, 'healthy', now()
  )
  on conflict (api_vault_id) do update set
    is_enabled = excluded.is_enabled,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_ai_gateway_key_state() from public, anon, authenticated;
grant execute on function public.sync_ai_gateway_key_state() to service_role;

drop trigger if exists trg_sync_ai_gateway_key_state on public.api_vault;
create trigger trg_sync_ai_gateway_key_state
after insert or update of service_name, is_active, key_encrypted
on public.api_vault
for each row execute function public.sync_ai_gateway_key_state();

insert into public.ai_gateway_key_state (api_vault_id, provider, account_label, priority, is_enabled, state)
select
  v.id,
  case when v.service_name like 'AI_GATEWAY_OPENROUTER%' then 'openrouter' else 'groq' end,
  v.service_name,
  case
    when v.service_name = 'AI_GATEWAY_OPENROUTER_PRIMARY' then 10
    when v.service_name = 'AI_GATEWAY_GROQ_BACKUP' then 20
    when v.service_name like 'AI_GATEWAY_OPENROUTER%' then 30
    else 40
  end,
  v.is_active,
  'healthy'
from public.api_vault v
where v.service_name like 'AI_GATEWAY_OPENROUTER%'
   or v.service_name like 'AI_GATEWAY_GROQ%'
on conflict (api_vault_id) do update set
  is_enabled = excluded.is_enabled,
  account_label = excluded.account_label,
  priority = excluded.priority,
  updated_at = now();
