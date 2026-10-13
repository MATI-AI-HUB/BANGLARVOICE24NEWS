import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { runSocialManager, type SocialManagerTask } from '@/lib/social-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_TASKS: readonly SocialManagerTask[] = ['daily_plan', 'metrics', 'weekly_strategy', 'run']

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials are not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function vaultSecret(serviceName: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: row } = await client
    .from('api_vault')
    .select('key_encrypted')
    .eq('service_name', serviceName)
    .eq('environment', 'prod')
    .eq('is_active', true)
    .maybeSingle()
  if (!row?.key_encrypted) return null
  const { data: plain } = await client.rpc('decrypt_vault_secret', { p_secret_id: row.key_encrypted })
  return typeof plain === 'string' && plain.length > 0 ? plain : null
}

async function authorized(request: Request): Promise<boolean> {
  const secret = (await vaultSecret('CRON_SECRET')) || (await vaultSecret('NEWSROOM_INGEST_KEY'))
  if (!secret) return false
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret
}

function normalizeTask(value: unknown): SocialManagerTask {
  return VALID_TASKS.includes(value as SocialManagerTask) ? (value as SocialManagerTask) : 'run'
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: 'server_not_configured' }, { status: 500 })
  }
  if (!(await authorized(request))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const body = (await request.json().catch(() => ({}))) as { task?: unknown }
  const task = normalizeTask(body.task)
  try {
    const supabase = admin()
    const result = await runSocialManager(task, supabase, { signal: AbortSignal.timeout(50_000) })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'social_manager_failed'
    return NextResponse.json({ ok: false, error: message, task }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return POST(request)
}
