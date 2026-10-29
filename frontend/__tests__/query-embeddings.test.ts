import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createQueryEmbedding } from '../lib/query-embeddings';

describe('query embedding helper', () => {
  const previous = {
    endpoint: process.env.NEWS_EMBEDDING_ENDPOINT,
    key: process.env.NEWS_EMBEDDING_API_KEY,
    model: process.env.NEWS_EMBEDDING_MODEL,
  };

  afterEach(() => {
    if (previous.endpoint === undefined) delete process.env.NEWS_EMBEDDING_ENDPOINT;
    else process.env.NEWS_EMBEDDING_ENDPOINT = previous.endpoint;
    if (previous.key === undefined) delete process.env.NEWS_EMBEDDING_API_KEY;
    else process.env.NEWS_EMBEDDING_API_KEY = previous.key;
    if (previous.model === undefined) delete process.env.NEWS_EMBEDDING_MODEL;
    else process.env.NEWS_EMBEDDING_MODEL = previous.model;
  });

  it('disables semantic lookup when credentials are not configured', async () => {
    delete process.env.NEWS_EMBEDDING_ENDPOINT;
    delete process.env.NEWS_EMBEDDING_API_KEY;
    delete process.env.NEWS_EMBEDDING_MODEL;
    const fetcher = vi.fn();

    await expect(createQueryEmbedding('local query', fetcher as typeof fetch)).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('serializes a validated vector for the pgvector RPC', async () => {
    process.env.NEWS_EMBEDDING_ENDPOINT = 'https://embedding.example/v1/embeddings';
    process.env.NEWS_EMBEDDING_API_KEY = 'test-only-token';
    process.env.NEWS_EMBEDDING_MODEL = 'test-embedding-model';
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(
      JSON.stringify({ data: [{ embedding: [0.125, -0.5, 1] }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));

    await expect(createQueryEmbedding('news query', fetcher as typeof fetch)).resolves.toBe('[0.125,-0.5,1]');
    expect(fetcher).toHaveBeenCalledOnce();
    const [, init] = fetcher.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test-only-token');
    expect(JSON.parse(String(init?.body))).toEqual({ model: 'test-embedding-model', input: 'news query' });
  });

  it('rejects malformed or non-finite vectors', async () => {
    process.env.NEWS_EMBEDDING_ENDPOINT = 'https://embedding.example/v1/embeddings';
    process.env.NEWS_EMBEDDING_API_KEY = 'test-only-token';
    process.env.NEWS_EMBEDDING_MODEL = 'test-embedding-model';
    const fetcher = vi.fn(async () => new Response(
      JSON.stringify({ data: [{ embedding: [0.1, Number.NaN] }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));

    await expect(createQueryEmbedding('news query', fetcher as typeof fetch)).rejects.toThrow('embedding_provider_invalid_vector');
  });
});
