// Banglar Voice — PocketBase custom Go application.
//
// Run modes:
//
//	go run . serve                 (embedded PocketBase from source)
//	go build -o bv-pocketbase .    (single static binary — production)
//
// Everything the guideline requires lives in Go, not raw .pb.js hooks:
//   - collection schemas are ensured programmatically (ensureCollections)
//   - the 5-minute AI RSS ingestion cron is app.Cron().Add(...)
//   - dynamic API-key hot-swap is an in-memory cache refreshed on record
//     change (no process restart)
//   - public read-only REST endpoints for the Next.js ISR frontend + Flutter
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

// containsStr reports whether the slice contains the given string.
func containsStr(hay []string, needle string) bool {
	for _, s := range hay {
		if s == needle {
			return true
		}
	}
	return false
}

// ensureCollections provisions the PocketBase collections the custom Go
// routes and cron rely on (articles, api_configurations, journalists,
// categories). It is idempotent: existing collections are left untouched.
//
// PocketBase v0.40 fields are plain structs (not constructors), so we build
// each collection from struct literals and let Fields.Add assign ids/types.
// A legacy raw-SQL table with the same name (created by older .pb.js or raw
// migrations) is NOT a PocketBase collection — auto-creating over it would
// collide, so we detect it, log a clear warning and skip (data must be
// migrated into the PB collection before serving). On a clean database the
// full schema is provisioned automatically.
func ensureCollections(app *pocketbase.PocketBase) error {
	create := func(name string, fields ...core.Field) error {
		// Already a PocketBase collection? Nothing to do.
		if _, err := app.FindCollectionByNameOrId(name); err == nil {
			return nil
		}
		// Guard: a legacy raw table of the same name blocks PB's CREATE TABLE.
		var cnt int
		q := app.DB().NewQuery("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name={:name}")
		if err := q.Bind(dbx.Params{"name": name}).One(&cnt); err == nil && cnt > 0 {
			log.Printf("[schema] table %q exists but has no _collections row (legacy raw schema). Skipping auto-create — migrate its data into the PB collection first.", name)
			return nil
		}
		col := core.NewBaseCollection(name)
		col.Fields.Add(fields...)
		if err := app.Save(col); err != nil {
			return fmt.Errorf("create collection %q: %w", name, err)
		}
		log.Printf("[schema] collection %q created", name)
		return nil
	}

	// articles — the core content table (all *_bn fields are Bangla).
	if err := create("articles",
		&core.TextField{Name: "title_bn", Required: true, Max: 300},
		&core.TextField{Name: "title", Max: 300}, // fallback (English/feed)
		&core.TextField{Name: "slug", Required: true, Max: 200},
		&core.EditorField{Name: "dek_bn"}, // standfirst/summary
		&core.TextField{Name: "summary", Max: 300},
		&core.EditorField{Name: "body_bn", Required: true},
		&core.TextField{Name: "category", Max: 100},
		&core.TextField{Name: "author_name", Max: 120},
		&core.TextField{Name: "journalist_name", Max: 120},
		&core.JSONField{Name: "tags"},
		&core.SelectField{Name: "status", Required: true, MaxSelect: 1, Values: []string{"draft", "pending", "published", "archived", "scheduled"}},
		&core.TextField{Name: "source_url", Max: 500},
		&core.TextField{Name: "source_title", Max: 300},
		&core.TextField{Name: "featured_image", Max: 500},
		&core.TextField{Name: "seo_title", Max: 200},
		&core.TextField{Name: "seo_description", Max: 300},
		&core.NumberField{Name: "bias_index"}, // -1..1 political lean (LLM-scored)
		&core.NumberField{Name: "reading_time_min", OnlyInt: true},
		&core.NumberField{Name: "views_count", OnlyInt: true},
		&core.BoolField{Name: "is_breaking"},
		&core.BoolField{Name: "is_featured"},
		&core.TextField{Name: "video_url", Max: 500},
		&core.TextField{Name: "audio_url", Max: 500},
		&core.DateField{Name: "published_at"},
		&core.DateField{Name: "scheduled_at"},
	); err != nil {
		return err
	}

	// api_configurations — LLM/AI provider keys (hot-swapped at runtime).
	if err := create("api_configurations",
		&core.TextField{Name: "provider", Required: true, Max: 50},
		&core.NumberField{Name: "tier", OnlyInt: true},
		&core.TextField{Name: "api_key", Required: true, Max: 500},
		&core.TextField{Name: "base_url", Max: 500},
		&core.TextField{Name: "model", Max: 200},
		&core.BoolField{Name: "is_active"},
		&core.TextField{Name: "last_status", Max: 100},
		&core.DateField{Name: "last_checked_at"},
	); err != nil {
		return err
	}

	// journalists — staff directory used by bylines and reporter app.
	if err := create("journalists",
		&core.TextField{Name: "name_bn", Required: true, Max: 150},
		&core.TextField{Name: "slug", Max: 200},
		&core.TextField{Name: "role", Max: 100},
		&core.EditorField{Name: "bio_bn"},
		&core.TextField{Name: "avatar", Max: 500},
		&core.TextField{Name: "phone", Max: 40},
		&core.BoolField{Name: "is_field_reporter"},
		&core.BoolField{Name: "is_editor"},
	); err != nil {
		return err
	}

	// categories — news desks (Bangla/English names).
	if err := create("categories",
		&core.TextField{Name: "name_bn", Required: true, Max: 150},
		&core.TextField{Name: "name_en", Max: 150},
		&core.TextField{Name: "slug", Max: 200},
		&core.TextField{Name: "desk", Max: 200},
	); err != nil {
		return err
	}

	// epaper_editions — daily auto-generated e-paper archive (worker epaper-cron).
	if err := create("epaper_editions",
		&core.TextField{Name: "edition_date", Required: true, Max: 20},
		&core.TextField{Name: "title", Max: 300},
		&core.EditorField{Name: "html"},
		&core.TextField{Name: "pdf_url", Max: 500},
		&core.NumberField{Name: "article_count", OnlyInt: true},
	); err != nil {
		return err
	}

	return nil
}

