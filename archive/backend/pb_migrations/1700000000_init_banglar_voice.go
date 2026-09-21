package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// Domain tables (raw SQL) — the .js migration ran these via CREATE TABLE,
		// but PocketBase 0.22.21 only executes .go migrations, so we re-declare them here.
		statements := []string{
			`CREATE TABLE IF NOT EXISTS categories (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name_bn TEXT NOT NULL, name_en TEXT, slug TEXT NOT NULL UNIQUE,
				desk TEXT, sort_order INTEGER DEFAULT 0, created TEXT DEFAULT (datetime('now')),
				updated TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS articles (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				title_bn TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, dek_bn TEXT,
				body_bn TEXT NOT NULL, category TEXT, tags TEXT DEFAULT '[]',
				author TEXT, status TEXT DEFAULT 'draft',
				source_url TEXT, source_title TEXT, featured_image TEXT,
				seo_title TEXT, seo_description TEXT, bias_index_score REAL DEFAULT 0,
				reading_time_min INTEGER DEFAULT 1, is_breaking INTEGER DEFAULT 0,
				views_count INTEGER DEFAULT 0, published_at TEXT, scheduled_at TEXT,
				created TEXT DEFAULT (datetime('now')), updated TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS api_configurations (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				provider TEXT NOT NULL, tier INTEGER NOT NULL DEFAULT 1,
				api_key TEXT NOT NULL, base_url TEXT, model TEXT,
				is_active INTEGER DEFAULT 0, last_status TEXT, last_checked_at TEXT,
				created TEXT DEFAULT (datetime('now')), updated TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS journalists (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name_bn TEXT NOT NULL, slug TEXT UNIQUE, role TEXT, bio_bn TEXT,
				avatar TEXT, phone TEXT, is_field_reporter INTEGER DEFAULT 0,
				is_editor INTEGER DEFAULT 0, created TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS system_logs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				level TEXT DEFAULT 'info', module TEXT, message TEXT,
				payload TEXT DEFAULT '{}', created TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS subscriptions (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user TEXT, plan TEXT DEFAULT 'free',
				status TEXT DEFAULT 'active', amount_bdt INTEGER DEFAULT 0,
				interval TEXT DEFAULT 'monthly', gateway TEXT, gateway_ref TEXT,
				current_period_end TEXT, created TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS donations (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				donor_name TEXT, donor_email TEXT, amount_bdt INTEGER NOT NULL DEFAULT 0,
				kind TEXT DEFAULT 'one_time', gateway TEXT, gateway_ref TEXT,
				note TEXT, created TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS ad_slots (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				placement_key TEXT NOT NULL, title TEXT, image_url TEXT,
				link_url TEXT, html_code TEXT, impressions INTEGER DEFAULT 0,
				clicks INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
				created TEXT DEFAULT (datetime('now')), updated TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				email TEXT NOT NULL UNIQUE, frequency TEXT DEFAULT 'daily',
				is_verified INTEGER DEFAULT 0, verify_token TEXT, unsub_token TEXT,
				created TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS analytics_events (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				event TEXT NOT NULL, path TEXT, article TEXT, referrer TEXT,
				user_agent TEXT, meta TEXT DEFAULT '{}', created TEXT DEFAULT (datetime('now'))
			)`,
			`CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)`,
			`CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC)`,
			`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created)`,
		}

		for _, sql := range statements {
			if _, err := app.DB().NewQuery(sql).Execute(); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		// Down: drop the domain tables (order matters for FKs, none declared so safe)
		for _, t := range []string{"analytics_events", "newsletter_subscribers", "ad_slots", "donations", "subscriptions", "system_logs", "journalists", "api_configurations", "articles", "categories"} {
			if _, err := app.DB().NewQuery("DROP TABLE IF EXISTS " + t).Execute(); err != nil {
				return err
			}
		}
		return nil
	})
}
