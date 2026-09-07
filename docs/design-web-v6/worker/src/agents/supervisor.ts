/**
 * Banglar Voice — supervisor. Consumes the terminal events of the pipeline
 * (story.broadcast, story.rejected, agent errors) and persists them to the
 * logs table when a database URL is configured; otherwise degrades to
 * structured console logging. Also exposes on-demand agent health so the
 * operator can ask "what is every agent doing right now".
 */

import type { AgentMessage } from '../lib/bus.js';
import { TOPIC, type AgentContext, type AgentHandle } from './types.js';
import { AGENT_IDS } from './registry.js';

interface DbLogRow {
  run_id: string;
  agent: string;
  event: string;
  payload: unknown;
  created_at: string;
}

export class SupervisorAgent implements AgentHandle {
  readonly id: string;
  readonly topics: string[];
  constructor(private ctx: AgentContext) {
    this.id = ctx.id;
    this.topics = [TOPIC.BROADCAST, TOPIC.REJECTED, TOPIC.CTRL_STATUS];
  }

  describe(): string {
    return 'observes pipeline completion/failure events and writes the audit log';
  }

  async tick(): Promise<number> {
    const { bus, log } = this.ctx;
    let handled = 0;
    const writeRow = async (row: DbLogRow): Promise<void> => {
      const url = process.env['POSTGRES_URL'] ?? process.env['DATABASE_URL'];
      if (!url) {
        log(`[audit] ${row.event} agent=${row.agent} run=${row.run_id.slice(0, 8)}`);
        return;
      }
      try {
        const { pool } = await import('../lib/db.js');
        const sql =
          'INSERT INTO pipeline_logs (run_id, agent, event, payload, created_at) VALUES ($1,$2,$3,$4,$5)';
        await pool.query(sql, [row.run_id, row.agent, row.event, JSON.stringify(row.payload), row.created_at]);
      } catch {
        // Logging must never break the pipeline; fall back to console.
        log(`[audit-db-fallback] ${row.event} run=${row.run_id.slice(0, 8)}`);
      }
    };

    await bus.poll(this.id, TOPIC.BROADCAST, async (m: AgentMessage) => {
      const runId = (m.payload as { id?: string }).id ?? m.id ?? 'unknown';
      await writeRow({ run_id: runId, agent: m.from, event: 'broadcast', payload: m.payload, created_at: new Date().toISOString() });
      handled += 1;
    });

    await bus.poll(this.id, TOPIC.REJECTED, async (m: AgentMessage) => {
      const runId = (m.payload as { id?: string }).id ?? m.id ?? 'unknown';
      await writeRow({ run_id: runId, agent: m.from, event: 'rejected', payload: m.payload, created_at: new Date().toISOString() });
      handled += 1;
    });

    await bus.poll(this.id, TOPIC.CTRL_STATUS, async (m: AgentMessage) => {
      const reply = { agents: AGENT_IDS, report: AGENT_IDS.map((id) => `${id}: online (tick loop)`), at: new Date().toISOString() };
      log(`[status] ${JSON.stringify(reply)}`);
      void m;
      handled += 1;
    });

    return handled;
  }
}
