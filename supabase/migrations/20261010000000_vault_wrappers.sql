create or replace function public.create_api_key(
  p_service_name text, p_environment public.vault_env, p_key_value text
) returns uuid language plpgsql security definer set search_path = public, vault as $$
declare v_secret_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden: service_role required'; end if;
  v_secret_id := vault.create_secret(p_key_value, p_service_name || '_' || extract(epoch from now())::text);
  insert into public.api_vault (service_name, key_encrypted, environment, is_active)
  values (p_service_name, v_secret_id, p_environment, true)
  on conflict (service_name, environment) do update
    set key_encrypted = v_secret_id, is_active = true, updated_at = now();
  return v_secret_id;
end; $$;

create or replace function public.delete_api_key(
  p_service_name text, p_environment public.vault_env
) returns boolean language plpgsql security definer set search_path = public, vault as $$
declare v_row record;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden: service_role required'; end if;
  select * into v_row from public.api_vault
    where service_name = p_service_name and environment = p_environment;
  if not found then return false; end if;
  begin delete from vault.secrets where id = v_row.key_encrypted;
  exception when others then null; end;
  delete from public.api_vault where id = v_row.id;
  return true;
end; $$;

revoke all on function public.create_api_key(text, public.vault_env, text) from public, anon, authenticated;
revoke all on function public.delete_api_key(text, public.vault_env) from public, anon, authenticated;
grant execute on function public.create_api_key(text, public.vault_env, text) to service_role;
grant execute on function public.delete_api_key(text, public.vault_env) to service_role;
