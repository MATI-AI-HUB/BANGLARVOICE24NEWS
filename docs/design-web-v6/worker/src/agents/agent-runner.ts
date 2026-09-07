/**
 * Banglar Voice — agent runner.
 *
 *   AGENT=collector  npm run agent     # run one agent in its own process
 *   npm run agents:demo                # run every agent briefly in-process
 *
 * Each agent process: builds the bus, instantiates the requested agent, then
 * ticks it every AGENT_TICK_SECONDS (default 10) until SIGINT/SIGTERM.
 */

import { createBus } from '../lib/bus.js';
import { makeAgent } from './registry.js';
import type { AgentHandle } from './types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const agentName = process.env['AGENT'];
  const tickSeconds = Math.max(1, Number(process.env['AGENT_TICK_SECONDS'] ?? '10'));
  if (!agentName) {
    console.error('AGENT env missing. Run e.g. AGENT=collector npm run agent');
    process.exit(1);
  }
  const bus = createBus();
  const dryRun = process.env['AGENT_DRY_RUN'] === 'true';
  const log = (m: string) => console.log(`${new Date().toISOString()} [${agentName}] ${m}`);
  const agent: AgentHandle = await makeAgent(agentName, { id: agentName, bus, log, dryRun });
  log(`started (tick ${tickSeconds}s, bus=${bus.kind}, dryRun=${dryRun}): ${agent.describe()}`);

  const stop = () => {
    log('stopping');
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // Publish a heartbeat so the supervisor can see this agent is alive.
  await bus
    .publish({ topic: 'agent.heartbeat', type: 'heartbeat', from: agentName, to: '*', payload: { agent: agentName, at: new Date().toISOString(), dryRun } })
    .catch(() => undefined);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const handled = await agent.tick();
      if (handled > 0) log(`tick handled ${handled} message(s)`);
    } catch (e) {
      log(`tick ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(tickSeconds * 1000);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
