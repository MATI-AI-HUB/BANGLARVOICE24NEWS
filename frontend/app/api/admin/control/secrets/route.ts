import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { listSecrets, addSecret } from '@/lib/control/vault-service';
import { logAction } from '@/lib/control/audit-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const secrets = await listSecrets();
    return NextResponse.json({ items: secrets }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { service_name, environment = 'prod', key_value } = body;
    if (!service_name || !key_value) {
      return NextResponse.json(
        { error: 'service_name and key_value required' },
        { status: 400 },
      );
    }
    const env = ['prod', 'dev', 'staging'].includes(environment) ? environment : 'prod';
    const result = await addSecret(service_name, env, key_value);
    await logAction({
      actor_id: admin.id,
      actor_email: admin.email,
      action: 'secret.add',
      target: service_name,
      metadata: { environment: env },
    });
    return NextResponse.json(
      { ok: true, secret_id: result.secret_id },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
