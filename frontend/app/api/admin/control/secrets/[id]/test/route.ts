import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { getSecretValue, markTested } from '@/lib/control/vault-service';
import { listSecrets } from '@/lib/control/vault-service';
import { logAction } from '@/lib/control/audit-service';

export const dynamic = 'force-dynamic';

type TestResult = { ok: boolean; status: number; message: string };

async function testGroq(key: string): Promise<TestResult> {
  const r = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  return { ok: r.ok, status: r.status, message: r.ok ? 'Groq reachable' : `HTTP ${r.status}` };
}

async function testPexels(key: string): Promise<TestResult> {
  const r = await fetch('https://api.pexels.com/v1/search?query=news&per_page=1', {
    headers: { Authorization: key },
  });
  return { ok: r.ok, status: r.status, message: r.ok ? 'Pexels reachable' : `HTTP ${r.status}` };
}

async function testGemini(key: string): Promise<TestResult> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  return { ok: r.ok, status: r.status, message: r.ok ? 'Gemini reachable' : `HTTP ${r.status}` };
}

async function testOpenAI(key: string): Promise<TestResult> {
  const r = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  return { ok: r.ok, status: r.status, message: r.ok ? 'OpenAI reachable' : `HTTP ${r.status}` };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const secrets = await listSecrets();
    const entry = secrets.find((s) => s.id === id);
    if (!entry) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const value = await getSecretValue(id);
    if (!value) return NextResponse.json({ error: 'no value' }, { status: 400 });

    let result: TestResult = { ok: false, status: 0, message: 'no test handler' };
    const name = entry.service_name.toUpperCase();
    if (name.includes('GROQ')) result = await testGroq(value);
    else if (name.includes('PEXELS')) result = await testPexels(value);
    else if (name.includes('GEMINI')) result = await testGemini(value);
    else if (name.includes('OPENAI')) result = await testOpenAI(value);

    await markTested(id, result.ok);
    await logAction({
      actor_id: admin.id,
      actor_email: admin.email,
      action: 'secret.test',
      target: entry.service_name,
      metadata: { ok: result.ok, status: result.status },
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
