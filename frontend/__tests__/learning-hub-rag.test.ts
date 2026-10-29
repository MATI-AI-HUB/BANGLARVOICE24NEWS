import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, callAiGateway } = vi.hoisted(() => ({
  createClient: vi.fn(),
  callAiGateway: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('../lib/ai-gateway', () => ({ callAiGateway }));

import { POST } from '../app/api/learning-hub/route';

describe('Learning Hub hybrid RAG route', () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
    process.env.NEWS_EMBEDDING_ENDPOINT = 'https://embedding.example/v1/embeddings';
    process.env.NEWS_EMBEDDING_API_KEY = 'test-embedding-key';
    process.env.NEWS_EMBEDDING_MODEL = 'test-embedding-model';
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ data: [{ embedding: [0.25, -0.5] }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    callAiGateway.mockResolvedValue({ answer: 'Grounded answer [1]', provider: 'test', model: 'test', requestId: null });
    createClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: [{ id: 'article-id', slug: 'grounded-story', title_bn: 'বাংলা শিরোনাম', title_en: 'English headline', excerpt_bn: 'সংক্ষিপ্ত বিবরণ' }],
        error: null,
      }),
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({ data: [{ id: 'article-id', content_bn: 'বাংলা প্রতিবেদন', content_en: 'English report', excerpt_bn: 'সংক্ষিপ্ত বিবরণ' }] }),
        })),
      })),
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uses the service-role hybrid RPC and returns English article sources', async () => {
    const response = await POST(new Request('https://preview.example/api/learning-hub', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'What is this story about?', locale: 'en' }),
    }));
    const payload = await response.json();
    const client = createClient.mock.results[0]?.value;

    expect(response.status).toBe(200);
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'test-service-role', { auth: { persistSession: false } });
    expect(client.rpc).toHaveBeenCalledWith('hybrid_search_articles', {
      p_query: 'What is this story about?',
      p_query_embedding: '[0.25,-0.5]',
      p_match_count: 5,
    });
    expect(payload.answer).toBe('Grounded answer [1]');
    expect(payload.sources[0]).toMatchObject({ title: 'English headline', snippet: 'English report' });
  });
});
