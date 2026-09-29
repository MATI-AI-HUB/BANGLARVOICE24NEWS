import { loadConfig } from "./config.js";
import { runPipeline } from "./agents/orchestrator.js";
import { lastSuccessfulRunAt, isStale, HEALTH_STALE_HOURS } from "./lib/pipeline.js";
import { sendTelegramAlert } from "./agents/supervisor.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const started = Date.now();
  const result = await runPipeline(cfg);
  console.log(
    `[${new Date().toISOString()}] once-cycle ${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `collected=${result.collected} published=${result.published} rejected=${result.rejected} ` +
      `skipped=${result.skipped} pending=${result.pending}`,
  );

  const lastOk = await lastSuccessfulRunAt(cfg);
  if (isStale(lastOk)) {
    await sendTelegramAlert(
      cfg,
      `Banglar Voice pipeline stale: last success ${lastOk ?? "never"} (threshold ${HEALTH_STALE_HOURS}h). ` +
        `this cycle published=${result.published} rejected=${result.rejected}`,
    );
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
