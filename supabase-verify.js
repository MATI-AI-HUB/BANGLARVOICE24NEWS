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

  // Tables
  const t = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
  );
  console.log(`\n📊 Tables (${t.rowCount}):`);
  t.rows.forEach(r => console.log(`   ✅ ${r.tablename}`));

  // Storage buckets
  const b = await client.query(`SELECT id, public FROM storage.buckets ORDER BY id`);
  console.log(`\n📦 Storage Buckets (${b.rowCount}):`);
  b.rows.forEach(r => console.log(`   ✅ ${r.id} (public: ${r.public})`));

  // Enum types
  const e = await client.query(
    `SELECT typname FROM pg_type WHERE typtype='e' AND typnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public') ORDER BY typname`
  );
  console.log(`\n🏷️  Enum Types (${e.rowCount}):`);
  e.rows.forEach(r => console.log(`   ✅ ${r.typname}`));

  // Row counts
  const c = await client.query(`SELECT count(*) FROM public.breaking_ticker`);
  console.log(`\n📝 Breaking ticker rows: ${c.rows[0].count}`);

  await client.end();
  console.log('\n✅ Verification complete\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
