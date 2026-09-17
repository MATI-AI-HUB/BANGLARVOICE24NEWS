const cfg = require('./config');

const VIDEO_CODEC = cfg.videoCodec();
const CODEC_OPTS = cfg.codecOptions().join(' ');
cfg.loadEnv();

/**
 * generate-video.js
 * ──────────────────
 * Article → AI script → Bengali voice → Slideshow MP4
 *
 * Usage:
 *   node scripts/pipeline/generate-video.js <article-id|--latest>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TMP = path.resolve(__dirname, 'tmp');
fs.mkdirSync(TMP, { recursive: true });
const OUTPUT = path.resolve(__dirname, 'output');
fs.mkdirSync(OUTPUT, { recursive: true });

// Env loaded via config

const { Client } = require('pg');
const GROQ_KEY = process.env.GROQ_API_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const DB = process.env.SUPABASE_DB_URL;

// ─── Helper: Fetch latest article ───
async function fetchArticle(client, arg) {
  let query, params;
  if (arg === '--latest') {
    query = `SELECT id,  title_bn,  content_bn, category_key, thumbnail_url, published_at
             FROM articles
             WHERE status = 'published' AND content_bn IS NOT NULL AND LENGTH(content_bn) > 200
               AND video_id IS NULL
             ORDER BY published_at DESC LIMIT 1`;
    params = [];
  } else {
    query = `SELECT id,  title_bn,  content_bn, category_key, thumbnail_url, published_at
             FROM articles WHERE id = $1`;
    params = [arg];
  }
  const { rows } = await client.query(query, params);
  return rows[0] || null;
}

// ─── Helper: Bengali script generation (multi-provider fallback) ───
const { generateScript } = require('./lib-generate-script');

// ─── Helper: edge-tts → Bengali voice ───
function synthesizeVoice(script, outPath) {
  console.log('🎙️  Synthesizing Bengali voice via edge-tts...');
  const textFile = path.join(TMP, 'script.txt');
  fs.writeFileSync(textFile, script, 'utf8');
  try {
    execSync(
      `edge-tts --voice bn-BD-PradeepNeural --rate=+5% --file "${textFile}" --write-media "${outPath}"`,
      { stdio: 'pipe' }
    );
  } catch (e) {
    // Fallback: try female voice
    console.log('   ⚠️  Male voice failed, trying female...');
    execSync(
      `edge-tts --voice bn-BD-NabanitaNeural --rate=+5% --file "${textFile}" --write-media "${outPath}"`,
      { stdio: 'pipe' }
    );
  }
  const size = fs.statSync(outPath).size;
  console.log('   ✅ Voice: ' + (size / 1024).toFixed(1) + ' KB');
  return outPath;
}

// ─── Helper: Pexels → background images ───
async function fetchImages(article, count = 3) {
  console.log('🖼️  Fetching ' + count + ' background images...');
  const query = encodeURIComponent(
    article.category_key === 'sports' ? 'bangladesh cricket'
    : article.category_key === 'politics' ? 'bangladesh parliament'
    : article.category_key === 'economy' ? 'dhaka city business'
    : 'bangladesh news'
  );

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${query}&orientation=landscape&per_page=${count}`,
    { headers: { Authorization: PEXELS_KEY } }
  );
  const j = await res.json();
  if (!j.photos || j.photos.length === 0) {
    throw new Error('Pexels returned no photos');
  }

  const paths = [];
  for (let i = 0; i < Math.min(count, j.photos.length); i++) {
    const url = j.photos[i].src.large2x || j.photos[i].src.large;
    const imgPath = path.join(TMP, `bg-${i}.jpg`);
    const imgRes = await fetch(url);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(imgPath, buf);
    paths.push(imgPath);
    console.log('   ✅ Image ' + (i + 1) + ': ' + (buf.length / 1024).toFixed(0) + ' KB');
  }
  return paths;
}

// ─── Helper: ffmpeg → slideshow MP4 ───
function composeVideo(images, voicePath, outPath) {
  console.log('🎬 Composing MP4 (slideshow)...');
  const durationPerImage = 4;
  const args = [];

  for (const img of images) {
    args.push(`-loop 1 -t ${durationPerImage} -i "${img}"`);
  }
  args.push(`-i "${voicePath}"`);

  // Filter: scale images, concat, then overlay on audio length
  const filterParts = images.map((_, i) =>
    `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25[v${i}]`
  ).join(';');
  const concatInputs = images.map((_, i) => `[v${i}]`).join('');
  const filter = `${filterParts};${concatInputs}concat=n=${images.length}:v=1:a=0[outv]`;

  const cmd = `ffmpeg -y ${args.join(' ')} -filter_complex "${filter}" -map "[outv]" -map ${images.length}:a -c:v ${VIDEO_CODEC} ${CODEC_OPTS} -c:a aac -b:a 128k -pix_fmt yuv420p -shortest "${outPath}" 2>&1 | tail -3`;

  try {
    execSync(cmd, { stdio: 'inherit', shell: '/data/data/com.termux/files/usr/bin/bash' });
  } catch (e) {
    throw new Error('ffmpeg failed: ' + e.message);
  }

  const size = fs.statSync(outPath).size;
  console.log('   ✅ Video: ' + (size / 1024 / 1024).toFixed(2) + ' MB');
  return outPath;
}

// ─── Main flow ───
async function main() {
  const arg = process.argv[2] || '--latest';
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  VIDEO GENERATOR — Article → MP4');
  console.log('══════════════════════════════════════');
  console.log('');

  const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. Fetch article
  const article = await fetchArticle(client, arg);
  if (!article) {
    console.error('❌ No article found');
    await client.end();
    process.exit(1);
  }
  console.log('📰 Article: ' + article.title_bn.slice(0, 60));
  console.log('   Category: ' + article.category_key);
  console.log('');

  // 2. Generate script
  const script = await generateScript(article);
  console.log('');

  // 3. Synthesize voice
  const voicePath = path.join(TMP, 'voice.mp3');
  synthesizeVoice(script, voicePath);
  console.log('');

  // 4. Fetch images
  const images = await fetchImages(article, 3);
  console.log('');

  // 5. Compose video
  const slug = article.id.slice(0, 8);
  const outPath = path.join(OUTPUT, `video-${slug}.mp4`);
  composeVideo(images, voicePath, outPath);

  // 6. Save metadata
  const metaPath = path.join(OUTPUT, `video-${slug}.json`);
  fs.writeFileSync(metaPath, JSON.stringify({
    article_id: article.id,
    article_id_full: article.id,
    title_bn: article.title_bn,
    title_en: '',
    category: article.category_key,
    script_bn: script,
    video_path: outPath,
    generated_at: new Date().toISOString(),
  }, null, 2));

  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  ✅ VIDEO READY');
  console.log('══════════════════════════════════════');
  console.log('  Path: ' + outPath);
  console.log('  Meta: ' + metaPath);
  console.log('');

  await client.end();
}

main().catch(e => {
  console.error('');
  console.error('❌ FATAL:', e.message);
  process.exit(1);
});
