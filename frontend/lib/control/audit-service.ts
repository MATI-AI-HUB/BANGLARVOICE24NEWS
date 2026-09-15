/**
 * Audit Service — log sensitive admin actions.
 * Table: audit_log (id uuid, actor_id uuid, action text, detail jsonb, created_at)
 */
import { Client } from 'pg';

function pgClient(): Client {
  const conn = process.env.SUPABASE_DB_URL;
  if (!conn) throw new Error('SUPABASE_DB_URL missing');
  return new Client({ connectionString: conn });
}

export type AuditEntry = {
  actor_id: string;
  actor_email?: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
};

export async function logAction(entry: AuditEntry): Promise<void> {
  try {
    const c = pgClient();
    await c.connect();
    try {
      const detail = {
        target: entry.target,
        actor_email: entry.actor_email || null,
        ...(entry.metadata || {}),
      };
      await c.query(
        `INSERT INTO audit_log (actor_id, action, detail, created_at)
         VALUES ($1, $2, $3::jsonb, now())`,
        [entry.actor_id, entry.action, JSON.stringify(detail)],
      );
    } finally {
      await c.end();
    }
  } catch (e) {
    console.error('[audit] failed:', e);
  }
}

export type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export async function listAudit(limit = 100): Promise<AuditRow[]> {
  const c = pgClient();
  await c.connect();
  try {
    const r = await c.query(
      `SELECT id, actor_id, action, detail, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return r.rows;
  } finally {
    await c.end();
  }
}
