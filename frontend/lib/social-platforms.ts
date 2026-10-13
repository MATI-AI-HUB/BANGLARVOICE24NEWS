import type { SupabaseClient } from '@supabase/supabase-js';

// Canonical platform ids. Must match public.social_platforms.platform and the
// social_posts.platform check constraint.
export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'x',
  'linkedin',
  'telegram',
  'tiktok',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

// Platforms the pipeline may actually enqueue/dispatch. TikTok is a disabled
// Phase 1 stub (see the registry migration) and is deliberately excluded.
export const DISPATCHABLE_PLATFORMS: readonly SocialPlatform[] = SOCIAL_PLATFORMS.filter(
  (platform) => platform !== 'tiktok',
);

export interface PlatformLimit {
  daily: number | null;
  minGapMinutes: number;
}

export interface ReadinessSnapshot {
  /** Platforms that are enabled, name-verified and fully credentialled. */
  ready: string[];
  /** Safety rails per ready platform. */
  limits: Record<string, PlatformLimit>;
  /** True when the registry could not be read; callers must publish nothing. */
  degraded: boolean;
}

interface ReadinessRow {
  platform?: unknown;
  is_ready?: unknown;
  daily_post_limit?: unknown;
  min_gap_minutes?: unknown;
}

export function isDispatchable(platform: string): platform is SocialPlatform {
  return (DISPATCHABLE_PLATFORMS as readonly string[]).includes(platform);
}

/**
 * Read per-platform readiness from the Phase 1 registry view.
 *
 * Fails closed: if the view is missing or unreadable the returned `ready` list
 * is empty, so callers enqueue and publish nothing rather than guessing with a
 * hardcoded platform list. `degraded` lets callers log a secret-free warning.
 */
export async function fetchReadiness(supabase: SupabaseClient): Promise<ReadinessSnapshot> {
  const { data, error } = await supabase
    .from('social_platform_readiness')
    .select('platform,is_ready,daily_post_limit,min_gap_minutes');

  if (error || !Array.isArray(data)) {
    return { ready: [], limits: {}, degraded: true };
  }

  const ready: string[] = [];
  const limits: Record<string, PlatformLimit> = {};

  for (const row of data as ReadinessRow[]) {
    if (!row || row.is_ready !== true || typeof row.platform !== 'string') continue;
    if (!isDispatchable(row.platform)) continue;
    ready.push(row.platform);
    const minGapMinutes =
      typeof row.min_gap_minutes === 'number' && row.min_gap_minutes > 0
        ? row.min_gap_minutes
        : 0;
    limits[row.platform] = {
      daily: typeof row.daily_post_limit === 'number' ? row.daily_post_limit : null,
      minGapMinutes,
    };
  }

  return { ready, limits, degraded: false };
}

// Asia/Dhaka is a fixed UTC+6 offset (Bangladesh has no DST), so the daily
// counter can be computed without a timezone database.
const BST_OFFSET_MS = 6 * 60 * 60 * 1000;

/** UTC instant corresponding to the start of the current Dhaka calendar day. */
export function dhakaDayStartIso(now: number = Date.now()): string {
  const dhaka = new Date(now + BST_OFFSET_MS);
  const midnight = Date.UTC(dhaka.getUTCFullYear(), dhaka.getUTCMonth(), dhaka.getUTCDate());
  return new Date(midnight - BST_OFFSET_MS).toISOString();
}
