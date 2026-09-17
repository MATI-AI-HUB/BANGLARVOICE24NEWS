/**
 * providers/manager.js
 * Multi-provider AI routing with parallel race + fallback
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const envPath = path.join(ROOT, 'frontend/.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ─── Provider registry ───
const PROVIDERS = {
  groq: {
    name: 'groq',
    enabled: !!process.env.GROQ_API_KEY,
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    models: ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'groq/compound-mini', 'allam-2-7b'],
    weight: 3.0,
  },
  gemini: {
    name: 'gemini',
    enabled: !!process.env.GEMINI_API_KEY,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    key: process.env.GEMINI_API_KEY,
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-flash'],
    weight: 2.5,
  },
  cerebras: {
    name: 'cerebras',
    enabled: !!process.env.CEREBRAS_API_KEY,
    endpoint: 'https://api.cerebras.ai/v1/chat/completions',
    key: process.env.CEREBRAS_API_KEY,
    models: ['llama-3.3-70b', 'llama3.1-8b'],
    weight: 2.0,
  },
  together: {
    name: 'together',
    enabled: !!process.env.TOGETHER_API_KEY,
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    key: process.env.TOGETHER_API_KEY,
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'],
    weight: 2.0,
  },

  cloudflare: {
    name: 'cloudflare',
    enabled: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),
    endpoint: null, // built dynamically
    key: process.env.CLOUDFLARE_AI_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    models: ['@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
    weight: 2.0,
  },
  openrouter: {
    name: 'openrouter',
    enabled: !!process.env.OPENROUTER_API_KEY,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY,
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-exp:free', 'qwen/qwen-2.5-72b-instruct:free', 'nvidia/nemotron-3-super-120b-a12b:free'],
    weight: 1.5,
  },
};

// ─── Health tracking ───
const health = {};
for (const name of Object.keys(PROVIDERS)) {
  health[name] = { fails: 0, lastFail: 0, lastSuccess: 0, cooldownUntil: 0 };
}

function isHealthy(name) {
  const h = health[name];
  if (!h) return false;
  if (Date.now() < h.cooldownUntil) return false;
  return true;
}

function markSuccess(name) {
  const h = health[name];
  if (h) { h.fails = 0; h.lastSuccess = Date.now(); }
}

function markFail(name, isRateLimit) {
  const h = health[name];
  if (!h) return;
  h.fails++;
  h.lastFail = Date.now();
  if (isRateLimit) {
    // Cooldown 60s on rate limit
    h.cooldownUntil = Date.now() + 30000;
  } else if (h.fails >= 2) {
    h.cooldownUntil = Date.now() + 30000;
  }
}

// ─── Generic provider call ───
async function callProvider(provider, model, messages, options = {}) {
  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 1500,
  };
  if (options.json) body.response_format = { type: 'json_object' };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + provider.key,
  };
  if (provider.name === 'openrouter') {
    headers['HTTP-Referer'] = 'https://banglarvoice24news.com';
    headers['X-Title'] = 'Banglar Voice Verify';
  }

  const res = await fetch(provider.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const j = await res.json();

  if (j.error) {
    const msg = j.error.message || JSON.stringify(j.error);
    const isRL = /rate limit|429|quota|exceeded/i.test(msg);
    const err = new Error(msg);
    err.isRateLimit = isRL;
    throw err;
  }

  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response');

  return {
    content,
    model_used: model,
    provider_used: provider.name,
    usage: j.usage || {},
  };
}

// ─── Race: try multiple providers in parallel, first success wins ───
async function callWithRace(messages, options = {}) {
  const available = Object.values(PROVIDERS)
    .filter(p => p.enabled && isHealthy(p.name))
    .sort((a, b) => b.weight - a.weight);

  if (available.length === 0) {
    throw new Error('No providers available (all disabled or in cooldown)');
  }

  // Race top 3 (or fewer)
  const racers = available.slice(0, 3);
  const attempts = [];

  for (const provider of racers) {
    const model = options.model_by_provider?.[provider.name]
      || provider.models[0];
    attempts.push(
      callProvider(provider, model, messages, options)
        .then(result => {
          markSuccess(provider.name);
          return result;
        })
        .catch(err => {
          markFail(provider.name, err.isRateLimit);
          throw err;
        })
    );
  }

  try {
    const winner = await Promise.any(attempts);
    return winner;
  } catch (aggregateErr) {
    const errors = aggregateErr.errors || [];
    const errMsgs = errors.map(e => e.message).join(' | ');
    throw new Error('All raced providers failed: ' + errMsgs);
  }
}

// ─── Sequential fallback (backup strategy) ───
async function callWithFallback(messages, options = {}) {
  const available = Object.values(PROVIDERS).filter(p => p.enabled);
  const errors = [];

  for (const provider of available) {
    for (const model of provider.models) {
      if (!isHealthy(provider.name)) continue;
      try {
        const result = await callProvider(provider, model, messages, options);
        markSuccess(provider.name);
        return result;
      } catch (err) {
        markFail(provider.name, err.isRateLimit);
        errors.push(`${provider.name}/${model}: ${err.message.slice(0, 80)}`);
        if (err.isRateLimit) break; // skip other models for this provider
      }
    }
  }

  throw new Error('All providers failed:\n' + errors.join('\n'));
}

// ─── Public API ───
async function ask(messages, options = {}) {
  // Default: fallback strategy (sequential) — more reliable than race
  if (options.strategy === 'race') {
    return callWithRace(messages, options);
  }
  return callWithFallback(messages, options);
}

function status() {
  const out = {};
  for (const [name, p] of Object.entries(PROVIDERS)) {
    out[name] = {
      enabled: p.enabled,
      healthy: isHealthy(name),
      fails: health[name].fails,
      cooldown_s: Math.max(0, Math.round((health[name].cooldownUntil - Date.now()) / 1000)),
    };
  }
  return out;
}

module.exports = { ask, status, PROVIDERS };
