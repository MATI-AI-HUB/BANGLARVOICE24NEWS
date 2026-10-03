/**
 * User Service — manage users via Supabase Auth Admin API.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { canonicalSiteUrl } from '../site';

export type UserRow = {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  verified: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin creds missing');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function pgClient(): Client {
  const conn = process.env.SUPABASE_DB_URL;
  if (!conn) throw new Error('SUPABASE_DB_URL missing');
  return new Client({ connectionString: conn });
}

export async function listUsers(): Promise<UserRow[]> {
  const sb = adminClient();
  const { data: { users }, error } = await sb.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;

  const conn = pgClient();
  await conn.connect();
  let profiles: any[] = [];
  try {
    const r = await conn.query('SELECT id, role, full_name, phone, verified FROM profiles');
    profiles = r.rows;
  } finally {
    await conn.end();
  }
  const byId = new Map(profiles.map((p) => [p.id, p]));

  return users.map((u) => {
    const p = byId.get(u.id) || {};
    return {
      id: u.id,
      email: u.email || '',
      role: p.role || 'citizen_reporter',
      full_name: p.full_name || null,
      phone: p.phone || null,
      verified: p.verified === true,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
    };
  });
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const allowed = ['admin', 'chief_editor', 'desk_editor', 'staff_reporter', 'citizen_reporter'];
  if (!allowed.includes(role)) throw new Error(`Invalid role: ${role}`);
  const conn = pgClient();
  await conn.connect();
  try {
    const r = await conn.query(
      'UPDATE profiles SET role = $1::app_role, updated_at = now() WHERE id = $2',
      [role, userId],
    );
    if (r.rowCount === 0) throw new Error('User profile not found');
  } finally {
    await conn.end();
  }
}

export async function updateUserVerified(userId: string, verified: boolean): Promise<void> {
  const conn = pgClient();
  await conn.connect();
  try {
    const r = await conn.query(
      'UPDATE profiles SET verified = $1, updated_at = now() WHERE id = $2',
      [verified, userId],
    );
    if (r.rowCount === 0) throw new Error('User profile not found');
  } finally {
    await conn.end();
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const sb = adminClient();
  const siteUrl = canonicalSiteUrl();
  const { error } = await sb.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/reset-password` },
  });
  if (error) throw error;
}

export async function deleteUser(userId: string): Promise<void> {
  const sb = adminClient();
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) throw error;
}
