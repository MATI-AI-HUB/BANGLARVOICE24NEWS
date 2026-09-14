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

  // Job schedule
  const { rows: jobs } = await client.query(`
    SELECT jobid, jobname, schedule, active
    FROM cron.job
    WHERE jobname = 'news-pipeline-15min'
  `);
  console.log('📅 Cron Jobs:');
  jobs.forEach(j => console.log(`  ✅ ${j.jobname} | ${j.schedule} | active: ${j.active}`));

  // Recent runs
  const { rows: runs } = await client.query(`
    SELECT status, return_message, start_time
    FROM cron.job_run_details
    WHERE jobid = 1
    ORDER BY start_time DESC
    LIMIT 5
  `);
  console.log('\n📊 Recent Cron Runs:');
  runs.forEach(r => {
    const ts = new Date(r.start_time).toLocaleTimeString('bn-BD');
    console.log(`  ${ts} | ${r.status} | ${r.return_message?.slice(0, 60) || 'OK'}`);
  });

  await client.end();
}
