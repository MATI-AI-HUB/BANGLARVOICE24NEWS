import 'server-only';

type EmbeddingPayload = {
  data?: Array<{ embedding?: unknown }>;
  error?: { message?: string };
};

/**
 * Returns a pgvector input literal using the configured OpenAI-compatible
 * embeddings endpoint. No key or endpoint means semantic search is disabled.
 */
export async function createQueryEmbedding(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  const endpoint = process.env.NEWS_EMBEDDING_ENDPOINT;
  const apiKey = process.env.NEWS_EMBEDDING_API_KEY;
  const model = process.env.NEWS_EMBEDDING_MODEL;
  if (!endpoint || !apiKey || !model) return null;

  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, input: query }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error(`embedding_provider_http_${response.status}`);
  const payload = await response.json().catch(() => ({})) as EmbeddingPayload;
  const vector = payload.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0 || vector.length > 8192) {
    throw new Error('embedding_provider_invalid_vector');
  }
  if (!vector.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    throw new Error('embedding_provider_invalid_vector');
  }

  return `[${vector.join(',')}]`;
}
