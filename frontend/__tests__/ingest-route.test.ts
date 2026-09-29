import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const insert = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => from(...args),
  }),
}));

function chainLookup(result: { data: { id: string; status: string } | null; error: null | { message: string } }) {
  maybeSingle.mockResolvedValueOnce(result);
  eq.mockReturnValue({ maybeSingle });
  select.mockReturnValue({ eq });
  from.mockReturnValue({ select, insert });
}

describe('POST /api/newsroom/ingest', () => {
  beforeEach(() => {
    vi.resetModules();
    insert.mockReset();
    maybeSingle.mockReset();
    eq.mockReset();
    select.mockReset();
    from.mockReset();
    process.env.NEWSROOM_INGEST_KEY = 'test-ingest-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  afterEach(() => {
    delete process.env.NEWSROOM_INGEST_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  async function post(headers: Record<string, string>, body: unknown) {
    const { POST } = await import('../app/api/newsroom/ingest/route');
    return POST(
      new Request('https://example.com/api/newsroom/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    );
  }

  it('returns 500 when NEWSROOM_INGEST_KEY is missing', async () => {
    delete process.env.NEWSROOM_INGEST_KEY;
    const res = await post({}, { title: 'hello world article', content: 'x'.repeat(50) });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'ingest_unconfigured' });
  });

  it('returns 401 when the bearer key is wrong', async () => {
    const res = await post(
      { Authorization: 'Bearer wrong' },
      { title: 'hello world article', content: 'x'.repeat(50) },
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('returns duplicate=true on a second insert with the same sourceUrl', async () => {
    chainLookup({ data: { id: 'art-1', status: 'published' }, error: null });
    const res = await post(
      { Authorization: 'Bearer test-ingest-key' },
      {
        title: 'hello world article',
        content: 'x'.repeat(50),
        sourceUrl: 'https://example.com/story',
        rewriteMethod: 'ai',
        fallback: false,
      },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: 'art-1', status: 'published', duplicate: true });
    expect(insert).not.toHaveBeenCalled();
  });
});
