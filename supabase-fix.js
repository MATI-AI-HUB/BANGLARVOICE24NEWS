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
const MIGRATIONS_DIR = path.join(__dirname, 'supabase', 'migrations');

const FILES = [
  '20260901000001_storage.sql',
  '20260912_db_optimization.sql',
];

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
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

  await client.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
