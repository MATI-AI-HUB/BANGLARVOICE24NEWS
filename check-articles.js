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

  const { rows } = await client.query(`
    SELECT id, title_bn, category, status, published_at
    FROM public.articles
    ORDER BY published_at DESC
    LIMIT 10
  `);

  console.log(`📊 Total: ${rows.length} articles\n`);
  rows.forEach(r => {
    console.log(`✅ [${r.status}] ${r.category} | ${r.title_bn.slice(0, 40)}...`);
  });

  await client.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
