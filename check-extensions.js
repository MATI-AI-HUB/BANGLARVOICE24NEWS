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
    SELECT extname, extversion
    FROM pg_extension
    WHERE extname IN ('pg_cron', 'pg_net', 'pgsodium', 'pg_trgm')
    ORDER BY extname
  `);
  console.log('═══ Installed Extensions ═══');
  rows.forEach(r => console.log(`  ✅ ${r.extname} (v${r.extversion})`));

  // Check if pg_cron schema exists
  const cron = await client.query(`
    SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='cron') as has_cron
  `);
  console.log(`\n  pg_cron schema: ${cron.rows[0].has_cron ? '✅' : '❌'}`);

  // Check if net schema exists
  const net = await client.query(`
    SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='net') as has_net
  `);
  console.log(`  pg_net schema:  ${net.rows[0].has_net ? '✅' : '❌'}`);

  await client.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
