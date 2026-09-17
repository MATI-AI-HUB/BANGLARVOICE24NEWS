/**
 * db.js — Supabase/Postgres helpers for verification system
 */
const { Client } = require('pg');
const cfg = require('./config');

let _client = null;

async function getClient() {
  if (_client) return _client;
  _client = new Client({ connectionString: cfg.DB_URL, ssl: { rejectUnauthorized: false } });
  await _client.connect();
  return _client;
}

async function closeClient() {
  if (_client) { await _client.end(); _client = null; }
}

// Create queue entry
async function createQueueEntry(contentType, contentId, snapshot = {}, priority = 5) {
  const c = await getClient();
  const { rows } = await c.query(
    `INSERT INTO verification_queue (content_type, content_id, content_snapshot, priority)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [contentType, contentId, JSON.stringify(snapshot), priority]
  );
  return rows[0].id;
}

// Update queue status
async function updateQueueStatus(queueId, status, extra = {}) {
  const c = await getClient();
  const fields = ['status = $2', 'updated_at = NOW()'];
  const values = [queueId, status];
  let idx = 3;
  for (const [key, val] of Object.entries(extra)) {
    fields.push(`${key} = $${idx}`);
    values.push(val);
    idx++;
  }
  await c.query(`UPDATE verification_queue SET ${fields.join(', ')} WHERE id = $1`, values);
}

// Save AI agent verification result
async function saveAIVerification(queueId, result) {
  const c = await getClient();
  const { rows } = await c.query(
    `INSERT INTO ai_verifications 
      (queue_id, agent_name, agent_model, passed, score, confidence, verdict,
       reasoning, evidence, flagged_items, suggestions, duration_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      queueId,
      result.agent_name,
      result.model || null,
      result.passed,
      result.score || 0,
      result.confidence || 0,
      result.verdict || 'pass',
      result.reasoning || '',
      JSON.stringify(result.evidence || {}),
      JSON.stringify(result.flagged_items || []),
      JSON.stringify(result.suggestions || []),
      result.duration_ms || 0,
    ]
  );
  return rows[0].id;
}

// Update queue with consensus
async function saveConsensus(queueId, consensus, agentsCount, durationMs) {
  const c = await getClient();
  await c.query(
    `UPDATE verification_queue SET
       status = 'ai_complete',
       ai_consensus_score = $2,
       ai_consensus_verdict = $3,
       ai_confidence = $4,
       ai_agents_count = $5,
       ai_duration_ms = $6,
       ai_completed_at = NOW(),
       updated_at = NOW()
     WHERE id = $1`,
    [queueId, consensus.score, consensus.verdict, consensus.confidence, agentsCount, durationMs]
  );
}

// Get agent weights from DB (adaptive)
async function getAgentWeights() {
  const c = await getClient();
  const { rows } = await c.query('SELECT agent_name, current_weight FROM agent_performance');
  const weights = { ...cfg.DEFAULT_WEIGHTS };
  for (const r of rows) {
    weights[r.agent_name] = parseFloat(r.current_weight);
  }
  return weights;
}

// Get queue entry with AI verifications
async function getQueueDetails(queueId) {
  const c = await getClient();
  const q = await c.query('SELECT * FROM verification_queue WHERE id = $1', [queueId]);
  const a = await c.query('SELECT * FROM ai_verifications WHERE queue_id = $1 ORDER BY agent_name', [queueId]);
  return { queue: q.rows[0], verifications: a.rows };
}

// Log audit
async function logAudit(queueId, action, actor, actorType, details = {}) {
  const c = await getClient();
  await c.query(
    `INSERT INTO verification_audit (queue_id, action, actor, actor_type, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [queueId, action, actor, actorType, JSON.stringify(details)]
  );
}

// Update article verification status
async function updateArticleStatus(articleId, status, extra = {}) {
  const c = await getClient();
  const fields = ['verification_status = $2'];
  const values = [articleId, status];
  let idx = 3;
  for (const [key, val] of Object.entries(extra)) {
    fields.push(`${key} = $${idx}`);
    values.push(val);
    idx++;
  }
  await c.query(`UPDATE articles SET ${fields.join(', ')} WHERE id = $1`, values);
}

module.exports = {
  getClient, closeClient,
  createQueueEntry, updateQueueStatus, saveAIVerification, saveConsensus,
  getAgentWeights, getQueueDetails, logAudit, updateArticleStatus,
};
