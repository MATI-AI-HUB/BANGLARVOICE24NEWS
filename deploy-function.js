const fs = require('fs');
const https = require('https');

const PROJECT_REF = 'iqdpuedsykjicquvnmii';
const FUNCTION_SLUG = process.env.FUNCTION_SLUG || 'news-pipeline';
const CODE_FILE =
  process.env.FUNCTION_FILE ||
  `./supabase/functions/${FUNCTION_SLUG}/index.ts`;
const PAT = process.env.SUPABASE_PAT;

if (!PAT) { console.error('❌ SUPABASE_PAT নেই'); process.exit(1); }
if (!fs.existsSync(CODE_FILE)) { console.error('❌ File নেই:', CODE_FILE); process.exit(1); }

const code = fs.readFileSync(CODE_FILE, 'utf8');
console.log(`📄 File: ${code.length} chars`);

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body, 'utf8');
    req.end();
  });
}

(async () => {
  console.log('\n=== Step 1: Delete old function ===');
  const delRes = await apiRequest('DELETE', `/v1/projects/${PROJECT_REF}/functions/${FUNCTION_SLUG}`, null);
  console.log(`Delete status: ${delRes.status}`);

  console.log('\n=== Step 2: Create function (raw body, not base64) ===');
  const createBody = JSON.stringify({
    slug: FUNCTION_SLUG,
    name: FUNCTION_SLUG,
    verify_jwt: false,
    body: code,
    entrypoint_path: 'index.ts',
  });

  const createRes = await apiRequest('POST', `/v1/projects/${PROJECT_REF}/functions`, createBody);
  console.log(`Create status: ${createRes.status}`);
  console.log('Response:', createRes.body.slice(0, 400));

  if (createRes.status === 200 || createRes.status === 201) {
    console.log('\n✅ Deploy সফল!');
  } else {
    console.error('\n❌ Deploy ব্যর্থ।');
    process.exit(1);
  }
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
