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

const GROQ_KEY = process.argv[2];

if (!GROQ_KEY || !GROQ_KEY.startsWith('gsk_')) {
  console.error('❌ Usage: node add-vault-key.js gsk_YOUR_KEY');
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('✅ Connected\n');

  // 1. Create vault secret
  const secretName = `GROQ_API_KEY_${Date.now()}`;
  const { rows: secretRows } = await client.query(
    `SELECT vault.create_secret($1, $2) as id`,
    [GROQ_KEY, secretName],
  );
  const secretId = secretRows[0].id;
  console.log(`✅ Vault secret created: ${secretId}`);

  // 2. Delete old api_vault entry if exists
  await client.query(
    `DELETE FROM public.api_vault WHERE service_name = 'GROQ_API_KEY'`,
  );

  // 3. Insert into api_vault
  await client.query(
    `INSERT INTO public.api_vault (service_name, key_encrypted, environment, is_active)
     VALUES ('GROQ_API_KEY', $1, 'prod', true)`,
    [secretId],
  );
  console.log(`✅ api_vault entry added: GROQ_API_KEY → ${secretId}`);

  // 4. Verify
  const { rows: check } = await client.query(
    `SELECT service_name, key_encrypted, is_active FROM public.api_vault WHERE service_name = 'GROQ_API_KEY'`,
  );
  console.log('\n📊 Verify:');
  console.log(check[0]);

  await client.end();
  console.log('\n🎉 Done! Groq key stored in vault.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
