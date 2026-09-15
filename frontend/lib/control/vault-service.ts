/**
 * Vault Service — manage Supabase vault secrets.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type SecretEntry = {
  id: string;
  service_name: string;
  environment: string;
  is_active: boolean;
  last_tested: string | null;
  usage_percent: number | null;
  created_at: string;
  updated_at: string;
};

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin creds missing');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function listSecrets(): Promise<SecretEntry[]> {
  const sb = adminClient();
  const { data, error } = await sb
    .from('api_vault')
    .select('id, service_name, environment, is_active, last_tested, usage_percent, created_at, updated_at')
    .order('service_name');
  if (error) throw error;
  return (data || []) as SecretEntry[];
}

export async function addSecret(
  serviceName: string,
  environment: 'prod' | 'dev' | 'staging',
  keyValue: string,
): Promise<{ secret_id: string }> {
  const sb = adminClient();
  const { data, error } = await sb.rpc('create_api_key', {
    p_service_name: serviceName,
    p_environment: environment,
    p_key_value: keyValue,
  });
  if (error) throw error;
  return { secret_id: data as string };
}

export async function getSecretValue(id: string): Promise<string | null> {
  const sb = adminClient();
  const { data: row, error: e1 } = await sb
    .from('api_vault')
    .select('key_encrypted')
    .eq('id', id)
    .maybeSingle();
  if (e1) throw e1;
  if (!row?.key_encrypted) return null;
  const { data: plain, error: e2 } = await sb.rpc('decrypt_vault_secret', {
    p_secret_id: row.key_encrypted,
  });
  if (e2) throw e2;
  return (plain as string) || null;
}

export async function deleteSecret(id: string): Promise<{ deleted: string }> {
  const sb = adminClient();
  const { data: row, error: e1 } = await sb
    .from('api_vault')
    .select('service_name, environment')
    .eq('id', id)
    .maybeSingle();
  if (e1) throw e1;
  if (!row) throw new Error('Secret not found');
  const { error: e2 } = await sb.rpc('delete_api_key', {
    p_service_name: row.service_name,
    p_environment: row.environment,
  });
  if (e2) throw e2;
  return { deleted: row.service_name };
}

export async function updateMeta(
  id: string,
  patch: { is_active?: boolean; usage_percent?: number },
): Promise<void> {
  const sb = adminClient();
  const { error } = await sb.from('api_vault').update(patch).eq('id', id);
  if (error) throw error;
}

export async function markTested(id: string, success: boolean): Promise<void> {
  const sb = adminClient();
  await sb
    .from('api_vault')
    .update({ last_tested: new Date().toISOString(), is_active: success })
    .eq('id', id);
}
