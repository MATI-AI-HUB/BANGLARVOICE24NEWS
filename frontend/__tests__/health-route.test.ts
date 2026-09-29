import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const limit = vi.fn();
const order = vi.fn();
const not = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();
const rpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from, rpc }),
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.resetModules();
    maybeSingle.mockReset();
    limit.mockReset();
    order.mockReset();
    not.mockReset();
    eq.mockReset();
    select.mockReset();
    from.mockReset();
    rpc.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.NEWSROOM_INGEST_KEY = 'test-ingest-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEWSROOM_INGEST_KEY;
  });

  it('returns 503 degraded when supabase env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { GET } = await import('../app/api/health/route');
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.supabase_configured).toBe(false);
    expect(body.published).toBe(0);
    expect(body.last_success_at).toBeNull();
  });

  it('includes published count and last_success_at', async () => {
    rpc.mockResolvedValue({ data: '2026-09-29T00:00:00.000Z', error: null });
    select.mockReturnValue({
      eq: () => Promise.resolve({ count: 3, error: null }),
    });
    from.mockReturnValue({ select });
    const { GET } = await import('../app/api/health/route');
    const res = await GET();
    const body = await res.json();
    expect(body.published).toBe(3);
    expect(body.last_success_at).toBe('2026-09-29T00:00:00.000Z');
    expect(body.ingest_configured).toBe(true);
    expect(body.supabase_configured).toBe(true);
  });
});
