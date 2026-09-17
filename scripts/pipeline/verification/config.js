/**
 * AI Verification — Config
 */
const fs = require('fs');
const path = require('path');

// Load env from frontend/.env.local (fallback to process.env)
const ROOT = path.resolve(__dirname, '../../..');
const envPath = path.join(ROOT, 'frontend/.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}


// ─── Sleep helper ───
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── GROQ with automatic fallback chain ───
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
];

async function callGroqSafe(messages, options = {}) {
  const preferred = options.model || GROQ_MODELS[0];
  // Order: preferred first, then rest
  const chain = [preferred, ...GROQ_MODELS.filter(m => m !== preferred)];

  const errors = [];
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          const wait = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
          console.log(`   ⏳ ${model} retry in ${wait/1000}s...`);
          await sleep(wait);
        }
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + process.env.GROQ_API_KEY,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: options.max_tokens ?? 1500,
            response_format: options.json ? { type: 'json_object' } : undefined,
          }),
        });
        const j = await res.json();

        // Rate limit — try next model
        if (j.error && /rate limit|429/i.test(j.error.message)) {
          errors.push(`${model}: rate_limit`);
          break; // break inner loop, try next model
        }
        // Other errors — retry
        if (j.error) {
          if (attempt < 1) continue;
          errors.push(`${model}: ${j.error.message}`);
          break;
        }
        // Success
        return {
          content: j.choices[0].message.content,
          usage: j.usage || {},
          model_used: model,
        };
      } catch (e) {
        if (attempt < 1) continue;
        errors.push(`${model}: ${e.message}`);
      }
    }
  }

  // Final fallback: OpenRouter
  try {
    console.log('   ⚠️  GROQ exhausted, trying OpenRouter...');
    const r = await callOpenRouter(messages, options);
    return { ...r, model_used: 'openrouter-fallback' };
  } catch (e) {
    errors.push(`OpenRouter: ${e.message}`);
  }

  throw new Error('All providers failed: ' + errors.join(' | '));
}


module.exports = {
  ROOT,
  DB_URL: process.env.SUPABASE_DB_URL,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GROQ_KEY: process.env.GROQ_API_KEY,
  GROQ_MODELS,
  sleep,
  callGroqSafe,
  OPENROUTER_KEY: process.env.OPENROUTER_API_KEY,
  GEMINI_KEY: process.env.GEMINI_API_KEY,
  CEREBRAS_KEY: process.env.CEREBRAS_API_KEY,
  TOGETHER_KEY: process.env.TOGETHER_API_KEY,
  PEXELS_KEY: process.env.PEXELS_API_KEY,

  // Models
  MODELS: {
    primary: 'openai/gpt-oss-120b',
    secondary: 'qwen/qwen3.8-27b',
    fast: 'openai/gpt-oss-20b',
    openrouter: 'nvidia/nemotron-3-super-120b-a12b:free',
  },

  // Verdict thresholds
  THRESHOLDS: {
    AUTO_APPROVE: 90,
    EYEBALL: 75,
    REVIEW: 50,
    MIN_CONFIDENCE: 0.75,
  },

  // Critical agents — any fail = auto-reject regardless of score
  CRITICAL_AGENTS: ['legal', 'bias', 'fact_checker'],

  // Agent default weights
  DEFAULT_WEIGHTS: {
    fact_checker: 2.00,
    language: 1.50,
    image: 1.50,
    video: 1.25,
    source: 2.00,
    bias: 1.75,
    legal: 2.50,
    seo: 0.75,
    brand_voice: 0.50,
    duplicate: 1.25,
  },

  // API helpers
  async callGroq(messages, model = 'openai/gpt-oss-120b', options = {}) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.GROQ_API_KEY,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 1500,
        response_format: options.json ? { type: 'json_object' } : undefined,
      }),
    });
    const j = await res.json();
    if (j.error) throw new Error(`GROQ [${model}]: ${j.error.message}`);
    return {
      content: j.choices[0].message.content,
      usage: j.usage || {},
    };
  },

  async callOpenRouter(messages, options = {}) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://banglarvoice24news.com',
        'X-Title': 'Banglar Voice Verification',
      },
      body: JSON.stringify({
        model: options.model || 'nvidia/nemotron-3-super-120b-a12b:free',
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 1500,
      }),
    });
    const j = await res.json();
    if (j.error) throw new Error(`OpenRouter: ${j.error.message}`);
    return {
      content: j.choices[0].message.content,
      usage: j.usage || {},
    };
  },
};
