import "./sentry";
// =============================================================================
// index.ts — Banglar Voice 24/7 AI news worker entry point.
// Loads config, runs the pipeline on an interval, and exposes a minimal
// Telegram command control plane (optional).
// =============================================================================

import { loadConfig } from "./config.js";
import { runPipeline } from "./agents/orchestrator.js";
import { listAgents } from "./agents/registry.js";
import { runEpaperCycle, CRON_EXPRESSION } from "./agents/epaper-cron.js";

async function tick(): Promise<void> {
  const cfg = loadConfig();
  const started = Date.now();
  try {
    const result = await runPipeline(cfg);
    console.log(
      `[${new Date().toISOString()}] cycle done in ${((Date.now() - started) / 1000).toFixed(1)}s ` +
        `collected=${result.collected} published=${result.published} rejected=${result.rejected}`,
    );
  } catch (e) {
    console.error(`[${new Date().toISOString()}] cycle failed:`, e);
  }
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  console.log("Banglar Voice worker started.");
  console.log(`Agents: ${listAgents().map((a) => a.name).join(", ")}`);
  console.log(`Interval: ${cfg.intervalMinutes} min | autoPublish: ${cfg.autoPublish}`);

  // Run once immediately, then on the interval.
  await tick();
  setInterval(() => void tick(), cfg.intervalMinutes * 60 * 1000);

  // Daily e-paper generation at 23:30 (within the 23:00–00:00 window).
  const scheduleEpaper = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(23, 30, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        const r = await runEpaperCycle(loadConfig());
        console.log(`[epaper] ${r.edition.edition_date} archived=${r.archived} articles=${r.edition.article_count}`);
      } catch (e) {
        console.error("[epaper] cycle failed:", e);
      }
      scheduleEpaper(); // re-arm for the next day
    }, delay);
    console.log(`[epaper] next run ${next.toISOString()} (cron ${CRON_EXPRESSION})`);
  };
  scheduleEpaper();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});