import postgres from 'npm:postgres@3.4.5'

const databaseUrl = Deno.env.get('SUPABASE_DB_URL')
if (!databaseUrl) throw new Error('SUPABASE_DB_URL is required')

const db = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
})

type Classification = 'model_payload' | 'quota' | 'latency' | 'healthy'
type SummaryRow = {
  provider: string
  model: string | null
  classification: Classification
  failure_count: number
  success_count: number
  avg_latency_ms: number | string | null
}

function hasServiceRoleClaim(req: Request): boolean {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return false
  const parts = authorization.slice(7).split('.')
  if (parts.length !== 3) return false

  try {
    const base64url = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64url.padEnd(Math.ceil(base64url.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded)) as { role?: unknown }
    // Edge gateway signature verification is required via verify_jwt=true.
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

async function fingerprintFor(provider: string, model: string | null, classification: Classification): Promise<string> {
  const stableLabel = `${provider}\u001f${model ?? ''}\u001f${classification}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableLabel))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  }

  // The Edge gateway must keep verify_jwt enabled; this handler also requires
  // the verified JWT to carry the service_role claim.
  if (!hasServiceRoleClaim(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - 60 * 60 * 1000)
  const runId = crypto.randomUUID()

  try {
    const rows = await db<SummaryRow[]>`
      WITH base_events AS (
        SELECT
          CASE
            WHEN provider ~ '^[a-z0-9_-]{1,40}$' THEN lower(provider)
            ELSE 'unknown'
          END AS provider,
          CASE
            WHEN model ~ '^[a-zA-Z0-9._:/-]{1,100}$' THEN model
            ELSE NULL
          END AS model,
          outcome,
          latency_ms,
          CASE
            WHEN outcome = 'invalid_request'
              OR status_code = 400
              OR lower(coalesce(error_code, '')) IN ('provider_http_400', 'invalid_request')
              OR lower(coalesce(final_error_code, '')) IN ('provider_http_400', 'invalid_request')
              THEN 'model_payload'
            WHEN status_code = 429
              OR lower(coalesce(error_code, '')) = 'provider_rate_limited'
              OR lower(coalesce(final_error_code, '')) = 'provider_rate_limited'
              THEN 'quota'
            WHEN outcome = 'timeout'
              OR status_code IN (0, 408, 504)
              OR lower(coalesce(error_code, '')) LIKE '%timeout%'
              OR lower(coalesce(error_code, '')) LIKE '%abort%'
              OR lower(coalesce(final_error_code, '')) LIKE '%timeout%'
              OR lower(coalesce(final_error_code, '')) LIKE '%abort%'
              THEN 'latency'
            ELSE NULL
          END AS classification
        FROM public.ai_gateway_usage_events
        WHERE created_at >= ${windowStart}
          AND created_at < ${windowEnd}
      ),
      provider_model_totals AS (
        SELECT
          provider,
          model,
          count(*) FILTER (WHERE outcome = 'success')::int AS success_count,
          round(avg(latency_ms)::numeric, 2)::numeric(12,2) AS avg_latency_ms
        FROM base_events
        GROUP BY provider, model
      ),
      failure_totals AS (
        SELECT provider, model, classification, count(*)::int AS failure_count
        FROM base_events
        WHERE classification IS NOT NULL
        GROUP BY provider, model, classification
      ),
      summary_rows AS (
        SELECT
          f.provider,
          f.model,
          f.classification,
          f.failure_count,
          t.success_count,
          t.avg_latency_ms
        FROM failure_totals f
        JOIN provider_model_totals t
          ON t.provider = f.provider
         AND t.model IS NOT DISTINCT FROM f.model
        UNION ALL
        SELECT
          t.provider,
          t.model,
          'healthy'::text AS classification,
          0::int AS failure_count,
          t.success_count,
          t.avg_latency_ms
        FROM provider_model_totals t
        WHERE NOT EXISTS (
          SELECT 1
          FROM failure_totals f
          WHERE f.provider = t.provider
            AND f.model IS NOT DISTINCT FROM t.model
        )
      )
      SELECT provider, model, classification, failure_count, success_count, avg_latency_ms
      FROM summary_rows
      ORDER BY provider, model, classification
    `

    let inserted = 0
    const logRows: Array<Record<string, string | number | null>> = []

    for (const row of rows) {
      const fingerprint = await fingerprintFor(row.provider, row.model, row.classification)
      const result = await db`
        INSERT INTO private.ai_gateway_health_summaries (
          run_id,
          window_start,
          window_end,
          provider,
          model,
          classification,
          failure_count,
          success_count,
          avg_latency_ms,
          fingerprint
        ) VALUES (
          ${runId}::uuid,
          ${windowStart},
          ${windowEnd},
          ${row.provider},
          ${row.model},
          ${row.classification},
          ${Number(row.failure_count)},
          ${Number(row.success_count)},
          ${row.avg_latency_ms},
          ${fingerprint}
        )
        ON CONFLICT (run_id, fingerprint) DO NOTHING
        RETURNING 1
      `
      inserted += result.length
      logRows.push({
        provider: row.provider,
        model: row.model,
        classification: row.classification,
        failure_count: Number(row.failure_count),
        success_count: Number(row.success_count),
        avg_latency_ms: row.avg_latency_ms === null ? null : Number(row.avg_latency_ms),
      })
    }

    console.info('api_health_monitor_summary', {
      mode: 'monitor_only',
      run_id: runId,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      rows_written: inserted,
      summaries: logRows,
    })

    return Response.json({
      ok: true,
      mode: 'monitor_only',
      run_id: runId,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      rows_written: inserted,
      classifications: rows.length,
    })
  } catch {
    // Never log database errors, raw event fields, request body, or secrets.
    console.error('api_health_monitor_failed', { reason: 'summary_processing_failed' })
    return Response.json({ error: 'monitor_failed' }, { status: 500 })
  }
})