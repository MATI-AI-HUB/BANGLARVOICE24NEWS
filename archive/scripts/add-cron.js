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

const SERVICE_KEY = process.argv[2];
if (!SERVICE_KEY || !SERVICE_KEY.startsWith('eyJ')) {
  console.error('❌ Usage: node add-cron.js YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('✅ Connected\n');

  // 1. Delete existing cron if exists
  try {
    await client.query(`SELECT cron.unschedule('news-pipeline-15min')`);
    console.log('🗑️  Removed existing cron');
  } catch {
    console.log('ℹ️  No existing cron to remove');
  }

  // 2. Schedule new cron
  const cronSql = `
    select cron.schedule(
      'news-pipeline-15min',
      '*/15 * * * *',
      $cron$
      select net.http_post(
        url := 'https://iqdpuedsykjicquvnmii.supabase.co/functions/v1/news-pipeline',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ${SERVICE_KEY}'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
      $cron$
    );
  `;
  await client.query(cronSql);
  console.log('✅ Cron scheduled: news-pipeline-15min (every 15 min)');

  // 3. Verify
  const { rows } = await client.query(
    `SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'news-pipeline-15min'`,
  );
  console.log('\n📊 Verify:');
  console.table(rows);

  await client.end();
  console.log('\n🎉 Done! Cron will trigger news-pipeline every 15 min.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
