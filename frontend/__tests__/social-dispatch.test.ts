import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const rpc = vi.fn();

function chain() {
  const c: Record<string, unknown> = {};
  c.select = () => c;
  c.eq = () => c;
  c.in = () => c;
  c.gte = () => c;
  c.not = () => c;
  c.lt = () => c;
  c.order = () => c;
  c.limit = () => c;
  c.update = () => c;
  c.maybeSingle = maybeSingle;
  return c;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => chain(), rpc }),
}));

describe('POST /api/social/dispatch', () => {
  beforeEach(() => {
    vi.resetModules();
    maybeSingle.mockReset();
    rpc.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SOCIAL_AUTOMATION_ENABLED;
  });

  async function post(headers: Record<string, string> = {}) {
    const { POST } = await import('../app/api/social/dispatch/route');
    return POST(
      new Request('https://example.com/api/social/dispatch', { method: 'POST', headers }),
    );
  }

  it('returns 401 when no cron secret is configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await post();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('honours the SOCIAL_AUTOMATION_ENABLED kill switch', async () => {
    maybeSingle.mockResolvedValue({ data: { key_encrypted: 'vault-ref' } });
    rpc.mockResolvedValue({ data: 'test-secret' });
    process.env.SOCIAL_AUTOMATION_ENABLED = 'false';
    const res = await post({ Authorization: 'Bearer test-secret' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, processed: 0, disabled: true });
  });

  it('falls back to vault credentials when readiness is unreadable', async () => {
    maybeSingle.mockResolvedValue({ data: { key_encrypted: 'vault-ref' } });
    rpc.mockResolvedValue({ data: 'test-secret' });
    const res = await post({ Authorization: 'Bearer test-secret' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.ready).toBeGreaterThan(0);
  });
});
