/**
 * Banglar Voice — agent message bus.
 *
 * THE independence primitive. Agents NEVER call each other's functions.
 * They communicate ONLY by publishing/consuming messages on this bus, so each
 * agent can run in its own process/container and be scaled independently.
 *
 * Two interchangeable transports:
 *   1. FileBus    — append-only JSONL + per-consumer cursor files. Works with
 *                   zero configuration for local multi-process / dev / demo.
 *   2. SupabaseBus — agent_bus table (see supabase/agent_bus_migration.sql).
 *                   The scale-out option for multiple VMs/containers.
 *
 * Select with AGENT_BUS=file|supabase (default file).
 *
 * Envelope:
 *   { seq, id, topic, type, from, to, payload, ts }
 *   topic  — routing topic, e.g. 'story.collected' (see agents for the list)
 *   to     — target agent id, or '*' for broadcast
 */

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type AgentMessage<P = unknown> = {
  seq: number;
  id: string;
  topic: string;
  type: string;
  from: string;
  to: string;
  payload: P;
  ts: string;
};

export type NewAgentMessage<P = unknown> = Omit<AgentMessage<P>, 'seq' | 'id' | 'ts'>;

export interface AgentBus {
  readonly kind: 'file' | 'supabase';
  /** Append one message; returns the stored envelope (with seq/id/ts). */
  publish<P>(msg: NewAgentMessage<P>): Promise<AgentMessage<P>>;
  /**
   * Deliver messages published after this consumer's cursor that match
   * `topic` (null = any topic) AND (`to` = consumerId or '*'). Invokes
   * handler sequentially per message. Returns number of messages handled.
   * Never throws for a missing file/table — returns 0.
   */
  poll(
    consumerId: string,
    topic: string | null,
    handler: (m: AgentMessage) => Promise<void> | void,
  ): Promise<number>;
}

export function newMessageId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* FileBus — append-only JSONL + per-consumer cursor files             */
/* ------------------------------------------------------------------ */

export class FileBus implements AgentBus {
  readonly kind = 'file' as const;
  private seq = 0;
  private initialized = false;

  constructor(
    private file = process.env['AGENT_BUS_FILE'] ?? '.bus/agent-bus.jsonl',
    private cursorDir = process.env['AGENT_BUS_CURSOR_DIR'] ?? '.bus/cursors',
  ) {}

  private async ensureFile(): Promise<void> {
    if (this.initialized) return;
    await mkdir(dirname(this.file), { recursive: true });
    await mkdir(this.cursorDir, { recursive: true });
    if (!existsSync(this.file)) await writeFile(this.file, '', 'utf8');
    // Recover the next seq from the existing log so restarts never collide.
    const raw = await readFile(this.file, 'utf8').catch(() => '');
    this.seq = raw ? raw.split('\n').filter((l) => l.trim().length > 0).length : 0;
    this.initialized = true;
  }

  async publish<P>(msg: NewAgentMessage<P>): Promise<AgentMessage<P>> {
    await this.ensureFile();
    this.seq += 1;
    const stored: AgentMessage<P> = {
      seq: this.seq,
      id: newMessageId(),
      ts: new Date().toISOString(),
      ...msg,
    };
    await appendFile(this.file, `${JSON.stringify(stored)}\n`, 'utf8');
    return stored;
  }

  private cursorFile(consumerId: string): string {
    return join(this.cursorDir, `${consumerId}.cursor`);
  }

