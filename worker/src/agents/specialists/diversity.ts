// =============================================================================
// diversity.ts — enforce per-source daily caps.
// Reads source_registry.daily_cap_pct and blocks articles exceeding the quota.
// Fail-open: if Supabase is unreachable, we allow (never block on infra error).
// =============================================================================

import type { WorkerConfig } from "../../config.js";

export interface DiversityVerdict {
  allowed: boolean;
  reason: string;
  currentPct: number;
  capPct: number;
}

export async function checkDiversityQuota(
  cfg: WorkerConfig,
  sourceName: string,
): Promise<DiversityVerdict> {
  // Fail-open when Supabase is not configured — don't break existing pipelines.
  if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) {
    return { allowed: true, reason: "supabase not configured (skip)", currentPct: 0, capPct: 100 };
  }

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  try {
    // Today's articles grouped by source (last 24h)
    const statsRes = await fetch(
      `${cfg.supabaseUrl}/rest/v1/articles?select=source_name&status=eq.published&created_at=gte.${since}`,
      { headers: { apikey: cfg.supabaseServiceKey, Authorization: `Bearer ${cfg.supabaseServiceKey}` } },
    );
    const rows = (await statsRes.json()) as { source_name: string }[];

    // Registry cap for this source
    const regRes = await fetch(
      `${cfg.supabaseUrl}/rest/v1/source_registry?name_bn=eq.${encodeURIComponent(sourceName)}&select=daily_cap_pct`,
      { headers: { apikey: cfg.supabaseServiceKey, Authorization: `Bearer ${cfg.supabaseServiceKey}` } },
    );
    const reg = (await regRes.json()) as { daily_cap_pct: number }[];
    const capPct = reg[0]?.daily_cap_pct ?? 30;

    const todayCount = rows.filter((r) => r.source_name === sourceName).length;
    const totalToday = rows.length;
    const pct = totalToday > 0 ? (todayCount / totalToday) * 100 : 0;

    if (pct >= capPct) {
      return {
        allowed: false,
        reason: `${sourceName} today ${pct.toFixed(1)}% >= cap ${capPct}%`,
        currentPct: pct,
        capPct,
      };
    }
    return { allowed: true, reason: `within quota (${pct.toFixed(1)}% / ${capPct}%)`, currentPct: pct, capPct };
  } catch (e) {
    return { allowed: true, reason: "check error — allow: " + (e as Error).message, currentPct: 0, capPct: 100 };
  }
}
