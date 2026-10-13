import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { dhakaDayStartIso, fetchReadiness } from '../lib/social-platforms';

function clientReturning(result: unknown): SupabaseClient {
  return {
    from: () => ({ select: async () => result }),
  } as unknown as SupabaseClient;
}

describe('fetchReadiness', () => {
  it('returns only enabled, verified, dispatchable platforms as ready', async () => {
    const snapshot = await fetchReadiness(
      clientReturning({
        data: [
          { platform: 'facebook', is_ready: true, daily_post_limit: 30, min_gap_minutes: 30 },
          { platform: 'tiktok', is_ready: true, daily_post_limit: null, min_gap_minutes: 0 },
          { platform: 'x', is_ready: false, daily_post_limit: 30, min_gap_minutes: 30 },
        ],
        error: null,
      }),
    );

    expect(snapshot.degraded).toBe(false);
    expect(snapshot.ready).toEqual(['facebook']);
    expect(snapshot.limits.facebook).toEqual({ daily: 30, minGapMinutes: 30 });
  });

  it('fails closed when the registry view is unreadable', async () => {
    const snapshot = await fetchReadiness(clientReturning({ data: null, error: { message: 'missing' } }));
    expect(snapshot).toEqual({ ready: [], limits: {}, degraded: true });
  });

  it('fails closed when the payload is malformed', async () => {
    const snapshot = await fetchReadiness(clientReturning({ data: 'nope', error: null }));
    expect(snapshot.degraded).toBe(true);
    expect(snapshot.ready).toEqual([]);
  });

  it('normalises missing or invalid safety rails', async () => {
    const snapshot = await fetchReadiness(
      clientReturning({
        data: [{ platform: 'telegram', is_ready: true, daily_post_limit: null, min_gap_minutes: -5 }],
        error: null,
      }),
    );
    expect(snapshot.limits.telegram).toEqual({ daily: null, minGapMinutes: 0 });
  });
});

describe('dhakaDayStartIso', () => {
  it('returns the UTC instant of the current Dhaka midnight', () => {
    // 2026-10-13T02:00Z is 08:00 in Dhaka, so the Dhaka day began at 18:00Z.
    expect(dhakaDayStartIso(Date.parse('2026-10-13T02:00:00Z'))).toBe('2026-10-12T18:00:00.000Z');
  });

  it('rolls over with the Dhaka clock, not UTC', () => {
    expect(dhakaDayStartIso(Date.parse('2026-10-13T18:30:00Z'))).toBe('2026-10-13T18:00:00.000Z');
  });
});
