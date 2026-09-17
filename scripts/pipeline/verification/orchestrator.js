const db = require('./db');
const cache = require('./semantic-cache');
const { computeConsensus } = require('./consensus');
const { FactCheckerAgent } = require('./agents/fact-checker');
const { LanguageAgent } = require('./agents/language');
const { ImageAgent } = require('./agents/image');

const AGENTS = [
  new FactCheckerAgent(),
  new LanguageAgent(),
  new ImageAgent(),
];

async function getRelatedArticles(client, article) {
  const { rows } = await client.query(
    `SELECT title_bn, published_at FROM articles
     WHERE category_key = $1 AND id != $2 AND status = 'published'
     ORDER BY published_at DESC LIMIT 5`,
    [article.category_key, article.id]
  );
  return rows;
}

async function verifyArticle(article) {
  const client = await db.getClient();
  const startTime = Date.now();

  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  🤖 AI VERIFICATION');
  console.log('══════════════════════════════════════════════');
  console.log('');
  console.log('📰 ' + article.title_bn.slice(0, 60));
  console.log('   Category: ' + article.category_key);
  console.log('');

  const queueId = await db.createQueueEntry('article', article.id, {
    title_bn: article.title_bn,
    category_key: article.category_key,
  }, 5);
  console.log('✅ Queue entry: ' + queueId);
  console.log('');

  await db.logAudit(queueId, 'submitted', 'system', 'system', {});
  await db.updateQueueStatus(queueId, 'ai_processing', { ai_started_at: new Date() });

  const relatedArticles = await getRelatedArticles(client, article);

  console.log('🧠 Running ' + AGENTS.length + ' agents in parallel...');
  console.log('');

  // Sequential with generous delay between agents
  const { sleep } = require('./config');
  const results = [];
  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    const t0 = Date.now();

    // Check semantic cache first
    let result = await cache.get(agent.name, article);
    if (result) {
      const icon = result.verdict === 'pass' ? '✅' : '⚠️ ';
      console.log('   ' + icon + ' ' + agent.name.padEnd(15) + ' ' + String(result.score).padStart(5) + '/100 (CACHED)');
      results.push(result);
      continue;
    }

    // Run agent
    result = await agent.run({
      article,
      relatedArticles,
      images: article.featured_image ? [{ url: article.featured_image }] : [],
    });

    // Cache successful result
    if (result.verdict !== 'error') {
      await cache.set(agent.name, article, result);
    }
    const icon = result.verdict === 'pass' ? '✅' : result.verdict === 'warn' ? '⚠️ ' : '❌';
    console.log('   ' + icon + ' ' + result.agent_name.padEnd(15) + ' ' + String(result.score).padStart(5) + '/100 (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
    results.push(result);

    // 3 sec gap between agents (except after last)
    if (i < AGENTS.length - 1) {
      console.log('   ⏸️  Waiting 3s before next agent...');
      await sleep(3000);
    }
  }

  console.log('');

  for (const r of results) {
    await db.saveAIVerification(queueId, r);
  }

  const weights = await db.getAgentWeights();
  const consensus = computeConsensus(results, weights);

  console.log('══════════════════════════════════════════════');
  console.log('  📊 CONSENSUS');
  console.log('══════════════════════════════════════════════');
  console.log('  Score:      ' + consensus.score + '/100');
  console.log('  Confidence: ' + consensus.confidence);
  console.log('  Verdict:    ' + consensus.verdict.toUpperCase());
  console.log('  Action:     ' + consensus.humanAction);
  console.log('');

  if (consensus.reasoning) {
    console.log('  Reasoning:');
    console.log('  ' + consensus.reasoning.split('\n').join('\n  '));
    console.log('');
  }

  const duration = Date.now() - startTime;
  await db.saveConsensus(queueId, consensus, results.length, duration);

  const articleStatus = consensus.verdict === 'auto_approve' ? 'verified' :
                        consensus.verdict === 'auto_reject' ? 'rejected' : 'pending_review';
  await db.updateArticleStatus(article.id, articleStatus, {
    verification_score: consensus.score,
    ai_verified: consensus.verdict === 'auto_approve',
  });

  await db.logAudit(queueId, 'ai_completed', 'system', 'ai', {
    verdict: consensus.verdict, score: consensus.score,
  });

  console.log('══════════════════════════════════════════════');
  console.log('  ✅ COMPLETE in ' + (duration / 1000).toFixed(1) + 's');
  console.log('══════════════════════════════════════════════');
  console.log('  Queue ID: ' + queueId);
  console.log('  Admin: https://banglarvoice24news.com/admin/verification');
  console.log('');

  await db.closeClient();

  return { queue_id: queueId, consensus, agents: results, duration_ms: duration };
}

module.exports = { verifyArticle };
