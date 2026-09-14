const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const content = fs.readFileSync(path.join(__dirname, 'frontend', '.env.local'), 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Total count
  const { rows: total } = await client.query(
    `SELECT count(*) FROM public.articles WHERE status = 'published'`,
  );
  console.log(`📊 Total published: ${total[0].count}`);

  // Latest 10 (recent = AI-generated)
  const { rows: latest } = await client.query(`
    SELECT title_bn, category, published_at, created_at
    FROM public.articles
    WHERE status = 'published'
    ORDER BY created_at DESC
    LIMIT 10
  `);
  console.log('\n🆕 Latest 10 (most recent = AI-generated):');
  latest.forEach((r, i) => {
    const ts = new Date(r.created_at).toLocaleTimeString('bn-BD');
    console.log(`  ${i+1}. [${r.category}] ${r.title_bn.slice(0, 55)} (${ts})`);
  });

  // Count articles in last 1 hour (AI-generated)
  const { rows: recent } = await client.query(`
    SELECT count(*) FROM public.articles
    WHERE created_at > now() - interval '1 hour'
  `);
  console.log(`\n⏱️  Last 1 hour: ${recent[0].count} articles`);

  await client.end();
}
