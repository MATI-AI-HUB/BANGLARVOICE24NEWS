// Banglar Voice - Schema bootstrap hook (PocketBase 0.22-compatible).
//
// WHY THIS FILE EXISTS (and why it must NOT use lazy onRecordsListRequest):
//   * The stock ./pocketbase binary embeds its own migrations at COMPILE time.
//     pb_migrations/1700000000_init_banglar_voice.go lives in the source tree but
//     was never baked into the binary, so the raw-SQL domain tables never get
//     created by the Go migration system.
//   * PocketBase 0.22 JS hooks DO have DB access after bootstrap. We therefore
//     create + seed the domain tables from a .pb.js hook (which the stock binary
//     DOES execute) using $app.onAfterBootstrap - the earliest moment the dao is
//     guaranteed to be ready.
//   * onRecordsListRequest was used before, but it only fires for PocketBase
//     collection records APIs - since the domain tables are raw SQL and have no
//     matching _collections rows, that hook NEVER fired. This is the root cause
//     of the "no tables" state. onAfterBootstrap fixes it for good.
//
// Idempotent: CREATE TABLE IF NOT EXISTS / INSERT OR IGNORE. Safe to re-run on
// every boot.

(function () {
  'use strict';

  function ensureTables(dao) {
    var stmts = [
      'CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name_bn TEXT NOT NULL, name_en TEXT, slug TEXT NOT NULL UNIQUE, desk TEXT, sort_order INTEGER DEFAULT 0, created TEXT DEFAULT (datetime(\'now\')), updated TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY AUTOINCREMENT, title_bn TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, dek_bn TEXT, body_bn TEXT NOT NULL, category TEXT, tags TEXT DEFAULT \'[]\', author TEXT, status TEXT DEFAULT \'draft\', source_url TEXT, source_title TEXT, featured_image TEXT, seo_title TEXT, seo_description TEXT, bias_index_score REAL DEFAULT 0, reading_time_min INTEGER DEFAULT 1, is_breaking INTEGER DEFAULT 0, views_count INTEGER DEFAULT 0, published_at TEXT, scheduled_at TEXT, created TEXT DEFAULT (datetime(\'now\')), updated TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS api_configurations (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL, tier INTEGER NOT NULL DEFAULT 1, api_key TEXT NOT NULL, base_url TEXT, model TEXT, is_active INTEGER DEFAULT 0, last_status TEXT, last_checked_at TEXT, created TEXT DEFAULT (datetime(\'now\')), updated TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS journalists (id INTEGER PRIMARY KEY AUTOINCREMENT, name_bn TEXT NOT NULL, slug TEXT UNIQUE, role TEXT, bio_bn TEXT, avatar TEXT, phone TEXT, is_field_reporter INTEGER DEFAULT 0, is_editor INTEGER DEFAULT 0, created TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, level TEXT DEFAULT \'info\', module TEXT, message TEXT, payload TEXT DEFAULT \'{}\', created TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, plan TEXT DEFAULT \'free\', status TEXT DEFAULT \'active\', amount_bdt INTEGER DEFAULT 0, interval TEXT DEFAULT \'monthly\', gateway TEXT, gateway_ref TEXT, current_period_end TEXT, created TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS donations (id INTEGER PRIMARY KEY AUTOINCREMENT, donor_name TEXT, donor_email TEXT, amount_bdt INTEGER NOT NULL DEFAULT 0, kind TEXT DEFAULT \'one_time\', gateway TEXT, gateway_ref TEXT, note TEXT, created TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS ad_slots (id INTEGER PRIMARY KEY AUTOINCREMENT, placement_key TEXT NOT NULL, title TEXT, image_url TEXT, link_url TEXT, html_code TEXT, impressions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created TEXT DEFAULT (datetime(\'now\')), updated TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, frequency TEXT DEFAULT \'daily\', is_verified INTEGER DEFAULT 0, verify_token TEXT, unsub_token TEXT, created TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, path TEXT, article TEXT, referrer TEXT, user_agent TEXT, meta TEXT DEFAULT \'{}\', created TEXT DEFAULT (datetime(\'now\')))',
      'CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)',
      'CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created)',
      'CREATE TABLE IF NOT EXISTS live_blogs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, slug TEXT UNIQUE, status TEXT DEFAULT \'live\', entries TEXT DEFAULT \'[]\', created TEXT DEFAULT (datetime(\'now\')), updated TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY AUTOINCREMENT, title_bn TEXT, slug TEXT UNIQUE, youtube_id TEXT, duration_sec INTEGER DEFAULT 0, thumb TEXT, category TEXT, is_live INTEGER DEFAULT 0, published_at TEXT, created TEXT DEFAULT (datetime(\'now\')))',
      'CREATE TABLE IF NOT EXISTS podcasts (id INTEGER PRIMARY KEY AUTOINCREMENT, title_bn TEXT, slug TEXT UNIQUE, audio_url TEXT, duration_sec INTEGER DEFAULT 0, cover TEXT, category TEXT, published_at TEXT, created TEXT DEFAULT (datetime(\'now\')))'
    ];

    var created = 0;
    for (var i = 0; i < stmts.length; i++) {
      try {
        dao.db().newQuery(stmts[i]).execute();
        created++;
      } catch (e) {
        console.log('[schema] stmt ' + i + ' failed: ' + e.message);
      }
    }

    // Seed a sample (inactive) api_configuration so the AI orchestrator cache
    // has a row to read - operators hot-swap real keys via the admin console.
    try {
      dao.db().newQuery('INSERT OR IGNORE INTO api_configurations (provider, tier, api_key, base_url, model, is_active) VALUES (\'groq\', 1, \'gsk_dryrun_invalid\', \'https://api.groq.com/openai/v1\', \'llama-3.3-70b-versatile\', 0)').execute();
      dao.db().newQuery('INSERT OR IGNORE INTO categories (name_bn, name_en, slug, desk) VALUES (\'\u09b0\u09be\u099c\u09a8\u09c0\u09a4\u09bf\', \'Politics\', \'politics\', \'politics\'), (\'\u0985\u09b0\u09cd\u09a5\u09a8\u09c0\u09a4\u09bf\', \'Economy\', \'economy\', \'economy\'), (\'\u0996\u09c7\u09b2\u09be\u09a7\u09c1\u09b2\u09be\', \'Sports\', \'sports\', \'sports\'), (\'\u09aa\u09cd\u09b0\u09af\u09c1\u0995\u09cd\u09a4\u09bf\', \'Technology\', \'technology\', \'technology\'), (\'\u0986\u09a8\u09cd\u09a4\u09b0\u09cd\u099c\u09be\u09a4\u09bf\u0995\', \'International\', \'international\', \'international\'), (\'\u09ac\u09bf\u09a8\u09cb\u09a6\u09a8\', \'Entertainment\', \'entertainment\', \'entertainment\'), (\'\u09ae\u09a4\u09be\u09ae\u09a4\', \'Opinion\', \'opinion\', \'opinion\')').execute();
    } catch (e) {
      console.log('[schema] seed failed: ' + e.message);
    }

    return created;
  }

  // Earliest guaranteed-ready moment to touch the DB from a pb_hooks JS file.
  // Runs once per process on every `serve` boot.
  $app.onAfterBootstrap(function (e) {
    try {
      var n = ensureTables(e.app.dao());
      console.log('[schema] domain tables ensured (' + n + ' statements)');
    } catch (err) {
      console.log('[schema] init error: ' + err.message);
    }
  });
})();
