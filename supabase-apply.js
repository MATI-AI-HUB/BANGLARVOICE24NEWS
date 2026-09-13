const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, 'frontend', '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

loadEnv();

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error('❌ SUPABASE_DB_URL missing');
  process.exit(1);
}

console.log(`🔗 ${DB_URL.replace(/:[^:@]*@/, ':***@')}\n`);

const MIGRATIONS_DIR = path.join(__dirname, 'supabase', 'migrations');
const FILES = [
  '20260901000000_init_schema.sql',
  '20260901000001_storage.sql',
  '20260909_revenue_hooks.sql',
  '20260909_security.sql',
  '20260912_ai_audit_log.sql',
  '20260912_db_optimization.sql',
];

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log('✅ Connected\n');

  for (const file of FILES) {
    console.log(`📝 ${file}`);
    try {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query(sql);
      console.log(`   ✅ Success\n`);
    } catch (err) {
      console.error(`   ❌ ${err.message}\n`);
    }
  }

  const res = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
  );
  console.log('\n📊 Tables:');
  res.rows.forEach((r) => console.log(`   ✅ ${r.tablename}`));

  await client.end();
}

main().catch((e) => { console.error('❌ Fatal:', e.message); process.exit(1); });
