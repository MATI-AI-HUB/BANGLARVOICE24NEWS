const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const content = fs.readFileSync(path.join(__dirname, 'frontend', '.env.local'), 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const SQL = `
-- ═══ Wrapper: create_api_key ═══
create or replace function public.create_api_key(
  p_service_name text,
  p_environment public.vault_env,
  p_key_value text
) returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_name text;
  v_secret_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden: service_role required';
  end if;

  v_secret_name := p_service_name || '_' || extract(epoch from now())::text;

  v_secret_id := vault.create_secret(p_key_value, v_secret_name);

  insert into public.api_vault (service_name, key_encrypted, environment, is_active)
  values (p_service_name, v_secret_id, p_environment, true)
  on conflict (service_name, environment) do update
    set key_encrypted = v_secret_id,
        is_active = true,
        updated_at = now();

  return v_secret_id;
end;
$$;

grant execute on function public.create_api_key(text, public.vault_env, text) to service_role;

-- ═══ Wrapper: delete_api_key ═══
create or replace function public.delete_api_key(
  p_service_name text,
  p_environment public.vault_env
) returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_row record;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden: service_role required';
  end if;

  select * into v_row from public.api_vault
    where service_name = p_service_name
      and environment = p_environment;

  if not found then
    return false;
  end if;

  -- Attempt to delete the vault secret
  begin
    delete from vault.secrets where id = v_row.key_encrypted;
  exception when others then
    -- If vault delete fails, still remove the api_vault row
    null;
  end;

  delete from public.api_vault
    where id = v_row.id;

  return true;
end;
$$;

grant execute on function public.delete_api_key(text, public.vault_env) to service_role;
`;

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('✅ Connected\n');

  await client.query(SQL);
  console.log('✅ Wrapper functions created:');
  console.log('   • create_api_key(service_name, environment, key_value)');
  console.log('   • delete_api_key(service_name, environment)');

  // Verify
  const { rows } = await client.query(`
    SELECT proname FROM pg_proc
    WHERE proname IN ('create_api_key', 'delete_api_key')
    ORDER BY proname
  `);
  console.log('\n📊 Verified:');
  rows.forEach(r => console.log(`   ✅ ${r.proname}`));

  await client.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
