/**
 * Seed real videos into Supabase `videos` table.
 * Uses env: SUPABASE_DB_URL from .env.local
 *
 * Usage:
 *   node seed-videos.js
 *
 * Edit VIDEOS array below to change content.
 */

const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { Client } = require('pg');

/**
 * ⚠️  EDIT HERE — 5 real videos
 *     youtube_id অবশ্যই valid (embed test হবে)
 *     category_key: national | politics | sports | entertainment | economy
 */
const VIDEOS = [
  {
    title_bn: 'পদ্মা সেতু দিয়ে রেকর্ড যানবাহন — বিশেষ প্রতিবেদন',
    title_en: 'Record Traffic on Padma Bridge — Special Report',
    category_key: 'national',
    youtube_id: 'rGzHnY5DHVw', // somoy tv sample (replace if needed)
    duration_sec: 180,
    is_live: false,
    status: 'published',
  },
  {
    title_bn: 'জাতীয় সংসদে বাজেট অধিবেশন শুরু',
    title_en: 'National Parliament Budget Session Begins',
    category_key: 'politics',
    youtube_id: 'kJQP7kiw5Fk',
    duration_sec: 240,
    is_live: false,
    status: 'published',
  },
  {
    title_bn: 'বাংলাদেশ ক্রিকেট দলের সিরিজ জয় — হাইলাইটস',
    title_en: "Bangladesh Cricket Series Win — Highlights",
    category_key: 'sports',
    youtube_id: '9bZkp7q19f0',
    duration_sec: 300,
    is_live: false,
    status: 'published',
  },
  {
    title_bn: 'ঢাকার সড়কে ট্রাফিক ব্যবস্থা — নতুন উদ্যোগ',
    title_en: 'Dhaka Traffic Management — New Initiative',
    category_key: 'national',
    youtube_id: 'JGwWNGJdvx8',
    duration_sec: 150,
    is_live: false,
    status: 'published',
  },
  {
    title_bn: 'সরাসরি সম্প্রচার — বাংলার ভয়েস নিউজ',
    title_en: 'Live Stream — Banglar Voice News',
    category_key: 'national',
    youtube_id: 'jfKfPfyJRdk', // lofi girl live stream (permanent ID)
    duration_sec: 0,
    is_live: true,
    status: 'live',
  },
];

async function main() {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();

  console.log('🔌 Connected to Supabase\n');

  // Clean existing
  const del = await client.query('DELETE FROM videos');
  console.log(`🗑️  Cleared ${del.rowCount} old videos\n`);

  let inserted = 0;
  for (const v of VIDEOS) {
    const thumb =
      `https://i.ytimg.com/vi/${v.youtube_id}/maxresdefault.jpg`;
    const embed = `https://www.youtube.com/embed/${v.youtube_id}`;

    try {
      await client.query(
        `INSERT INTO videos
          (title_bn, title_en, category_key, youtube_id, thumbnail_url,
           embed_url, duration_sec, is_live, status, view_count, published_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,NOW())`,
        [
          v.title_bn, v.title_en, v.category_key, v.youtube_id,
          thumb, embed, v.duration_sec, v.is_live, v.status,
        ]
      );
      console.log(`✅ ${v.title_bn}`);
      console.log(`   → https://youtu.be/${v.youtube_id}`);
      inserted++;
    } catch (e) {
      console.error(`❌ ${v.title_bn}`);
      console.error(`   ${e.message}`);
    }
  }

  console.log(`\n📊 Inserted: ${inserted}/${VIDEOS.length}`);

  const count = await client.query('SELECT COUNT(*) FROM videos');
  console.log(`📦 Total in DB: ${count.rows[0].count}`);

  await client.end();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