  private async readCursor(consumerId: string): Promise<number> {
    try {
      const raw = await readFile(this.cursorFile(consumerId), 'utf8');
      const n = Number(raw.trim());
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  }

  private async writeCursor(consumerId: string, seq: number): Promise<void> {
    await mkdir(this.cursorDir, { recursive: true });
    await writeFile(this.cursorFile(consumerId), String(seq), 'utf8');
  }

  async poll(
    consumerId: string,
    topic: string | null,
    handler: (m: AgentMessage) => Promise<void> | void,
  ): Promise<number> {
    try {
      await this.ensureFile();
    } catch {
      return 0;
    }
    let handled = 0;
    try {
      const raw = await readFile(this.file, 'utf8');
      const cursor = await this.readCursor(consumerId);
      let last = cursor;
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        let m: AgentMessage;
        try {
          m = JSON.parse(line) as AgentMessage;
        } catch {
          continue;
        }
        if (m.seq <= cursor) continue;
        last = m.seq;
        const topicMatch = topic === null || m.topic === topic;
        const toMatch = m.to === consumerId || m.to === '*';
        if (topicMatch && toMatch) {
          handled += 1;
          await handler(m);
        }
      }
      if (last > cursor) await this.writeCursor(consumerId, last);
      return handled;
    } catch {
      return 0;
    }
  }
}

/* ------------------------------------------------------------------ */
/* SupabaseBus — agent_bus table (scale-out transport)                 */
/* ------------------------------------------------------------------ */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type BusRow = {
  id: number;
  topic: string;
  from_agent: string;
  to_agent: string;
  type: string;
  payload: unknown;
  created_at: string;
};

export class SupabaseBus implements AgentBus {
  readonly kind = 'supabase' as const;
  private db: SupabaseClient;

  constructor() {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!url || !key) throw new Error('SupabaseBus needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    this.db = createClient(url, key, { auth: { persistSession: false } });
  }

  async publish<P>(msg: NewAgentMessage<P>): Promise<AgentMessage<P>> {
    const { data, error } = await this.db
      .from('agent_bus')
      .insert({
        topic: msg.topic,
        type: msg.type,
        from_agent: msg.from,
        to_agent: msg.to,
        payload: msg.payload as Record<string, unknown>,
      })
      .select('id, topic, from_agent, to_agent, type, payload, created_at')
      .single();
    if (error) throw error;
    const row = data as BusRow;
    return {
      seq: row.id,
      id: `sb_${row.id}`,
      topic: row.topic,
      type: row.type,
      from: row.from_agent,
      to: row.to_agent,
      payload: row.payload as P,
      ts: row.created_at,
    };
  }

  private async cursor(consumerId: string): Promise<number> {
    const { data } = await this.db
      .from('agent_bus_cursor')
      .select('last_id')
      .eq('agent', consumerId)
      .maybeSingle();
    return (data?.last_id as number | undefined) ?? 0;
  }

  private async setCursor(consumerId: string, lastId: number): Promise<void> {
    await this.db.from('agent_bus_cursor').upsert(
      { agent: consumerId, last_id: lastId, updated_at: new Date().toISOString() },
      { onConflict: 'agent' },
    );
  }

  async poll(
    consumerId: string,
    topic: string | null,
    handler: (m: AgentMessage) => Promise<void> | void,
  ): Promise<number> {
    let cursor = await this.cursor(consumerId).catch(() => 0);
    let query = this.db
      .from('agent_bus')
      .select('id, topic, from_agent, to_agent, type, payload, created_at')
      .gt('id', cursor)
      .or(`to_agent.eq.${consumerId},to_agent.eq.*`)
      .order('id', { ascending: true })
      .limit(200);
    if (topic) query = query.eq('topic', topic);
    const { data, error } = await query;
    if (error || !data) return 0;
    let handled = 0;
    for (const row of data as BusRow[]) {
      cursor = Math.max(cursor, row.id);
      handled += 1;
      await handler({
        seq: row.id,
        id: `sb_${row.id}`,
        topic: row.topic,
        type: row.type,
        from: row.from_agent,
        to: row.to_agent,
        payload: row.payload,
        ts: row.created_at,
      });
    }
    await this.setCursor(consumerId, cursor).catch(() => undefined);
    return handled;
  }
}

/** Build the bus selected by AGENT_BUS env (default file). */
export function createBus(): AgentBus {
  const mode = (process.env['AGENT_BUS'] ?? 'file').trim().toLowerCase();
  if (mode === 'supabase') return new SupabaseBus();
  return new FileBus();
}
