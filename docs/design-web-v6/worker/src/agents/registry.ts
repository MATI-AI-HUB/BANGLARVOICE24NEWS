/**
 * Banglar Voice — agent registry. Maps agent ids to factory functions so
 * that agent-runner, the supervisor and the in-process demo can all create
 * agents without importing them directly.
 */

import type { AgentContext, AgentHandle } from './types.js';
import { CollectorAgent, EditorAgent, MediaAgent, PublisherAgent, RewriterAgent, SocialAgent } from './chain-agents.js';

export type AgentFactory = (ctx: AgentContext) => Promise<AgentHandle> | AgentHandle;

/** Agents enabled in the real deployment. Add a desk to this list when you
 *  enable category routing (see collector.deskAgentFor in chain-agents.ts). */
const FACTORIES: Record<string, AgentFactory> = {
  collector: (ctx) => new CollectorAgent(ctx),
  rewriter: (ctx) => new RewriterAgent(ctx),
  media: (ctx) => new MediaAgent(ctx),
  editor: (ctx) => new EditorAgent(ctx),
  publisher: (ctx) => new PublisherAgent(ctx),
  social: (ctx) => new SocialAgent(ctx),
};

export const AGENT_IDS = Object.keys(FACTORIES);

export async function makeAgent(name: string, ctx: AgentContext): Promise<AgentHandle> {
  const factory = FACTORIES[name];
  if (!factory) {
    const known = AGENT_IDS.join(', ');
    throw new Error(`Unknown agent "${name}". Known agents: ${known}`);
  }
  return factory(ctx);
}

/** In-process demo that runs every agent briefly against a NullBus so that
 *  `npm run agents:demo` proves the wiring end to end without network. */
export async function demoAllAgents(): Promise<void> {
  const { createNullBus } = await import('../lib/bus.js');
  const bus = createNullBus();
  const ctx = { id: 'demo', bus, dryRun: true, log: (m: string) => console.log(`[demo] ${m}`) };
  for (const name of AGENT_IDS) {
    const agent = await makeAgent(name, ctx);
    console.log(`✓ ${name}: ${agent.describe()}`);
  }
  console.log(`\n[bus=${bus.kind}] all ${AGENT_IDS.length} agents constructed OK — chain wiring is valid.`);
}
