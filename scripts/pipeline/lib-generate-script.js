/**
 * Bengali news script generator with multi-provider fallback.
 * Order: GROQ gpt-oss-120b → Qwen 27B → gpt-oss-20b → OpenRouter → static template
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const envPath = path.join(ROOT, 'frontend/.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SYSTEM_PROMPT = 'তুমি একজন পেশাদার বাংলা সংবাদ উপস্থাপক।';

function buildPrompt(article) {
  const content = (article.content_bn || '').replace(/<[^>]*>/g, ' ').trim();
  return `তুমি একজন পেশাদার বাংলা সংবাদ উপস্থাপক। নিচের সংবাদটি ৪৫ সেকেন্ডের একটি ভিডিও স্ক্রিপ্টে পরিণত করো।

নিয়ম:
- শুরুতেই চমকপ্রদ হুক থাকবে
- মূল তথ্য সংক্ষেপে উল্লেখ করবে
- ভাষা হবে সাবলীল, কথ্য, সংবাদ পাঠকের মতো
- ২-৩ বাক্যে গোটা কাহিনি
- শেষে এক লাইনে ক্লোজিং ("আরও বিস্তারিত জানতে বাংলার ভয়েস দেখুন")
- শুধু বাংলায় লিখবে, ইংরেজি নয়
- কোনো মার্কডাউন, কোট, ব্যাখ্যা লিখবে না — শুধু স্ক্রিপ্ট

সংবাদ শিরোনাম: ${article.title_bn}

${content.slice(0, 1500)}`;
}

async function tryGateway(article) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('supabase_gateway_credentials_missing');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      task: 'video_script',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(article) },
      ],
      temperature: 0.7,
      max_tokens: 800,
      metadata: { source: 'video-pipeline' },
    }),
  });
  const j = await res.json();
  if (!res.ok || !j.ok) throw new Error(j.error || `gateway_http_${res.status}`);
  return j.answer?.trim();
}

function staticTemplate(article) {
  const content = (article.content_bn || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const firstLines = content.split(/[।!?]/).filter(s => s.trim().length > 20).slice(0, 3).join('। ');
  return `স্বাগতম, আমি বাংলার ভয়েস। আজকের শিরোনাম — ${article.title_bn}। ${firstLines}। আরও বিস্তারিত জানতে আমাদের সাথেই থাকুন।`;
}

async function generateScript(article) {
  const errors = [];

  // Provider credentials never enter this runner; the Supabase Gateway owns routing and failover.
  try {
    console.log('   [1/2] Supabase AI Gateway (Vault-routed providers)...');
    const r = await tryGateway(article);
    if (r) { console.log('   ✅ Success: AI Gateway'); return r; }
  } catch (e) { errors.push('AI Gateway: ' + e.message); }

  // Safe degraded mode: never invent provider output.
  console.log('   [2/2] Static template fallback');
  console.log('   ⚠️  All AI failed. Errors: ' + errors.join(' | '));
  return staticTemplate(article);
}

module.exports = { generateScript };

if (require.main === module) {
  (async () => {
    const testArticle = {
      title_bn: 'পরীক্ষামূলক সংবাদ শিরোনাম',
      content_bn: 'এটি একটি পরীক্ষামূলক সংবাদের প্রথম বাক্য। এখানে কিছু তথ্য দেওয়া হয়েছে যা সংবাদ উপস্থাপক পড়বেন। দ্বিতীয় বাক্যে আরো তথ্য যোগ করা হয়েছে।',
    };
    const script = await generateScript(testArticle);
    console.log('');
    console.log('════ Generated Script ════');
    console.log(script);
  })();
}
