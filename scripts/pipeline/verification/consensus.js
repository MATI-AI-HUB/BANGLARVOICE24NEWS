/**
 * consensus.js — Weighted voting engine
 */
const cfg = require('./config');

function computeConsensus(agentResults, agentWeights = {}) {
  const weights = { ...cfg.DEFAULT_WEIGHTS, ...agentWeights };

  let totalWeight = 0;
  let weightedScore = 0;
  let weightedConfidence = 0;
  let failCount = 0;
  let errorCount = 0;
  let criticalFail = null;
  let criticalFailAgent = null;

  for (const r of agentResults) {
    const w = r.weight || weights[r.agent_name] || 1.0;
    totalWeight += w;

    if (r.verdict === 'error') {
      // Rate limit errors — skip from score calculation entirely
      const isRateLimit = /rate limit/i.test(r.reasoning || '');
      if (isRateLimit) {
        // Don't penalize; just subtract from total weight
        totalWeight -= w;
        continue;
      }
      errorCount++;
      // Other errors — count as half-weight fails
      weightedScore += 50 * w * 0.5;
      weightedConfidence += 0.5 * w;
      continue;
    }

    weightedScore += (r.score || 0) * w * (r.confidence || 0.5);
    weightedConfidence += (r.confidence || 0.5) * w;

    if (r.verdict === 'fail') {
      failCount++;
      if (r.is_critical && !criticalFail) {
        criticalFail = r;
        criticalFailAgent = r.agent_name;
      }
    }
  }

  const score = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const confidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

  let verdict, humanAction;
  if (criticalFail) {
    verdict = 'auto_reject';
    humanAction = 'critical_fail';
  } else if (errorCount >= 3) {
    verdict = 'human_review';
    humanAction = 'too_many_errors';
  } else if (score >= cfg.THRESHOLDS.AUTO_APPROVE && confidence >= cfg.THRESHOLDS.MIN_CONFIDENCE) {
    verdict = 'auto_approve';
    humanAction = 'bulk_approve';
  } else if (score >= cfg.THRESHOLDS.EYEBALL && confidence >= 0.70) {
    verdict = 'human_eyeball';
    humanAction = 'quick_glance';
  } else if (score >= cfg.THRESHOLDS.REVIEW) {
    verdict = 'human_review';
    humanAction = 'careful_check';
  } else {
    verdict = 'auto_reject';
    humanAction = 'below_threshold';
  }

  // Build reasoning summary
  const lines = [];
  if (criticalFail) {
    lines.push(`❌ CRITICAL: ${criticalFailAgent} agent failed — auto-reject`);
    lines.push(`   Reason: ${criticalFail.reasoning}`);
  }
  if (errorCount > 0) lines.push(`⚠️  ${errorCount} agent(s) errored`);
  if (failCount > 0 && !criticalFail) lines.push(`⚠️  ${failCount} agent(s) flagged fail`);

  const sorted = [...agentResults].sort((a, b) => (b.weight || 1) - (a.weight || 1));
  for (const r of sorted) {
    if (r.verdict === 'pass') continue;
    lines.push(`  • [${r.agent_name}] ${r.score}/100 — ${r.reasoning?.slice(0, 120) || ''}`);
  }

  return {
    score: parseFloat(score.toFixed(2)),
    confidence: parseFloat(confidence.toFixed(3)),
    verdict,
    humanAction,
    failCount,
    errorCount,
    criticalFail: !!criticalFail,
    criticalFailAgent,
    agentsCount: agentResults.length,
    reasoning: lines.join('\n'),
  };
}

module.exports = { computeConsensus };
