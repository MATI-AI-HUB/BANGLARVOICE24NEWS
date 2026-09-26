import { loadConfig } from "./config.js";
import { runPipeline } from "./agents/orchestrator.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const started = Date.now();
  const result = await runPipeline(cfg);
  console.log(
    `[${new Date().toISOString()}] once-cycle ${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `collected=${result.collected} published=${result.published} rejected=${result.rejected}`,
  );
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