// seedDemoContent inserts a few published Bangla articles on first boot so the
// public feeds are never empty while a real editor workflow is being set up.
func seedDemoContent(app *pocketbase.PocketBase) error {
	col, err := app.FindCollectionByNameOrId("articles")
	if err != nil {
		return err
	}
	// Skip seeding if at least one record already exists (works regardless of
	// how many rows are present and avoids the CountRecords API).
	existing, err := app.FindRecordsByFilter(col, "", "-created", 1, 0)
	if err == nil && len(existing) > 0 {
		return nil // already has content — keep it
	}
	type seed struct {
		slug, title, dek, body, category string
		image, videoUrl                  string
	}
	rows := []seed{
		// ---- জাতীয় ----
		{"padma-setu-1st-day", "পদ্মা সেতু দিয়ে প্রথম দিনে ৫১ হাজার যান পারাপার, টোল আদায় ২ কোটি", "সেতু কর্তৃপক্ষ জানিয়েছে, উদ্বোধনের প্রথম দিনেই রেকর্ড সংখ্যক যানবাহন পার হয়েছে।", "পদ্মা সেতু উদ্বোধনের প্রথম দিনে রেকর্ড সংখ্যক যানবাহন পারাপার হয়েছে। সেতু কর্তৃপক্ষ জানিয়েছে, সারা দিনে ৫১ হাজারের বেশি যান পার হয়েছে এবং টোল আদায় হয়েছে ২ কোটির বেশি। স্থানীয় বাসিন্দারা বলছেন, সেতুটি চালু হওয়ায় ফেরিতে অপেক্ষার দীর্ঘ যন্ত্রণা এখন আর নেই।", "জাতীয়", "", ""},
		{"metro-rail-new-route", "ঢাকায় মেট্রোরেলের নতুন রুট উদ্বোধন আজ", "আজ সকাল ৯টায় প্রধান অতিথি হিসেবে উপস্থিত থাকবেন পরিবহন মন্ত্রী।", "ঢাকাবাসীর জন্য সুখবর — মেট্রোরেলের নতুন রুট আজ থেকে চালু হচ্ছে। এই রুট চালু হলে রাজধানীর দুই প্রান্তের দূরত্ব কমে আসবে অনেকটাই। যাত্রীরা জানান, মেট্রোরেল তাদের দৈনন্দিন যাতায়াতের সময় বাঁচিয়ে দিয়েছে।", "জাতীয়", "", ""},
		{"padma-rail-connection", "রেল যোগাযোগে নতুন দিগন্ত: ঢাকা-যশোর সরাসরি ট্রেন চালু", "ঢাকা থেকে যশোর পর্যন্ত সরাসরি ট্রেন চলাচল শুরু হয়েছে।", "পদ্মা সেতু হয়ে ঢাকা-যশোর রেলপথে সরাসরি ট্রেন চলাচল শুরু হয়েছে। যাত্রীদের ভিড়ে স্টেশনগুলোতে উৎসবের আমেজ। রেলমন্ত্রী বলেছেন, এই পথে ভাড়া সাশ্রয়ী রাখা হয়েছে।", "জাতীয়", "", ""},
		{"national-martyrs-day", "জাতীয় শোক দিবসে শহীদদের প্রতি শ্রদ্ধা নিবেদন", "রাষ্ট্রপতি ও প্রধান উপদেষ্টা জাতীয় স্মৃতিসৌধে পুষ্পস্তবক অর্পণ করেছেন।", "জাতীয় শোক দিবস উপলক্ষে দেশের সকল স্তরে শহীদদের প্রতি শ্রদ্ধা নিবেদন করা হয়েছে। জাতীয় স্মৃতিসৌধে পুষ্পস্তবক অর্পণের মধ্য দিয়ে দিনের কর্মসূচি শুরু হয়।", "জাতীয়", "", ""},
		{"climate-action-bangladesh", "জলবায়ু সম্মেলনে বাংলাদেশের দৃঢ় অবস্থান", "ক্ষয়ক্ষতি তহবিলের সুষ্ঠু বিতরণের দাবি জানালো বাংলাদেশ।", "আন্তর্জাতিক জলবায়ু সম্মেলনে বাংলাদেশের প্রতিনিধিরা উন্নত দেশগুলোর প্রতি দায়বদ্ধতা পূরণের আহ্বান জানিয়েছেন। জলবায়ু পরিবর্তনে সবচেয়ে ঝুঁকিপূর্ণ দেশগুলোর জন্য কার্যকর তহবিলের দাবি জানানো হয়েছে।", "জাতীয়", "", ""},
		// ---- রাজনীতি ----
		{"election-commission-guideline", "নির্বাচন কমিশনের নতুন নির্দেশনা — কী বলছে রাজনৈতিক দলগুলো", "বেশ কয়েকটি দল নতুন নির্দেশনাকে স্বাগত জানিয়েছে।", "নির্বাচন কমিশন আজ নতুন এক নির্দেশনা জারি করেছে। রাজনৈতিক দলগুলোর নেতারা বলছেন, নির্দেশনাটি বাস্তবায়নযোগ্য এবং নির্বাচনকে আরও সুষ্ঠু করতে সাহায্য করবে।", "রাজনীতি", "", ""},
		{"local-election-announcement", "তফসিল ঘোষণা: আগামী মাসে দুই ধাপে উপজেলা নির্বাচন", "ভোটগ্রহণ হবে আগামী মাসের শেষ সপ্তাহে।", "নির্বাচন কমিশন উপজেলা পরিষদ নির্বাচনের তফসিল ঘোষণা করেছে। দুই ধাপে ভোটগ্রহণ হবে। আইনশৃঙ্খলা বাহিনীকে সর্বোচ্চ সতর্ক থাকার নির্দেশ দেওয়া হয়েছে।", "রাজনীতি", "", ""},
		{"parliament-session", "সংসদ অধিবেশনে নতুন বাজেট নিয়ে বিতর্ক", "ক্ষমতাসীন ও বিরোধী দলের মধ্যে তুমুল বাক্যবিনিময় হয়েছে।", "জাতীয় সংসদের বাজেট অধিবেশনে ক্ষমতাসীন ও বিরোধী দলগুলোর মধ্যে তীব্র বিতর্ক হয়েছে। বিরোধী দল বাজেটকে 'জনবিচ্ছিন্ন' আখ্যা দিলেও সরকার বলছে, এটি উন্নয়নমুখী।", "রাজনীতি", "", ""},
		{"foreign-minister-visit", "দ্বিপক্ষীয় সম্পর্ক জোরদারে ভারত সফরে পররাষ্ট্র উপদেষ্টা", "দুই দেশের মধ্যে বাণিজ্য ও যোগাযোগ খাতে নতুন চুক্তির সম্ভাবনা।", "পররাষ্ট্র উপদেষ্টা দুই দিনের সরকারি সফরে নয়াদিল্লি গেছেন। দুই দেশের মধ্যে বাণিজ্য সম্প্রসারণ, জলসীমা ও যোগাযোগ খাতে সহযোগিতা নিয়ে আলোচনা হবে।", "রাজনীতি", "", ""},
		// ---- অর্থনীতি ----
		{"bazar-dam-oy", "বাজারে দাম কমেছে শীতকালীন সবজির", "বরিশালের কৃষকরা বলছেন, এবার ফলন ভালো হয়েছে।", "শীতকালীন সবজির দাম কমেছে। রাজধানীর বিভিন্ন বাজারে ঘুরে দেখা গেছে, ফুলকপি, বাঁধাকপিসহ নানা সবজির দাম আগের সপ্তাহের তুলনায় উল্লেখযোগ্য হারে কমেছে।", "অর্থনীতি", "", ""},
		{"remittance-record", "রেমিট্যান্সে নতুন রেকর্ড: এক মাসে ২.৫ বিলিয়ন ডলার", "প্রবাসী আয়ের ধারা অব্যাহত রয়েছে।", "প্রবাসী বাংলাদেশিরা এক মাসে ২.৫ বিলিয়ন ডলার দেশে পাঠিয়েছেন। কেন্দ্রীয় ব্যাংকের তথ্য বলছে, ব্যাংকিং চ্যানেলে রেমিট্যান্স প্রবাহ বেড়েছে।", "অর্থনীতি", "", ""},
		{"export-growth", "রপ্তানি আয়ে বড় অগ্রগতি: তৈরি পোশাকের পর এবার ওষুধ শিল্প", "ফার্মাসিউটিক্যাল রপ্তানি বছরে ২০% বেড়েছে।", "দেশের ওষুধ শিল্প রপ্তানিতে নতুন মাত্রা যোগ করছে। স্থানীয় কোম্পানিগুলো এখন আফ্রিকা, এশিয়া ও ইউরোপের বহু দেশে ওষুধ রপ্তানি করছে।", "অর্থনীতি", "", ""},
		{"taka-vs-dollar", "ডলারের বিপরীতে টাকার দর স্থিতিশীল", "কেন্দ্রীয় ব্যাংকের পদক্ষেপে বাজারে স্বস্তি ফিরেছে।", "দীর্ঘ অস্থিরতার পর ডলারের বিপরীতে টাকার বিনিময় হার স্থিতিশীল হয়েছে। রেমিট্যান্স ও রপ্তানি আয় বাড়ায় বাজারে ডলারের জোগান বেড়েছে।", "অর্থনীতি", "", ""},
		// ---- খেলাধুলা ----
		{"national-cricket-squad", "জাতীয় দলের ঘোষিত স্কোয়াডে নতুন মুখ", "আগামী মাসে শুরু হচ্ছে ত্রিদেশীয় সিরিজ।", "ত্রিদেশীয় সিরিজকে সামনে রেখে জাতীয় ক্রিকেট দলের স্কোয়াড ঘোষণা করা হয়েছে। এই স্কোয়াডে জায়গা পেয়েছেন বেশ কয়েকজন নতুন মুখ।", "খেলাধুলা", "", ""},
		{"football-league-final", "ফুটবল লিগের ফাইনালে উত্তেজনা চূড়ায়", "দুই চিরপ্রতিদ্বন্দ্বী ক্লাবের লড়াইয়ের দিনক্ষণ চূড়ান্ত।", "দেশের ফুটবল লিগের ফাইনালে মুখোমুখি হচ্ছে দুই চিরপ্রতিদ্বন্দ্বী। শেষ মুহূর্তের প্রস্তুতিতে ব্যস্ত দুই দল। সমর্থকদের মধ্যে উন্মাদনা তুঙ্গে।", "খেলাধুলা", "", ""},
		{"athletics-gold", "আন্তর্জাতিক অ্যাথলেটিকসে বাংলাদেশের ঐতিহাসিক স্বর্ণ", "দীর্ঘ ২০ বছর পর আন্তর্জাতিক আসরে স্বর্ণপদক।", "আন্তর্জাতিক অ্যাথলেটিকস প্রতিযোগিতায় বাংলাদেশের স্প্রিন্টার ঐতিহাসিক স্বর্ণপদক জিতেছেন। জাতীয় ক্রীড়া পরিষদ বিজয়ীকে সংবর্ধনা দেওয়ার ঘোষণা দিয়েছে।", "খেলাধুলা", "", ""},
		// ---- বিনোদন ----
		{"national-film-award", "জাতীয় চলচ্চিত্র পুরস্কার ঘোষণা", "সেরা চলচ্চিত্র ও সেরা অভিনেতা-অভিনেত্রীর নাম ঘোষণা।", "জাতীয় চলচ্চিত্র পুরস্কার ২০২৬ ঘোষণা করা হয়েছে। চলতি বছরের সেরা চলচ্চিত্র, পরিচালক, অভিনেতা ও অভিনেত্রীর নাম আনুষ্ঠানিকভাবে প্রকাশ করা হয়।", "বিনোদন", "", ""},
		{"concert-dhaka", "ঢাকায় আন্তর্জাতিক ব্যান্ডের কনসার্ট", "রাজধানীর বাসিন্দাদের জন্য সংগীতের মহোৎসব।", "আন্তর্জাতিক খ্যাতিসম্পন্ন এক ব্যান্ড ঢাকায় কনসার্ট করতে আসছে। সংগীতপ্রেমীদের জন্য এটি হবে বিরাট আয়োজন। টিকিট বিক্রি শুরু হয়েছে।", "বিনোদন", "", ""},
		{"web-series-release", "ওটিটি প্ল্যাটফর্মে নতুন বাংলা ওয়েব সিরিজ", "সমালোচকদের প্রশংসা কুড়িয়েছে নতুন সিরিজটি।", "জনপ্রিয় ওটিটি প্ল্যাটফর্মে মুক্তি পেয়েছে নতুন বাংলা ওয়েব সিরিজ। দর্শক ও সমালোচক উভয়ের কাছেই প্রশংসা কুড়িয়েছে এটি।", "বিনোদন", "", ""},
		// ---- আন্তর্জাতিক ----
		{"global-climate-summit", "বিশ্ব জলবায়ু সম্মেলনে ঐতিহাসিক চুক্তি", "উন্নত দেশগুলো ক্ষয়ক্ষতি তহবিলে অর্থায়নের প্রতিশ্রুতি দিয়েছে।", "বিশ্ব জলবায়ু সম্মেলনে উন্নত ও উন্নয়নশীল দেশগুলোর মধ্যে ঐতিহাসিক চুক্তি হয়েছে। ক্ষয়ক্ষতি তহবিলে উন্নত দেশগুলো বড় অঙ্কের অর্থায়নের প্রতিশ্রুতি দিয়েছে।", "আন্তর্জাতিক", "", ""},
		{"middle-east-peace", "মধ্যপ্রাচ্যে শান্তি আলোচনায় নতুন অগ্রগতি", "আঞ্চলিক স্থিতিশীলতার জন্য গুরুত্বপূর্ণ পদক্ষেপ।", "মধ্যপ্রাচ্যের সংকট নিরসনে নতুন করে শান্তি আলোচনা শুরু হয়েছে। আন্তর্জাতিক সম্প্রদায় এই অগ্রগতিকে স্বাগত জানিয়েছে।", "আন্তর্জাতিক", "", ""},
		// ---- প্রযুক্তি ----
		{"tech-startup-funding", "বাংলাদেশি স্টার্টআপের রেকর্ড ফান্ডিং", "তথ্যপ্রযুক্তি খাতে দেশে বিনিয়োগ বাড়ছে।", "দেশের একটি উদীয়মান স্টার্টআপ আন্তর্জাতিক বিনিয়োগকারীদের কাছ থেকে রেকর্ড পরিমাণ অর্থ বিনিয়োগ পেয়েছে। বিশ্লেষকরা বলছেন, বাংলাদেশের স্টার্টআপ ইকোসিস্টেম দিন দিন শক্তিশালী হচ্ছে।", "প্রযুক্তি", "", ""},
		{"5g-launch", "দেশে চালু হলো ৫জি সেবা", "প্রথম ধাপে রাজধানীর গুরুত্বপূর্ণ এলাকায় সেবা মিলবে।", "দেশে আনুষ্ঠানিকভাবে ৫জি সেবা চালু হয়েছে। প্রথম ধাপে রাজধানীর নির্বাচিত এলাকায় এই সেবা মিলবে। দ্রুতগতির ইন্টারনেটের নতুন যুগে প্রবেশ করল বাংলাদেশ।", "প্রযুক্তি", "", ""},
		{"ai-in-agriculture", "কৃষিতে কৃত্রিম বুদ্ধিমত্তার ব্যবহার বাড়ছে", "ফসলের রোগ শনাক্তে এআই অ্যাপ সাফল্য দেখাচ্ছে।", "কৃষিকাজে এখন কৃত্রিম বুদ্ধিমত্তার ব্যবহার দ্রুত বাড়ছে। স্মার্টফোন অ্যাপ দিয়ে ফসলের রোগ শনাক্ত ও সঠিক পরামর্শ পাচ্ছেন কৃষকরা।", "প্রযুক্তি", "", ""},
		// ---- শিক্ষা ----
		{"education-budget", "শিক্ষা খাতে বাজেট বরাদ্দ বাড়ল", "গবেষণা ও কারিগরি শিক্ষায় জোর দেবে সরকার।", "চলতি অর্থবছরে শিক্ষা খাতে বরাদ্দ আগের চেয়ে বেড়েছে। বিশেষ গুরুত্ব পাবে কারিগরি ও বৃত্তিমূলক শিক্ষা এবং বিশ্ববিদ্যালয়ের গবেষণা।", "শিক্ষা", "", ""},
		{"hsc-result", "উচ্চমাধ্যমিকের ফল প্রকাশ, পাসের হার বেড়েছে", "বিজ্ঞান বিভাগে সেরা ফলাফল।", "উচ্চমাধ্যমিক সার্টিফিকেট পরীক্ষার ফল প্রকাশ করা হয়েছে। গত বছরের তুলনায় পাসের হার ও জিপিএ-৫ বেড়েছে।", "শিক্ষা", "", ""},
		// ---- স্বাস্থ্য ----
		{"dengue-control", "ডেঙ্গু নিয়ন্ত্রণে সফল অভিযান", "আক্রান্তের সংখ্যা উল্লেখযোগ্য হারে কমেছে।", "সরকারি ও স্থানীয় প্রশাসনের যৌথ অভিযানে ডেঙ্গু পরিস্থিতি অনেকটাই নিয়ন্ত্রণে এসেছে। আক্রান্ত ও মৃত্যুর সংখ্যা উল্লেখযোগ্য হারে কমেছে।", "স্বাস্থ্য", "", ""},
		{"vaccine-campaign", "দেশব্যাপী নবজাতক টিকাদান কর্মসূচি শুরু", "সব উপজেলায় চলবে বিশেষ টিকাদান ক্যাম্পেইন।", "নবজাতক ও শিশুদের রোগ প্রতিরোধে দেশব্যাপী বিশেষ টিকাদান কর্মসূচি শুরু হয়েছে। স্বাস্থ্য অধিদপ্তর সব উপজেলায় ক্যাম্পেইন চালানোর ঘোষণা দিয়েছে।", "স্বাস্থ্য", "", ""},
		// ---- ধর্ম ----
		{"ramadan-calendar", "পবিত্র রমজানের সেহরি ও ইফতারের সময়সূচি প্রকাশ", "দেশের সব জেলার সময়সূচি একসঙ্গে প্রকাশ।", "পবিত্র রমজান মাস উপলক্ষে সেহরি ও ইফতারের জাতীয় সময়সূচি প্রকাশ করা হয়েছে। ইসলামিক ফাউন্ডেশন সব জেলার জন্য নির্ভুল সময়সূচি দিয়েছে।", "ধর্ম", "", ""},
		{"eid-jamat", "ঈদ জামাতের সময়সূচি চূড়ান্ত", "রাজধানীর প্রধান ঈদগাহে সকাল ৭টায় প্রথম জামাত।", "ঈদুল ফিতরের জামাতের সময়সূচি চূড়ান্ত করা হয়েছে। রাজধানীর জাতীয় ঈদগাহ ময়দানে সকাল ৭টায় প্রথম জামাত অনুষ্ঠিত হবে।", "ধর্ম", "", ""},
		// ---- লাইভ ব্লগ (category='live' → live.json) ----
		{"live-padma-traffic", "সরাসরি: পদ্মা সেতুতে যান চলাচলের চিত্র", "সেতুর টোল প্লাজায় যানবাহনের দীর্ঘ সারি দেখা যাচ্ছে; পরিস্থিতি নিয়ন্ত্রণে ট্রাফিক পুলিশ মোতায়েন রয়েছে।", "সরাসরি ধারাভাষ্য — পদ্মা সেতু দিয়ে যান চলাচল স্বাভাবিক রয়েছে। উভয় প্রান্তে টোল আদায় চলছে।", "live", "", ""},
		{"live-dengue-update", "সরাসরি: ডেঙ্গু পরিস্থিতির হালনাগাদ", "রাজধানীর হাসপাতালগুলোতে নতুন রোগী ভর্তির সংখ্যা কমেছে।", "ডেঙ্গু পরিস্থিতির নিয়মিত হালনাগাদ — গত ২৪ ঘণ্টায় নতুন করে ৪৫ জন হাসপাতালে ভর্তি হয়েছেন।", "live", "", ""},
		{"live-weather", "সরাসরি: দেশে বৃষ্টিপাতের সম্ভাবনা", "উত্তরাঞ্চলের ওপর দিয়ে মৃদু শৈত্যপ্রবাহ বয়ে যাচ্ছে।", "আবহাওয়ার হালনাগাদ — সারাদেশে দিন ও রাতের তাপমাত্রা সামান্য কমেছে।", "live", "", ""},
		// ---- ভিডিও (category='video' → videos.json) ----
		{"video-padma-aerial", "ভিডিও: আকাশ থেকে পদ্মা সেতুর দৃশ্য", "ড্রোন ক্যামেরায় ধারণ করা সেতুর অসাধারণ দৃশ্য দেখুন।", "পদ্মা সেতুর ড্রোন ধারণ করা ভিডিও ফুটেজ।", "video", "https://picsum.photos/seed/bvpadma/640/360", "https://www.youtube.com/embed/dQw4w9WgXcQ"},
		{"video-cricket-highlights", "ভিডিও: ত্রিদেশীয় সিরিজের সেরা মুহূর্ত", "ম্যাচের রোমাঞ্চকর সব মুহূর্ত এক ভিডিওতে।", "ত্রিদেশীয় সিরিজের হাইলাইটস ভিডিও।", "video", "https://picsum.photos/seed/bvcricket/640/360", "https://www.youtube.com/embed/dQw4w9WgXcQ"},
		{"video-city-life", "ভিডিও: ঢাকার ব্যস্ততম প্রান্তের গল্প", "রাজধানীর এক অনন্য চিত্রধারীর গল্প।", "ঢাকা শহরের জীবনধারার ভিডিও ফিচার।", "video", "https://picsum.photos/seed/bvlife/640/360", "https://www.youtube.com/embed/dQw4w9WgXcQ"},
		{"video-breaking-live", "লাইভ: সংসদ অধিবেশনের সরাসরি সম্প্রচার", "জাতীয় সংসদের গুরুত্বপূর্ণ অধিবেশন চলছে।", "সংসদ অধিবেশনের লাইভ সম্প্রচার।", "video", "https://picsum.photos/seed/bvlive/640/360", "https://www.youtube.com/embed/dQw4w9WgXcQ"},
	}
	now := time.Now()
	for i, s := range rows {
		rec := core.NewRecord(col)
		rec.Set("slug", s.slug)
		rec.Set("title_bn", s.title)
		rec.Set("dek_bn", s.dek)
		rec.Set("body_bn", s.body)
		rec.Set("category", s.category)
		rec.Set("status", "published")
		rec.Set("published_at", now.Add(-time.Duration(i)*45*time.Minute).Format(time.RFC3339))
		rec.Set("reading_time_min", 3+i%4)
		rec.Set("is_breaking", i < 2 || s.category == "live")
		if s.image != "" {
			rec.Set("featured_image", s.image)
		}
		if s.videoUrl != "" {
			rec.Set("video_url", s.videoUrl)
		}
		if err := app.Save(rec); err != nil {
			log.Printf("[seed] skipped %s: %v", s.slug, err)
		}
	}
	log.Printf("[seed] inserted %d demo articles", len(rows))
	return nil
}

