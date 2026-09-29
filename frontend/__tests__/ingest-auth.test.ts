import { afterEach, describe, expect, it } from 'vitest';
import {
  extractProvidedKey,
  ingestConfigured,
  ingestExpectedKey,
  ingestKeyOk,
  INGEST_ENV_NAME,
} from '../lib/ingest-auth';

const original = process.env[INGEST_ENV_NAME];

afterEach(() => {
  if (original === undefined) delete process.env[INGEST_ENV_NAME];
  else process.env[INGEST_ENV_NAME] = original;
});

describe('ingest auth', () => {
  it('treats missing or change-me as unconfigured', () => {
    delete process.env[INGEST_ENV_NAME];
    expect(ingestConfigured()).toBe(false);
    process.env[INGEST_ENV_NAME] = 'change-me';
    expect(ingestConfigured()).toBe(false);
    process.env[INGEST_ENV_NAME] = '  real-secret-value  ';
    expect(ingestConfigured()).toBe(true);
    expect(ingestExpectedKey()).toBe('real-secret-value');
  });

  it('accepts Bearer or x-ingest-key', () => {
    const bearer = new Request('https://example.com/api/newsroom/ingest', {
      headers: { Authorization: 'Bearer abc' },
    });
    const header = new Request('https://example.com/api/newsroom/ingest', {
      headers: { 'x-ingest-key': 'abc' },
    });
    expect(extractProvidedKey(bearer)).toBe('abc');
    expect(extractProvidedKey(header)).toBe('abc');
  });

  it('compares keys in constant time', () => {
    expect(ingestKeyOk('same-key', 'same-key')).toBe(true);
    expect(ingestKeyOk('wrong', 'same-key')).toBe(false);
    expect(ingestKeyOk('', 'same-key')).toBe(false);
  });
});
