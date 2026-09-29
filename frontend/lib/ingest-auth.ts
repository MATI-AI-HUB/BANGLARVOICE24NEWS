import { createHash, timingSafeEqual } from 'crypto';

export const INGEST_ENV_NAME = 'NEWSROOM_INGEST_KEY';

export function ingestExpectedKey(env: NodeJS.ProcessEnv = process.env): string {
  return (env[INGEST_ENV_NAME] || '').trim();
}

export function ingestConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const key = ingestExpectedKey(env);
  return key.length > 0 && key !== 'change-me';
}

export function extractProvidedKey(req: Request): string {
  const auth = req.headers.get('authorization') || '';
  const bearer = /^Bearer\s+(\S+)/i.exec(auth);
  if (bearer?.[1]) return bearer[1].trim();
  return (req.headers.get('x-ingest-key') || '').trim();
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function ingestKeyOk(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}
