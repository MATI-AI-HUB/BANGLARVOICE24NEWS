import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  ingestConfigured: vi.fn(),
  ingestExpectedKey: vi.fn(),
  extractProvidedKey: vi.fn(),
  ingestKeyOk: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));

vi.mock('../lib/ingest-auth', () => ({
  ingestConfigured: mocks.ingestConfigured,
  ingestExpectedKey: mocks.ingestExpectedKey,
  extractProvidedKey: mocks.extractProvidedKey,
  ingestKeyOk: mocks.ingestKeyOk,
}));

async function post(payload: unknown) {
  const { POST } = await import('../app/api/newsroom/revalidate/route');
  return POST(new Request('https://example.test/api/newsroom/revalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ingest-key': 'test-secret' },
    body: JSON.stringify(payload),
  }));
}

describe('POST /api/newsroom/revalidate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.ingestConfigured.mockReturnValue(true);
    mocks.ingestExpectedKey.mockReturnValue('test-secret');
    mocks.extractProvidedKey.mockImplementation((request: Request) => request.headers.get('x-ingest-key') || '');
    mocks.ingestKeyOk.mockImplementation((provided: string, expected: string) => provided === expected);
  });

  it('rejects payloads without an explicit status instead of broadly revalidating', async () => {
    const response = await post({ record: { id: '8f14e45f-ea4d-4c83-b1a1-2b2d3c4d5e6f' } });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'published_status_required' });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('skips drafts without invalidating public caches', async () => {
    const response = await post({ type: 'UPDATE', record: { status: 'draft' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, skipped: true });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('invalidates the published article, feed, and canonical category', async () => {
    const response = await post({
      type: 'INSERT',
      record: {
        id: '8f14e45f-ea4d-4c83-b1a1-2b2d3c4d5e6f',
        slug: 'story-42',
        status: 'published',
        category_key: 'রাজনীতি',
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/api/public/feed.json');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/article/story-42');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/article/8f14e45f-ea4d-4c83-b1a1-2b2d3c4d5e6f');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/category/politics');
    expect(mocks.revalidateTag).toHaveBeenCalledWith('articles');
  });

  it('refreshes both old and new categories when a published article is unpublished', async () => {
    const response = await post({
      type: 'UPDATE',
      record: {
        id: '8f14e45f-ea4d-4c83-b1a1-2b2d3c4d5e6f',
        slug: 'story-42',
        status: 'draft',
        category_key: 'national',
      },
      old_record: {
        id: '8f14e45f-ea4d-4c83-b1a1-2b2d3c4d5e6f',
        slug: 'story-42',
        status: 'published',
        category_key: 'sports',
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/category/national');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/category/sports');
    expect(mocks.revalidateTag).toHaveBeenCalledWith('articles');
  });

  it('rejects published events without an article identifier', async () => {
    const response = await post({ record: { status: 'published', category_key: 'politics' } });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'article_identifier_required' });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