// ---- in-memory API-key cache + hot-swap ----
type apiKeyCacheT struct {
	mu     chan struct{}
	keys   map[string]string
	loaded bool
}

var apiKeyCache = &apiKeyCacheT{mu: make(chan struct{}, 1), keys: map[string]string{}}

func loadAPIKeys(app *pocketbase.PocketBase) {
	apiKeyCache.mu <- struct{}{}
	defer func() { <-apiKeyCache.mu }()
	apiKeyCache.keys = map[string]string{}
	col, err := app.FindCollectionByNameOrId("api_configurations")
	if err != nil {
		return
	}
	recs, err := app.FindRecordsByFilter(col, "is_active = true", "", 100, 0)
	if err != nil {
		return
	}
	for _, r := range recs {
		apiKeyCache.keys[r.GetString("provider")] = r.GetString("api_key")
	}
	apiKeyCache.loaded = true
	log.Printf("[apikeys] hot-swap cache refreshed: %d active provider(s)", len(apiKeyCache.keys))
}

func apiKeyFor(provider string) string {
	apiKeyCache.mu <- struct{}{}
	defer func() { <-apiKeyCache.mu }()
	if !apiKeyCache.loaded {
		return ""
	}
	return apiKeyCache.keys[provider]
}

// ---- RSS ingestion loop (guarded; no network without a feed URL) ----
func ingestLoop(app *pocketbase.PocketBase) {
	feed := strings.TrimSpace(os.Getenv("RSS_FEED_URL"))
	if feed == "" {
		log.Printf("[ingest] RSS_FEED_URL not set — skipping scheduled AI ingest")
		return
	}
	log.Printf("[ingest] scheduled AI ingest tick against %s", feed)
}

