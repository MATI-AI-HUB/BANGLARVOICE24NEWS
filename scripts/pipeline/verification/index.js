const db = require('./db');
const { verifyArticle } = require('./orchestrator');

async function main() {
  const arg = process.argv[2] || '--latest';
  const client = await db.getClient();

  let article;
  if (arg === '--latest') {
    const { rows } = await client.query(
      `SELECT id, title_bn, content_bn, category_key, thumbnail_url
       FROM articles WHERE status = 'published' AND content_bn IS NOT NULL
       ORDER BY published_at DESC LIMIT 1`
    );
    article = rows[0];
  } else {
    const { rows } = await client.query(
      `SELECT id, title_bn, content_bn, category_key, thumbnail_url
       FROM articles WHERE id = $1`, [arg]
    );
    article = rows[0];
  }

  if (!article) { console.error('❌ Article not found'); process.exit(1); }
  await verifyArticle(article);
}

main().catch(e => { console.error('❌ FATAL:', e.message); process.exit(1); });
