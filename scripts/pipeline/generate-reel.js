#!/usr/bin/env node
'use strict';

/**
 * Article -> vertical 9:16 Bengali reel.
 *
 * Usage:
 *   node scripts/pipeline/generate-reel.js <published-article-uuid> [--upload]
 *   node scripts/pipeline/generate-reel.js --latest [--upload]
 *   node scripts/pipeline/generate-reel.js --sample
 *
 * Upload is opt-in. The uploader writes only to the private `reels` bucket;
 * this CLI never creates social_posts rows or publishes content.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const cfg = require('./config');
cfg.loadEnv();

const { Client } = require('pg');
const ROOT = cfg.ROOT;
const OUT_DIR = path.join(cfg.OUTPUT, 'reels');
const FONT_DIR = path.join(ROOT, 'frontend', 'public', 'fonts');
const FONT_FILE = path.join(FONT_DIR, 'HindSiliguri-Regular.ttf');
const VOICE = 'bn-BD-NabanitaNeural';
const MAX_SCRIPT_CHARS = 680;
const MAX_REEL_SECONDS = 58;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

fs.mkdirSync(OUT_DIR, { recursive: true });

function run(binary, args, { timeout = 120_000 } = {}) {
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim().slice(-1800);
    throw new Error(`${binary} exited ${result.status}: ${detail}`);
  }
  return (result.stdout || '').trim();
}

function plainText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[\*_`#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildScript(article) {
  const headline = plainText(article.title_bn);
  if (!headline) throw new Error('article_missing_bengali_headline');
  const source = plainText(article.excerpt_bn || article.content_bn);
  const points = source
    .split(/(?<=[।!?])\s+|\n+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 18 && part !== headline)
    .slice(0, 3);
  const draft = [headline, ...points].join('। ');
  return [...draft].slice(0, MAX_SCRIPT_CHARS).join('').replace(/[।,\s]+$/u, '।');
}

function escapeFilterPath(value) {
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/,/g, '\\,').replace(/'/g, "\\'");
}

function toAssTime(value) {
  const parts = value.replace(',', '.').split(':');
  if (parts.length !== 3) throw new Error('invalid_edge_tts_caption_time');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);
  const centiseconds = Math.floor(seconds * 100);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(Math.floor(centiseconds / 100)).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
}

function wrapCaption(value, maxChars = 25) {
  const words = plainText(value).replace(/[{}\\]/g, '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const chars = [...word];
    if (chars.length > maxChars) {
      if (line) lines.push(line);
      line = '';
      while (chars.length) lines.push(chars.splice(0, maxChars).join(''));
      continue;
    }
    const next = line ? `${line} ${word}` : word;
    if ([...next].length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.join('\\N');
}

function writeAssCaptions(sourcePath, outputPath, headline) {
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const dialogues = [];
  for (const block of raw.split(/\r?\n\s*\r?\n/)) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timeIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeIndex < 0) continue;
    const match = lines[timeIndex].match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
    if (!match) continue;
    const text = wrapCaption(lines.slice(timeIndex + 1).join(' '));
    if (text) dialogues.push(`Dialogue: 0,${toAssTime(match[1])},${toAssTime(match[2])},Default,,0,0,0,,${text}`);
  }
  if (!dialogues.length) throw new Error('edge_tts_subtitles_have_no_valid_cues');
  dialogues.unshift(`Dialogue: 1,0:00:00.00,0:00:58.00,Headline,,0,0,0,,${wrapCaption(headline, 30)}`);
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
    'Style: Default,Hind Siliguri,40,&H00FFFFFF,&H0000FFFF,&H90000000,&H90000000,0,0,0,0,100,100,0,0,3,2,0,2,64,64,210,1',
    'Style: Headline,Hind Siliguri,48,&H00FFFFFF,&H0000FFFF,&H80000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,8,64,64,38,1',
    '',
    '[Events]',
    'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
  ];
  fs.writeFileSync(outputPath, `${header.join('\n')}\n${dialogues.join('\n')}\n`, 'utf8');
}

function storageUrl(baseUrl, objectPath) {
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/reels/${encodedPath}`;
}

function isAllowedImageHost(hostname) {
  const host = hostname.toLowerCase();
  return host === 'images.pexels.com' || host === 'images.unsplash.com' || /^[a-z0-9-]+\.supabase\.co$/.test(host);
}

async function downloadArticleImage(article, tempDir) {
  if (!article.thumbnail_url) return null;
  let url;
  try {
    url = new URL(article.thumbnail_url);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !isAllowedImageHost(url.hostname)) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000), redirect: 'error' });
    const type = response.headers.get('content-type') || '';
    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (!response.ok || !type.startsWith('image/') || declaredSize > 15 * 1024 * 1024) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 15 * 1024 * 1024) return null;
    const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const imagePath = path.join(tempDir, `article-image.${extension}`);
    fs.writeFileSync(imagePath, bytes);
    return imagePath;
  } catch {
    return null;
  }
}

async function fetchArticle(client, idOrLatest) {
  const columns = 'id, slug, title_bn, excerpt_bn, content_bn, category_key, thumbnail_url, published_at';
  const query = idOrLatest === '--latest'
    ? `select ${columns} from public.articles
       where status = 'published' and title_bn is not null and content_bn is not null
       order by published_at desc limit 1`
    : `select ${columns} from public.articles
       where id = $1 and status = 'published' limit 1`;
  const result = await client.query(query, idOrLatest === '--latest' ? [] : [idOrLatest]);
  return result.rows[0] || null;
}

async function uploadPrivateMp4(filePath, objectPath) {
  const baseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) throw new Error('upload_requires_server_supabase_url_and_service_role_key');
  const stat = fs.statSync(filePath);
  if (!stat.size || stat.size > MAX_UPLOAD_BYTES) throw new Error('reel_mp4_size_out_of_range');
  const bytes = fs.readFileSync(filePath);
  const response = await fetch(storageUrl(baseUrl, objectPath), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      'content-type': 'video/mp4',
      'cache-control': '3600',
      'x-upsert': 'true',
    },
    body: bytes,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const text = (await response.text()).slice(0, 500);
    throw new Error(`private_reel_upload_failed_${response.status}: ${text}`);
  }
  return objectPath;
}

async function main() {
  const args = process.argv.slice(2);
  const upload = args.includes('--upload');
  const sampleMode = args.includes('--sample');
  const target = args.find((arg) => !arg.startsWith('--')) || (args.includes('--latest') ? '--latest' : null);
  if (!target && !sampleMode) throw new Error('usage: generate-reel.js <published-article-uuid|--latest> [--upload] | --sample');
  if (sampleMode && upload) throw new Error('--sample cannot upload to storage');
    if (!fs.existsSync(FONT_FILE)) throw new Error(`bengali_caption_font_not_found: ${FONT_FILE}`);
  let client = null;
  let tempDir;
  try {
    let article;
    if (sampleMode) {
      article = {
        id: '00000000-0000-4000-8000-000000000001',
        slug: 'reel-validation-sample',
        title_bn: 'বাংলাদেশে সংবাদ প্রযুক্তির নতুন অগ্রযাত্রা',
        excerpt_bn: 'ডিজিটাল সংবাদ সেবায় নতুন প্রযুক্তি যুক্ত হচ্ছে। পাঠকের কাছে দ্রুত ও নির্ভরযোগ্য তথ্য পৌঁছে দেওয়াই এই উদ্যোগের লক্ষ্য।',
        content_bn: 'পরীক্ষামূলক রেন্ডার যাচাইয়ের জন্য তৈরি একটি নমুনা সংবাদ।',
        category_key: 'technology',
        thumbnail_url: null,
      };
    } else {
      const databaseUrl = process.env.SUPABASE_DB_URL;
      if (!databaseUrl) throw new Error('SUPABASE_DB_URL is not configured');
      client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
      await client.connect();
      article = await fetchArticle(client, target);
    }
    if (!article) throw new Error('no_published_article_found');
    const script = buildScript(article);
    if ([...script].length < 20) throw new Error('article_has_insufficient_bengali_script');
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'banglarvoice-reel-'));
    const audioPath = path.join(tempDir, 'narration.mp3');
    const subtitlesPath = path.join(tempDir, 'captions.vtt');
    const assPath = path.join(tempDir, 'captions.ass');
    const id = String(article.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    const outputPath = path.join(OUT_DIR, `reel-${sampleMode ? 'sample-' : ''}${id}.mp4`);

    const textPath = path.join(tempDir, 'script.txt');
    fs.writeFileSync(textPath, script, 'utf8');
    run('edge-tts', [
      '--voice', VOICE,
      '--rate=+2%',
      '--file', textPath,
      '--write-media', audioPath,
      '--write-subtitles', subtitlesPath,
    ], { timeout: 120_000 });
    if (!fs.existsSync(audioPath) || !fs.existsSync(subtitlesPath)) throw new Error('edge_tts_did_not_create_audio_and_captions');
    writeAssCaptions(subtitlesPath, assPath, article.title_bn);

    const audioInfo = JSON.parse(run('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', audioPath,
    ]));
    const duration = Number(audioInfo.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_REEL_SECONDS) {
      throw new Error(`narration_duration_out_of_range: ${duration}`);
    }

    const imagePath = await downloadArticleImage(article, tempDir);
    const inputs = imagePath
      ? ['-loop', '1', '-framerate', '30', '-i', imagePath, '-i', audioPath]
      : ['-f', 'lavfi', '-i', 'color=c=0x10182b:s=1080x1920:r=30', '-i', audioPath];
    const subtitleFilter = `subtitles=${escapeFilterPath(assPath)}:fontsdir=${escapeFilterPath(FONT_DIR)}`;
    const videoFilter = [
      'scale=1080:1920:force_original_aspect_ratio=increase',
      'crop=1080:1920',
      'setsar=1',
      'fps=30',
      'drawbox=x=0:y=0:w=iw:h=250:color=0xCC0000@0.92:t=fill',
      'drawbox=x=0:y=ih-130:w=iw:h=130:color=0x05070D@0.82:t=fill',
      subtitleFilter,
    ].join(',');
    run('ffmpeg', [
      '-y', ...inputs,
      '-vf', videoFilter,
      '-map', '0:v:0', '-map', '1:a:0',
      '-t', duration.toFixed(3),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', '-shortest', outputPath,
    ], { timeout: 300_000 });

    const rendered = JSON.parse(run('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,width,height,codec_name',
      '-of', 'json', outputPath,
    ]));
    const videoStream = (rendered.streams || []).find((stream) => stream.codec_type === 'video');
    if (!videoStream || videoStream.width !== 1080 || videoStream.height !== 1920) throw new Error('reel_output_dimensions_invalid');
    const outputSize = Number(rendered.format?.size || 0);
    if (!outputSize || outputSize > MAX_UPLOAD_BYTES) throw new Error('reel_output_size_out_of_range');

    const objectPath = `articles/${id}/reel-${Date.now()}.mp4`;
    const storagePath = upload ? await uploadPrivateMp4(outputPath, objectPath) : null;
    const metadataPath = `${outputPath}.json`;
    fs.writeFileSync(metadataPath, JSON.stringify({
      article_id: article.id,
      title_bn: article.title_bn,
      category_key: article.category_key,
      voice: VOICE,
      script_bn: script,
      width: videoStream.width,
      height: videoStream.height,
      duration_seconds: Number(rendered.format?.duration || duration),
      local_video_path: outputPath,
      private_storage_bucket: upload ? 'reels' : null,
      private_storage_path: storagePath,
      generated_at: new Date().toISOString(),
    }, null, 2));

    console.log(JSON.stringify({
      ok: true,
      article_id: article.id,
      width: videoStream.width,
      height: videoStream.height,
      duration_seconds: Number(rendered.format?.duration || duration),
      video_path: outputPath,
      storage_bucket: upload ? 'reels' : null,
      storage_path: storagePath,
      published: false,
      social_queue_updated: false,
    }, null, 2));
  } finally {
    if (client) await client.end();
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'reel_generation_failed' }));
  process.exitCode = 1;
});
