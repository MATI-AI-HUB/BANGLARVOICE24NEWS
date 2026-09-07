/**
 * Banglar Voice — multi-agent core types.
 *
 * An AGENT is an independent, self-contained worker with:
 *   - its own id, its own loop/trigger (tick()),
 *   - its own state (cursor + private files / DB),
 *   - its own queue (its cursor on the shared bus = its inbox).
 *
 * Agents communicate ONLY through the shared bus (src/lib/bus.ts) — never by
 * direct imports of each other's functions — so each can run in its own
 * process/container and be scaled independently.
 */

import type { AgentBus } from '../lib/bus.js';

export type AgentContext = {
  /** Unique agent id, e.g. 'collector', 'desk-politics', 'business-ads'. */
  id: string;
  bus: AgentBus;
  log: (m: string) => void;
  /** Dry-run: never touch the network / never write to external services. */
  dryRun: boolean;
};

export type AgentHandle = {
  id: string;
  /** Topics this agent consumes (its queue interests). */
  topics: string[];
  /**
   * One non-blocking pass: consume any waiting messages for this agent and
   * perform one unit of scheduled work (if its interval elapsed). Returns the
   * number of messages handled. Called repeatedly by the runner loop.
   */
  tick(): Promise<number>;
  /** Human-readable one-liner describing what the agent does. */
  describe(): string;
};

/** Common message topics exchanged on the bus (the CHAIN). */
export const TOPIC = {
  /** collector/desk → rewriter. Payload: PipelineItem (state: collected). */
  COLLECTED: 'story.collected',
  /** rewriter → media. Payload: PipelineItem + rewritten. */
  REWRITTEN: 'story.rewritten',
  /** media → editor. Payload: PipelineItem + rewritten + media. */
  MEDIA_READY: 'story.media_ready',
  /** editor → publisher. Payload: full PipelineItem. */
  APPROVED: 'story.approved',
  /** publisher → social. Payload: full PipelineItem (published). */
  PUBLISHED: 'story.published',
  /** social → supervisor. Payload: full PipelineItem (broadcast). */
  BROADCAST: 'story.broadcast',
  REJECTED: 'story.rejected',
  /** editorial control (telegram/supervisor → editor). */
  CTRL_APPROVE: 'control.approve',
  CTRL_REJECT: 'control.reject',
  CTRL_PAUSE: 'control.pause',
  CTRL_RESUME: 'control.resume',
  CTRL_STATUS: 'control.status',
  /** liveness / business agents → supervisor. */
  HEARTBEAT: 'agent.heartbeat',
  BUSINESS_SUMMARY: 'business.summary',
} as const;
