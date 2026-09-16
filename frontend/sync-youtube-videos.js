/**
 * Sync existing YouTube videos into Supabase `videos` table.
 * Run: node sync-youtube-videos.js
 */

const fs = require('fs');
const c = fs.readFileSync('./.env.local', 'utf8');
for (const l of c.split('\n')) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { Client } = require('pg');
const cl = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

const YT_KEY = process.env.YOUTUBE_API_KEY;
const UPLOADS = 'UUH2pdJM-Rsv51WOtcfDcLQA';

function guessCategory(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('খেলা') || t.includes('ক্রিকেট') || t.includes('sport')) return 'sports';
  if (t.includes('রাজনীতি') || t.includes('নির্বাচন') || t.includes('politics')) return 'politics';
  if (t.includes('বিনোদন') || t.includes('entertainment')) return 'entertainment';
  if (t.includes('অর্থনীতি') || t.includes('বাজার') || t.includes('economy')) return 'economy';
  return 'national';
}

async function main() {
  await cl.connect();
  console.log('🔌 Connected\n');

  // 1. Fetch videos from YouTube
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${UPLOADS}&maxResults=50&key=${YT_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items?.length) {
    console.log('❌ No videos found:', JSON.stringify(data).slice(0, 200));
    return;
  }

  console.log(`📺 Found ${data.items.length} YouTube videos\n`);

  // 2. Get video details (for duration)
  const ids = data.items.map(v => v.snippet.resourceId.videoId).join(',');
  const detailRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${YT_KEY}`
  );
  const details = await detailRes.json();
  const detailMap = {};
  (details.items || []).forEach(d => {
    detailMap[d.id] = {
      duration: d.contentDetails?.duration, // ISO 8601 like PT3M20S
      views: parseInt(d.statistics?.viewCount || '0'),
    };
  });

  // 3. Insert each
  let inserted = 0, updated = 0;
  for (const v of data.items) {
    const ytId = v.snippet.resourceId.videoId;
    const title = v.snippet.title;
    const thumb =
      v.snippet.thumbnails?.maxres?.url ||
      v.snippet.thumbnails?.high?.url ||
      `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    const publishedAt = v.snippet.publishedAt;
    const embed = `https://www.youtube.com/embed/${ytId}`;

    // Parse duration
    let durationSec = 0;
    const dur = detailMap[ytId]?.duration || '';
    const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (m) {
      durationSec = (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0');
    }

    // Check if exists
    const existing = await cl.query(
      'SELECT id FROM videos WHERE youtube_id = $1',
      [ytId]
    );

    if (existing.rows.length > 0) {
      await cl.query(
        `UPDATE videos SET title_bn = $1, thumbnail_url = $2, embed_url = $3, duration_sec = $4, view_count = $5, published_at = $6 WHERE youtube_id = $7`,
        [title, thumb, embed, durationSec, detailMap[ytId]?.views || 0, publishedAt, ytId]
      );
      console.log(`♻️  Updated: ${title.slice(0, 60)}`);
      updated++;
    } else {
      await cl.query(
        `INSERT INTO videos (title_bn, title_en, category_key, youtube_id, thumbnail_url, embed_url, duration_sec, is_live, status, view_count, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'published', $8, $9)`,
        [title, '', guessCategory(title), ytId, thumb, embed, durationSec, detailMap[ytId]?.views || 0, publishedAt]
      );
      console.log(`✅ Inserted: ${title.slice(0, 60)}`);
      inserted++;
    }
  }

  console.log(`\n📊 Done: ${inserted} inserted, ${updated} updated`);

  const total = await cl.query('SELECT COUNT(*) FROM videos');
  console.log(`📦 Total videos in DB: ${total.rows[0].count}`);

  await cl.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
