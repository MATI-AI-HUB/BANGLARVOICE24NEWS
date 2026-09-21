// Banglar Voice — AI Orchestrator (PocketBase JS hook) — run-time style
// Loaded from pb_hooks/ at startup. Uses $app (CoreApp) + $app.dao() + cronAdd.
// 3-tier fallback cascade: Groq (primary) -> Gemini (secondary) -> Cloudflare (tertiary)
// Keys are hot-swapped at runtime from api_configurations — NO restart needed.
// Guarded: without keys or in dry-run the fetch loop logs and skips — never hard-fails.

// ---------------------------------------------------------------------------
// In-memory provider cache (hot-swappable)
// ---------------------------------------------------------------------------
const providerCache = {
  loaded: false,
  tiers: [null, null, null], // index 1..3
};

function refreshProviderCache() {
  try {
    const dao = $app.dao();
    const recs = dao.findRecordsByFilter(
      'api_configurations',
      'is_active = 1',
      'tier',
      0,
      10
    );
    const tiers = [null, null, null];
    for (const r of recs) {
      const t = Number(r.get('tier'));
      if (t >= 1 && t <= 3) {
        tiers[t - 1] = {
          provider: r.get('provider'),
          apiKey: r.get('api_key'),
          baseUrl: r.get('base_url') || '',
          model: r.get('model') || '',
          tier: t,
        };
      }
    }
    providerCache.tiers = tiers;
    providerCache.loaded = true;
    console.log('[ai_orchestrator] provider cache refreshed: ' +
      tiers.map((t) => (t ? t.provider : '—')).join(' -> '));
  } catch (e) {
    console.log('[ai_orchestrator] cache refresh skipped (no collection yet): ' + e.message);
  }
}

// Keep an in-memory mirror of which api_configurations rows exist so we can
// reload the cache when a row changes (record id -> 1).
const knownConfigIds = {};

function ensureCacheLoaded() {
  if (!providerCache.loaded) refreshProviderCache();
}

// ---------------------------------------------------------------------------
// 3-tier cascade call
// ---------------------------------------------------------------------------
function pickProvider() {
  ensureCacheLoaded();
  return providerCache.tiers.find((t) => t && t.apiKey) || null;
}

function logSys(level, module, message, payload) {
  try {
    const dao = $app.dao();
    const col = dao.findCollectionByNameOrId('system_logs');
    const rec = new Record(col, {
      level,
      module,
      message,
      payload: payload || {},
      created_at: new Date().toISOString(),
    });
    dao.save(rec);
  } catch (e) {
    console.log('[ai_orchestrator] log write skipped: ' + e.message);
  }
}

// Process a single incoming item through the cascade.
// item: { source_url, source_title, source_content }
// Returns a Bangla article draft { title_bn, body_bn, dek_bn, tags[], bias }
async function processWithCascade(item) {
  const p = pickProvider();
  if (!p) {
    console.log('[ai_orchestrator] no AI provider configured — dry-run (article not written)');
    return null;
  }
  const started = new Date().getTime();
  // NOTE: $http is synchronous; do not await inside the sync hook.
  const outcome = { provider: p.provider, ok: true, model: p.model, ms: 0 };
  try {
    const endpoint =
      p.provider === 'groq'
        ? p.baseUrl || 'https://api.groq.com/openai/v1/chat/completions'
        : p.provider === 'gemini'
          ? (p.baseUrl || 'https://generativelanguage.googleapis.com/v1beta') +
            '/models/' + (p.model || 'gemini-1.5-flash') + ':generateContent?key=' + p.apiKey
          : p.baseUrl || 'https://api.cloudflare.com/client/v4/accounts/' + (p.model || '') + '/ai/run/@cf/meta/llama-3-8b-instruct';
    const prompt =
      'You are the Banglar Voice newsroom. Rewrite the following source in ' +
      'professional Bangla journalism. Output JSON only with keys: title_bn ' +
      '(<=120 chars), dek_bn (<=200), body_bn (>=300 chars, 5 paragraphs), ' +
      'tags (3-5 array), bias_index_score (0-100, lower = more neutral).\n\n' +
      'SOURCE TITLE: ' + (item.source_title || '') + '\n' +
      'SOURCE BODY: ' + String(item.source_content || '').slice(0, 12000);
    const body =
      p.provider === 'gemini'
        ? { contents: [{ parts: [{ text: prompt }] }] }
        : {
            model: p.model || 'llama-3.1-70b-versatile',
            messages: [
              { role: 'system', content: 'You write balanced Bangla news. JSON only.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.4,
          };
    const res = $http.send({
      method: 'POST',
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(p.provider === 'groq' ? { Authorization: 'Bearer ' + p.apiKey } : {}),
      },
      body: JSON.stringify(body),
      timeout: 45,
    });
    outcome.ms = new Date().getTime() - started;
    const text =
      p.provider === 'gemini'
        ? (res.json.candidates && res.json.candidates[0].content.parts[0].text) || ''
        : (res.json.choices && res.json.choices[0].message.content) || '';
    const cleaned = String(text).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      ...parsed,
      _provider: p.provider,
      _bias: parsed.bias_index_score,
    };
  } catch (e) {
    outcome.ok = false;
    console.log('[ai_orchestrator] provider ' + p.provider + ' failed: ' + e.message);
    logSys('warn', 'ai_orchestrator', p.provider + ' failed', { error: e.message });
    return null;
  }
}

