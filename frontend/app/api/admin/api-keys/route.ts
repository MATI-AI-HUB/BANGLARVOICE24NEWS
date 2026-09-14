import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin creds missing');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// GET /api/admin/api-keys — list all
export async function GET() {
  try {
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('api_vault')
      .select('id, service_name, environment, is_active, last_tested, usage_percent, created_at, updated_at')
      .order('service_name');

    if (error) throw error;

    return NextResponse.json(
      { items: data ?? [] },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}

// POST /api/admin/api-keys — create or replace
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { service_name, environment = 'prod', key_value } = body;

    if (!service_name || !key_value) {
      return NextResponse.json(
        { error: 'service_name and key_value required' },
        { status: 400 },
      );
    }

    const supabase = getAdmin();
    const { data, error } = await supabase.rpc('create_api_key', {
      p_service_name: service_name,
      p_environment: environment,
      p_key_value: key_value,
    });

    if (error) throw error;

    return NextResponse.json(
      { ok: true, secret_id: data },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
