/**
 * Bengali news script generator with multi-provider fallback.
 * Order: GROQ gpt-oss-120b → Qwen 27B → gpt-oss-20b → OpenRouter → static template
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const envContent = fs.readFileSync(path.join(ROOT, 'frontend/.env.local'), 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const GROQ_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

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

async function tryGroq(article, model) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + GROQ_KEY,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(article) },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.choices?.[0]?.message?.content?.trim();
}

async function tryOpenRouter(article) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + OPENROUTER_KEY,
      'HTTP-Referer': 'https://banglarvoice24news.com',
      'X-Title': 'Banglar Voice Pipeline',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(article) },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.choices?.[0]?.message?.content?.trim();
}

function staticTemplate(article) {
  const content = (article.content_bn || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const firstLines = content.split(/[।!?]/).filter(s => s.trim().length > 20).slice(0, 3).join('। ');
  return `স্বাগতম, আমি বাংলার ভয়েস। আজকের শিরোনাম — ${article.title_bn}। ${firstLines}। আরও বিস্তারিত জানতে আমাদের সাথেই থাকুন।`;
}

async function generateScript(article) {
  const errors = [];

  // 1. GROQ OpenAI gpt-oss-120b (best quality)
  try {
    console.log('   [1/5] GROQ openai/gpt-oss-120b...');
    const r = await tryGroq(article, 'openai/gpt-oss-120b');
    if (r) { console.log('   ✅ Success: gpt-oss-120b'); return r; }
  } catch (e) { errors.push('gpt-oss-120b: ' + e.message); }

  // 2. GROQ Qwen 3.8 27B (multilingual strong)
  try {
    console.log('   [2/5] GROQ qwen/qwen3.8-27b...');
    const r = await tryGroq(article, 'qwen/qwen3.8-27b');
    if (r) { console.log('   ✅ Success: qwen3.8-27b'); return r; }
  } catch (e) { errors.push('qwen-27b: ' + e.message); }

  // 3. GROQ OpenAI gpt-oss-20b (fast fallback)
  try {
    console.log('   [3/5] GROQ openai/gpt-oss-20b...');
    const r = await tryGroq(article, 'openai/gpt-oss-20b');
    if (r) { console.log('   ✅ Success: gpt-oss-20b'); return r; }
  } catch (e) { errors.push('gpt-oss-20b: ' + e.message); }

  // 4. OpenRouter
  try {
    console.log('   [4/5] OpenRouter nemotron...');
    const r = await tryOpenRouter(article);
    if (r) { console.log('   ✅ Success: OpenRouter'); return r; }
  } catch (e) { errors.push('OpenRouter: ' + e.message); }

  // 5. Static fallback
  console.log('   [5/5] Static template fallback');
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