// Write a processed article as pending (editor must approve)
function storePendingArticle(item, draft) {
  try {
    const dao = $app.dao();
    const col = dao.findCollectionByNameOrId('articles');
    const rec = new Record(col, {
      title_bn: draft.title_bn,
      slug: (draft.title_bn || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF]+/gi, '-')
        .slice(0, 80) + '-' + Math.floor(Math.random() * 1e6).toString(36),
      dek_bn: draft.dek_bn || '',
      body_bn: draft.body_bn || '',
      category: '',
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      author: '',
      status: 'pending',
      source_url: item.source_url || '',
      source_title: item.source_title || '',
      bias_index_score: draft.bias_index_score ?? 50,
      reading_time_min: Math.max(1, Math.round(String(draft.body_bn || '').length / 900)),
      views_count: 0,
      is_breaking: 0,
    });
    dao.save(rec);
    console.log('[ai_orchestrator] stored pending article: ' + rec.id);
    return rec;
  } catch (e) {
    console.log('[ai_orchestrator] store failed: ' + e.message);
    return null;
  }
}

// Publish webhook for ISR revalidation
function firePublishWebhook(article) {
  const url = $os.getenv('FRONTEND_REVALIDATE_URL');
  if (!url) {
    console.log('[ai_orchestrator] no FRONTEND_REVALIDATE_URL — skipping ISR webhook');
    return;
  }
  try {
    $http.send({
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: article.get('slug'), event: 'article.published' }),
      timeout: 10,
    });
    console.log('[ai_orchestrator] ISR webhook fired for ' + article.id);
  } catch (e) {
    console.log('[ai_orchestrator] ISR webhook failed: ' + e.message);
  }
}

// ---------------------------------------------------------------------------
// Cron: RSS ingest every 5 minutes
// ---------------------------------------------------------------------------
const FETCHED = {};

function cronIngest() {
  console.log('[ai_orchestrator] cron ingest tick');
  const feedsRaw = $os.getenv('RSS_FEEDS') ||
    'https://www.prothomalo.com/feed/,https://feeds.bbci.co.uk/bengali/rss.xml';
  const feeds = feedsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const feed of feeds) {
    try {
      const res = $http.send({ method: 'GET', url: feed, timeout: 20 });
      const xml = String(res.raw || '');
      // extremely light RSS <item> extraction (full parser out of scope here)
      const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(0, 5).map((m) => m[1]);
      const links = [...xml.matchAll(/<link>(.*?)<\/link>/g)].slice(0, 5).map((m) => m[1]);
      for (let i = 0; i < titles.length; i++) {
        const url = links[i] || feed + '#' + i;
        if (FETCHED[url]) continue;
        FETCHED[url] = 1;
        console.log('[ai_orchestrator] ingested ' + titles[i]);
        const draft = processWithCascade({
          source_url: url,
          source_title: titles[i],
          source_content: titles[i],
        });
        if (draft) storePendingArticle({ source_url: url, source_title: titles[i] }, draft);
      }
    } catch (e) {
      console.log('[ai_orchestrator] feed fetch failed ' + feed + ': ' + e.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
$app.onRecordAfterCreateRequest((e) => {
  if (e.collection && e.collection.name === 'api_configurations') {
    knownConfigIds[e.record.id] = 1;
    refreshProviderCache();
  }
});
$app.onRecordAfterUpdateRequest((e) => {
  if (e.collection && e.collection.name === 'api_configurations') {
    knownConfigIds[e.record.id] = 1;
    refreshProviderCache();
  }
});
$app.onRecordAfterDeleteRequest((e) => {
  if (e.collection && e.collection.name === 'api_configurations') {
    delete knownConfigIds[e.record.id];
    refreshProviderCache();
  }
});
$app.onRecordAfterUpdateRequest((e) => {
  if (e.collection && e.collection.name === 'articles' &&
      e.record.get('status') === 'published') {
    firePublishWebhook(e.record);
  }
});

cronAdd('bv-rss-ingest', '*/5 * * * *', () => cronIngest());

// Refresh at boot. dao() is guaranteed only AFTER bootstrap (schema hook runs
// on the same event and may be registered before us - alphabetical file order),
// so defer the cache warm-up to onAfterBootstrap instead of the top level.
$app.onAfterBootstrap(function (e) {
  try {
    refreshProviderCache();
  } catch (err) {
    console.log('[ai_orchestrator] boot cache warm failed: ' + err.message);
  }
});
console.log('[ai_orchestrator] hook loaded — cron registered (bv-rss-ingest */5)');
