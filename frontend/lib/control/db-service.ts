/**
 * DB Service — read-only stats, cron, pipeline data.
 */
import { Client } from 'pg';

function pgClient(): Client {
  const conn = process.env.SUPABASE_DB_URL;
  if (!conn) throw new Error('SUPABASE_DB_URL missing');
  return new Client({ connectionString: conn });
}

export type DashboardStats = {
  articles: { total: number; published: number; pending: number; archived: number; last24h: number };
  users: { total: number; admins: number; editors: number; reporters: number };
  secrets: { total: number; active: number };
  pipeline: { lastRunAt: string | null; runsLast24h: number };
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const c = pgClient();
  await c.connect();
  try {
    const articles = await c.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
        COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS last_24h
      FROM articles`);
    const users = await c.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
        COUNT(*) FILTER (WHERE role IN ('chief_editor', 'desk_editor'))::int AS editors,
        COUNT(*) FILTER (WHERE role IN ('staff_reporter', 'citizen_reporter'))::int AS reporters
      FROM profiles`);
    const secrets = await c.query(`
      SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active FROM api_vault`);
    const pipeline = await c.query(`
      SELECT MAX(created_at) AS last_run_at,
        COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS runs_24h
      FROM ai_audit_log`);

    return {
      articles: {
        total: articles.rows[0].total,
        published: articles.rows[0].published,
        pending: articles.rows[0].pending,
        archived: articles.rows[0].archived,
        last24h: articles.rows[0].last_24h,
      },
      users: users.rows[0],
      secrets: secrets.rows[0],
      pipeline: {
        lastRunAt: pipeline.rows[0].last_run_at,
        runsLast24h: pipeline.rows[0].runs_24h,
      },
    };
  } finally {
    await c.end();
  }
}

export type CronJob = { jobname: string; schedule: string; active: boolean; last_run?: string | null };

export async function listCronJobs(): Promise<CronJob[]> {
  const c = pgClient();
  await c.connect();
  try {
    const r = await c.query(`
      SELECT j.jobname, j.schedule, j.active,
        (SELECT MAX(start_time)::text FROM cron.job_run_details d WHERE d.jobid = j.jobid) AS last_run
      FROM cron.job j ORDER BY j.jobname`);
    return r.rows.map((row) => ({
      jobname: row.jobname,
      schedule: row.schedule,
      active: row.active === true,
      last_run: row.last_run,
    }));
  } finally {
    await c.end();
  }
}

export type PipelineRun = {
  id: string; model: string; provider: string;
  status: string; latency_ms: number | null; created_at: string;
};

export async function listPipelineRuns(limit = 50): Promise<PipelineRun[]> {
  const c = pgClient();
  await c.connect();
  try {
    const r = await c.query(
      `SELECT id, model, provider, status, latency_ms, created_at
       FROM ai_audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return r.rows;
  } finally {
    await c.end();
  }
}

export type CategoryStat = { category_key: string | null; total: number; published: number; pending: number };

export async function getCategoryStats(): Promise<CategoryStat[]> {
  const c = pgClient();
  await c.connect();
  try {
    const r = await c.query(`
      SELECT category_key,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM articles GROUP BY category_key ORDER BY total DESC`);
    return r.rows;
  } finally {
    await c.end();
  }
}