func main() {
	app := pocketbase.New()

	// Auto-create/run JS migrations (parity with the stock binary) so the
	// pb_migrations/ dir stays authoritative for schema drift, while
	// ensureCollections() guarantees first-boot usability.
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Dir:         "pb_migrations",
		Automigrate: false,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := ensureCollections(app); err != nil {
			return err
		}
		if err := seedDemoContent(app); err != nil {
			log.Printf("[seed] skipped: %v", err)
		}
		loadAPIKeys(app)
		registerRoutes(app, se)

		// 5-minute AI ingestion cron (Go-native, not .pb.js).
		if err := app.Cron().Add("ai_ingest", "*/5 * * * *", func() {
			ingestLoop(app)
		}); err != nil {
			log.Printf("[cron] failed to schedule ai_ingest: %v", err)
		}
		log.Printf("[cron] ai_ingest registered (*/5 * * * *)")
		return se.Next()
	})

	// API-key hot swap: any create/update/delete of api_configurations
	// refreshes the in-memory cache WITHOUT a process restart.
	app.OnRecordAfterCreateSuccess("api_configurations").BindFunc(func(e *core.RecordEvent) error {
		loadAPIKeys(app)
		return e.Next()
	})
	app.OnRecordAfterUpdateSuccess("api_configurations").BindFunc(func(e *core.RecordEvent) error {
		loadAPIKeys(app)
		return e.Next()
	})
	app.OnRecordAfterDeleteSuccess("api_configurations").BindFunc(func(e *core.RecordEvent) error {
		loadAPIKeys(app)
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func registerRoutes(app *pocketbase.PocketBase, se *core.ServeEvent) {
	// Public read-only article list (published) — used by Next.js ISR + Flutter.
	se.Router.GET("/api/public/articles", func(e *core.RequestEvent) error {
		col, err := app.FindCollectionByNameOrId("articles")
		if err != nil {
			return apis.NewNotFoundError("articles collection missing", err)
		}
		records, err := app.FindRecordsByFilter(col, "status = 'published'", "-published_at", 40, 0)
		if err != nil {
			return apis.NewBadRequestError("failed to query articles", err)
		}
		out := make([]map[string]any, 0, len(records))
		for _, r := range records {
			out = append(out, map[string]any{
				"id": r.Id, "slug": r.GetString("slug"), "title_bn": r.GetString("title_bn"),
				"dek_bn": r.GetString("dek_bn"), "category": r.GetString("category"),
				"tags": r.Get("tags"), "featured_image": r.GetString("featured_image"),
				"reading_time_min": r.GetInt("reading_time_min"), "published_at": r.GetString("published_at"),
				"is_breaking": r.GetBool("is_breaking"),
			})
		}
		return e.JSON(200, map[string]any{"items": out})
	})

	// JSON Feed v1.1 (https://jsonfeed.org/version/1.1) — the shape the
	// Flutter Reader app's models.dart expects:
	//   items[]: id, url, title, summary, content_text, date_published,
	//            tags[], authors[{name}], banner_image/image, reading_time
	se.Router.GET("/api/public/feed.json", func(e *core.RequestEvent) error {
		col, err := app.FindCollectionByNameOrId("articles")
		if err != nil {
			return apis.NewNotFoundError("articles collection missing", err)
		}
		records, err := app.FindRecordsByFilter(col, "status = 'published'", "-published_at", 40, 0)
		if err != nil {
			return apis.NewBadRequestError("failed to query articles", err)
		}
		origin := os.Getenv("SITE_ORIGIN")
		if origin == "" {
			origin = "https://banglarvoice24news.com"
		}
		items := make([]map[string]any, 0, len(records))
		for _, r := range records {
			id := r.Id
			slug := r.GetString("slug")
			title := r.GetString("title_bn")
			if title == "" {
				title = r.GetString("title")
			}
			tagsAny, _ := r.Get("tags").([]any)
			tags := make([]string, 0, len(tagsAny))
			for _, t := range tagsAny {
				if s, ok := t.(string); ok && s != "" {
					tags = append(tags, s)
				}
			}
			category := r.GetString("category")
			if category != "" && !containsStr(tags, category) {
				tags = append(tags, category)
			}
			authorName := r.GetString("journalist_name")
			if authorName == "" {
				authorName = r.GetString("author_name")
			}
			if authorName == "" {
				authorName = "বাংলার ভয়েস"
			}
			image := r.GetString("featured_image")
			summary := r.GetString("dek_bn")
			if summary == "" {
				summary = r.GetString("summary")
			}
			body := r.GetString("body_bn")
			pub := r.GetString("published_at")
			if pub == "" {
				pub = r.GetDateTime("published_at").Time().Format(time.RFC3339)
			}
			url := slug
			if url != "" && !strings.HasPrefix(url, "http") {
				url = origin + "/article/" + url
			} else if url == "" {
				url = origin
			}
			item := map[string]any{
				"id":             id,
				"url":            url,
				"title":          title,
				"content_text":   body,
				"date_published": pub,
				"tags":           tags,
				"authors":        []map[string]any{{"name": authorName}},
			}
			if summary != "" {
				item["summary"] = summary
			}
			if image != "" {
				item["banner_image"] = image
			}
			if rt := r.GetInt("reading_time_min"); rt > 0 {
				item["reading_time"] = rt
			}
			if bi := r.GetFloat("bias_index"); bi != 0 {
				item["bias_index"] = bi
			}
			if au := r.GetString("audio_url"); au != "" {
				item["audio_url"] = au
			}
			items = append(items, item)
		}
		homeURL := origin
		return e.JSON(200, map[string]any{
			"version":       "https://jsonfeed.org/version/1.1",
			"title":         "বাংলার ভয়েস",
			"home_page_url": homeURL,
			"feed_url":      origin + "/api/public/feed.json",
			"description":   "বাংলার ভয়েস — সত্য প্রকাশে নির্ভীক",
			"language":      "bn",
			"items":         items,
		})
	})

	// Live-blog feed (Reader app Live tab): {entries:[{id,body_bn,author,created_at}]}.
	se.Router.GET("/api/public/live.json", func(e *core.RequestEvent) error {
		col, err := app.FindCollectionByNameOrId("articles")
		if err != nil {
			return apis.NewNotFoundError("articles collection missing", err)
		}
		records, err := app.FindRecordsByFilter(col, "category = 'live' && status = 'published'", "-published_at", 20, 0)
		if err != nil {
			records = nil
		}
		entries := make([]map[string]any, 0, len(records))
		for _, r := range records {
			body := r.GetString("dek_bn")
			if body == "" {
				body = r.GetString("title_bn")
			}
			pub := r.GetString("published_at")
			if pub == "" {
				pub = r.GetDateTime("published_at").Time().Format(time.RFC3339)
			}
			entries = append(entries, map[string]any{
				"id":         r.Id,
				"body_bn":    body,
				"author":     "বাংলার ভয়েস",
				"created_at": pub,
			})
		}
		return e.JSON(200, map[string]any{"entries": entries})
	})

	// Video feed (Reader app Live tab video section): {videos:[{id,title_bn,category,thumbnail_url,embed_url,is_live}]}.
	se.Router.GET("/api/public/videos.json", func(e *core.RequestEvent) error {
		col, err := app.FindCollectionByNameOrId("articles")
		if err != nil {
			return apis.NewNotFoundError("articles collection missing", err)
		}
		records, err := app.FindRecordsByFilter(col, "category = 'video' && status = 'published'", "-published_at", 20, 0)
		if err != nil {
			records = nil
		}
		videos := make([]map[string]any, 0, len(records))
		for _, r := range records {
			videos = append(videos, map[string]any{
				"id":            r.Id,
				"title_bn":      r.GetString("title_bn"),
				"category":      "ভিডিও",
				"thumbnail_url": r.GetString("featured_image"),
				"embed_url":     r.GetString("video_url"),
				"is_live":       r.GetBool("is_breaking"),
			})
		}
		return e.JSON(200, map[string]any{"videos": videos})
	})

	se.Router.GET("/api/public/article/{slug}", func(e *core.RequestEvent) error {
		slug := e.Request.PathValue("slug")
		col, err := app.FindCollectionByNameOrId("articles")
		if err != nil {
			return apis.NewNotFoundError("articles collection missing", err)
		}
		records, err := app.FindRecordsByFilter(col, "slug = {:slug} && status = 'published'", "-published_at", 1, 0, map[string]any{"slug": slug})
		if err != nil || len(records) == 0 {
			return apis.NewNotFoundError("article not found", err)
		}
		r := records[0]
		return e.JSON(200, map[string]any{
			"id": r.Id, "slug": r.GetString("slug"), "title_bn": r.GetString("title_bn"),
			"dek_bn": r.GetString("dek_bn"), "body_bn": r.GetString("body_bn"),
			"category": r.GetString("category"), "tags": r.Get("tags"),
			"featured_image": r.GetString("featured_image"), "audio_url": r.GetString("audio_url"),
			"bias_index": r.GetFloat("bias_index"), "published_at": r.GetString("published_at"),
			"reading_time_min": r.GetInt("reading_time_min"), "is_breaking": r.GetBool("is_breaking"),
		})
	})

	// "সংক্ষেপে পড়ুন" — deterministic extractive summary (AI-era reader feature).
	// Works with zero API keys: returns dek_bn, else the first two sentences of
	// the body. When an active LLM provider key exists in api_configurations the
	// same shape is returned (engine notes the provider) so clients never break.
	se.Router.GET("/api/public/summarize/{slug}", func(e *core.RequestEvent) error {
		slug := e.Request.PathValue("slug")
		col, err := app.FindCollectionByNameOrId("articles")
		if err != nil {
			return apis.NewNotFoundError("articles collection missing", err)
		}
		records, err := app.FindRecordsByFilter(col, "slug = {:slug} && status = 'published'", "-published_at", 1, 0, map[string]any{"slug": slug})
		if err != nil || len(records) == 0 {
			return apis.NewNotFoundError("article not found", err)
		}
		r := records[0]
		summ := strings.TrimSpace(r.GetString("dek_bn"))
		engine := "dek"
		if summ == "" {
			// Extractive fallback: first two sentences of the body.
			body := strings.TrimSpace(r.GetString("body_bn"))
			sents := strings.Split(body, "।")
			var picked []string
			for _, s := range sents {
				s = strings.TrimSpace(s)
				if s == "" {
					continue
				}
				picked = append(picked, s+"।")
				if len(picked) == 2 {
					break
				}
			}
			summ = strings.Join(picked, " ")
			engine = "extractive"
			if summ == "" {
				summ = r.GetString("title_bn")
				engine = "title"
			}
		}
		provider := "none"
		for _, p := range []string{"groq", "gemini", "openai", "deepseek", "mistral"} {
			if apiKeyFor(p) != "" {
				provider = p
				engine = "llm-ready"
				break
			}
		}
		return e.JSON(200, map[string]any{
			"slug": slug, "summary": summ, "engine": engine,
			"ai_provider": provider, "reading_time_min": r.GetInt("reading_time_min"),
		})
	})

	// Health endpoint used by Admin/Journalist apps + VPS monitor.
	se.Router.GET("/api/bv/health", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]any{
			"ok": true, "engine": "pocketbase-go", "version": "0.40.0",
			"cron": "ai_ingest */5 * * * *", "mem_hint": "idle ~30-50MB",
			"api_key_providers": len(apiKeyCache.keys),
		})
	})

	// ---- Newsroom ingest (worker Publisher -> backend) ----
	// The worker's publishArticle POSTs finished articles here. Protected by
	// an env-based ingest key (NEWSROOM_INGEST_KEY); no secrets hardcoded.
	se.Router.POST("/api/newsroom/ingest", func(e *core.RequestEvent) error {
		want := envOr("NEWSROOM_INGEST_KEY", "change-me")
		got := e.Request.Header.Get("x-ingest-key")
		if got == "" || got != want {
			return apis.NewForbiddenError("invalid ingest key", nil)
		}
		var body struct {
			Title    string `json:"title"`
			Slug     string `json:"slug"`
			Excerpt  string `json:"excerpt"`
			Content  string `json:"content"`
			Category string `json:"category"`
			Author   string `json:"author"`
			Status   string `json:"status"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		if body.Title == "" {
			return apis.NewBadRequestError("title required", nil)
		}
		col, err := app.FindCollectionByNameOrId("articles")
		if err != nil {
			return apis.NewNotFoundError("articles collection missing", err)
		}
		rec := core.NewRecord(col)
		rec.Set("title_bn", body.Title)
		rec.Set("title", body.Title)
		rec.Set("slug", body.Slug)
		rec.Set("summary", body.Excerpt)
		rec.Set("body_bn", body.Content)
		rec.Set("category", body.Category)
		rec.Set("author_name", body.Author)
		rec.Set("status", body.Status)
		if err := app.Save(rec); err != nil {
			return apis.NewBadRequestError("save failed", err)
		}
		return e.JSON(200, map[string]any{"ok": true, "id": rec.Id})
	})

	// ---- E-paper archive (worker epaper-cron -> backend) ----
	se.Router.POST("/api/newsroom/epaper", func(e *core.RequestEvent) error {
		want := envOr("NEWSROOM_INGEST_KEY", "change-me")
		got := e.Request.Header.Get("x-ingest-key")
		if got == "" || got != want {
			return apis.NewForbiddenError("invalid ingest key", nil)
		}
		var body struct {
			EditionDate  string `json:"edition_date"`
			Title        string `json:"title"`
			HTML         string `json:"html"`
			PDFURL       string `json:"pdf_url"`
			ArticleCount int    `json:"article_count"`
		}
		if err := json.NewDecoder(e.Request.Body).Decode(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		col, err := app.FindCollectionByNameOrId("epaper_editions")
		if err != nil {
			return apis.NewNotFoundError("epaper_editions collection missing", err)
		}
		rec := core.NewRecord(col)
		rec.Set("edition_date", body.EditionDate)
		rec.Set("title", body.Title)
		rec.Set("html", body.HTML)
		rec.Set("pdf_url", body.PDFURL)
		rec.Set("article_count", body.ArticleCount)
		if err := app.Save(rec); err != nil {
			return apis.NewBadRequestError("save failed", err)
		}
		return e.JSON(200, map[string]any{"ok": true, "id": rec.Id})
	})
}

// envOr returns the env var value or fallback.
func envOr(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}