import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc }),
}));

describe('POST /api/newsletter/subscribe', () => {
  beforeEach(() => {
    vi.resetModules();
    rpc.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  async function post(body: unknown) {
    const { POST } = await import('../app/api/newsletter/subscribe/route');
    return POST(new Request('https://example.com/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }));
  }

  it('rejects invalid email without touching Supabase', async () => {
    const response = await post({ email: 'not-an-email' });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when the service role key is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = await post({ email: 'reader@example.com' });
    expect(response.status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('normalizes and queues an email through the transactional RPC', async () => {
    rpc.mockResolvedValue({ data: { success: true, queued: true }, error: null });
    const response = await post({ email: ' Reader@Example.com ' });
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ success: true, queued: true });
    expect(rpc).toHaveBeenCalledWith('subscribe_and_queue_newsletter', {
      p_email: 'reader@example.com',
    });
  });

  it('returns a success message in the selected English locale', async () => {
    rpc.mockResolvedValue({ data: { success: true, queued: false }, error: null });
    const { POST } = await import('../app/api/newsletter/subscribe/route');
    const response = await POST(new Request('https://example.com/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bv_locale=en' },
      body: JSON.stringify({ email: 'reader@example.com' }),
    }));

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      success: true,
      message: 'Thank you! Your email has been registered.',
    });
  });
});
