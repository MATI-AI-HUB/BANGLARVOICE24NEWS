/**
 * Banglar Voice — minimal OAuth 1.0a HMAC-SHA1 signer (RFC 5849).
 *
 * Dependency-free implementation used ONLY for X (Twitter) API v2, which
 * still requires OAuth 1.0a user-context signing. Supports the plain
 * application/json POST that the v2 /tweets endpoint accepts when the
 * body is signed via the oauth_body_hash? No — v2 tweets accept a JSON
 * body with a normal OAuth1 header (no body hash needed because the JSON
 * body is not form-encoded; Twitter signs only the header params).
 */

import { createHmac, randomBytes } from 'node:crypto';
import { jsonFetch } from './http.js';

export type OAuth1Keys = {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
};

function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function hmacSha1(key: string, base: string): string {
  return createHmac('sha1', key).update(base).digest('base64');
}

/**
 * Sign + POST a JSON request to an OAuth1-protected endpoint.
 * Returns the same shape as jsonFetch.
 */
export async function signAndPost(
  url: string,
  jsonBody: Record<string, unknown>,
  keys: OAuth1Keys,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const oauth: Record<string, string> = {
    oauth_consumer_key: keys.appKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: keys.accessToken,
    oauth_version: '1.0',
  };

  // For JSON POST, Twitter signs the header params only (no form body params).
  const paramEntries = Object.entries(oauth).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const paramStr = paramEntries.map(([k, v]) => `${pct(k)}=${pct(v)}`).join('&');

  const method = 'POST';
  const base = `${method}&${pct(url)}&${pct(paramStr)}`;
  const signingKey = `${pct(keys.appSecret)}&${pct(keys.accessSecret)}`;
  oauth.oauth_signature = hmacSha1(signingKey, base);

  const header =
    'OAuth ' +
    Object.entries(oauth)
      .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
      .join(', ');

  return jsonFetch(url, {
    method: 'POST',
    headers: {
      authorization: header,
      'content-type': 'application/json',
      'user-agent': 'BanglarVoiceBroadcast/3.0',
    },
    body: JSON.stringify(jsonBody),
  });
}
