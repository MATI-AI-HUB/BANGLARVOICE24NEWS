/**
 * upload-youtube.js
 * ─────────────────
 * Upload generated video to YouTube + insert into Supabase videos table.
 *
 * Usage:
 *   node scripts/pipeline/upload-youtube.js <video.json>            (unlisted, safe test)
 *   node scripts/pipeline/upload-youtube.js <video.json> --public   (public)
 *   node scripts/pipeline/upload-youtube.js --latest                (latest output)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = path.resolve(__dirname, 'output');

const envContent = fs.readFileSync(path.join(ROOT, 'frontend/.env.local'), 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { Client } = require('pg');
const CID = process.env.OAUTH_CLIENT_ID;
const CSEC = process.env.OAUTH_CLIENT_SECRET;
const REFRESH = process.env.YOUTUBE_REFRESH_TOKEN;
const DB = process.env.SUPABASE_DB_URL;

async function getAccessToken() {
  console.log('🔑 Exchanging refresh token...');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CID,
      client_secret: CSEC,
      refresh_token: REFRESH,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(j));
  console.log('   ✅ Access token acquired');
  return j.access_token;
}

function parseDuration(sec) {
  // Convert 45 -> PT45S, 90 -> PT1M30S
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  let out = 'PT';
  if (m > 0) out += m + 'M';
  if (s > 0 || m === 0) out += s + 'S';
  return out;
}

async function uploadVideo(accessToken, videoPath, meta, isPublic) {
  console.log('📤 Uploading to YouTube...');
  console.log('   Title: ' + meta.title_bn);
  console.log('   Privacy: ' + (isPublic ? 'PUBLIC' : 'UNLISTED'));

  const cleanScript = meta.script_bn.replace(/\n+/g, ' ').trim();
  const description = `${cleanScript}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📰 সম্পূর্ণ সংবাদ পড়ুন: https://banglarvoice24news.com\n` +
    `🔔 সাবস্ক্রাইব: https://youtube.com/@banglarvoice-d6d6g\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `#BanglarVoice #বাংলারভয়েস #${meta.category || 'news'}`;

  const metadata = {
    snippet: {
      title: meta.title_bn.slice(0, 100),
      description,
      tags: ['Banglar Voice', 'বাংলার ভয়েস', meta.category || 'news', 'breaking', 'bangla'],
      categoryId: '25', // News & Politics
      defaultLanguage: 'bn',
      defaultAudioLanguage: 'bn',
    },
    status: {
      privacyStatus: isPublic ? 'public' : 'unlisted',
      selfDeclaredMadeForKids: false,
      madeForKids: false,
    },
  };

  const videoBuffer = fs.readFileSync(videoPath);
  const boundary = '---------bv_' + Date.now();

  const prelude =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: video/mp4\r\n\r\n`;

  const epilogue = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(prelude, 'utf8'),
    videoBuffer,
    Buffer.from(epilogue, 'utf8'),
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'multipart/related; boundary=' + boundary,
        'Content-Length': String(body.length),
      },
      body,
    }
  );

  const j = await res.json();
  if (!j.id) {
    console.error('   ❌ Upload failed:', JSON.stringify(j, null, 2).slice(0, 500));
    throw new Error('Upload failed');
  }

  console.log('   ✅ Uploaded! Video ID: ' + j.id);
  console.log('   🔗 https://youtu.be/' + j.id);
  return j.id;
}

async function saveToSupabase(videoId, meta, videoPath) {
  console.log('💾 Saving to Supabase videos table...');
  const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const thumb = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const embed = `https://www.youtube.com/embed/${videoId}`;

  // Estimate duration from file (12 sec)
  const durationSec = 60; // default

  const { rows } = await client.query(
    `INSERT INTO videos
      (title_bn, title_en, category_key, youtube_id, thumbnail_url, embed_url,
       duration_sec, is_live, status, view_count, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'published', 0, NOW())
     RETURNING id`,
    [
      meta.title_bn,
      meta.title_en || '',
      meta.category || 'national',
      videoId,
      thumb,
      embed,
      durationSec,
    ]
  );

  console.log('   ✅ Supabase row id: ' + rows[0].id);

  // Mark article as processed (prevents duplicate video generation)
  if (meta.article_id) {
    await client.query(
      'UPDATE articles SET video_id = $1, video_generated_at = NOW() WHERE id = $2',
      [videoId, meta.article_id]
    );
    console.log('   ✅ Article marked as processed');
  }

  await client.end();
  return rows[0].id;
}

async function main() {
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  YOUTUBE UPLOAD');
  console.log('══════════════════════════════════════');
  console.log('');

  const args = process.argv.slice(2);
  const isPublic = args.includes('--public');
  const inputArg = args.find(a => !a.startsWith('--')) || '--latest';

  // Find meta JSON
  let metaPath;
  if (inputArg === '--latest') {
    const files = fs.readdirSync(OUTPUT)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(OUTPUT, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    if (files.length === 0) {
      console.error('❌ No video JSON found in output/');
      process.exit(1);
    }
    metaPath = path.join(OUTPUT, files[0].name);
  } else {
    metaPath = path.resolve(inputArg);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  console.log('📄 Meta: ' + path.basename(metaPath));
  console.log('🎬 Video: ' + path.basename(meta.video_path));
  console.log('');

  if (!fs.existsSync(meta.video_path)) {
    console.error('❌ Video file not found: ' + meta.video_path);
    process.exit(1);
  }

  const token = await getAccessToken();
  const videoId = await uploadVideo(token, meta.video_path, meta, isPublic);
  await saveToSupabase(videoId, meta, meta.video_path);

  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  ✅ UPLOAD COMPLETE');
  console.log('══════════════════════════════════════');
  console.log('  YouTube: https://youtu.be/' + videoId);
  console.log('  Website: https://banglarvoice24news.com');
  console.log('  Privacy: ' + (isPublic ? 'PUBLIC' : 'UNLISTED'));
  console.log('');
}

main().catch(e => {
  console.error('');
  console.error('❌ FATAL:', e.message);
  process.exit(1);
});
