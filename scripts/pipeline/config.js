/**
 * Banglar Voice Pipeline Config — Environment-Aware
 * Works in Termux (Android) AND GitHub Actions (Ubuntu)
 */
const fs = require('fs');
const path = require('path');

const PIPELINE_DIR = __dirname;
const ROOT = path.resolve(PIPELINE_DIR, '../..');
const TMP = path.join(PIPELINE_DIR, 'tmp');
const OUTPUT = path.join(PIPELINE_DIR, 'output');

// Auto-create all dirs
[TMP, OUTPUT].forEach(d => fs.mkdirSync(d, { recursive: true }));

// Env detection
const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';
const IS_TERMUX = !!(process.env.PREFIX && process.env.PREFIX.includes('com.termux'));
const IS_LINUX = process.platform === 'linux';

// Load env vars
function loadEnv() {
  const envPath = path.join(ROOT, 'frontend/.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    console.log('📁 Env: .env.local');
  } else {
    console.log('🌐 Env: process.env (CI)');
  }
}

// Video codec — Ubuntu has libx264, Termux limited to mpeg4
function videoCodec() {
  if (IS_GITHUB_ACTIONS || (!IS_TERMUX && IS_LINUX)) return 'libx264';
  return 'mpeg4';
}

// Codec-specific ffmpeg options
function codecOptions() {
  return videoCodec() === 'libx264' 
    ? ['-preset', 'veryfast', '-crf', '23']
    : ['-q:v', '5'];
}


// Shell path — /bin/bash on Ubuntu, termux bash on Android
function shell() {
  if (IS_TERMUX) return '/data/data/com.termux/files/usr/bin/bash';
  return '/bin/bash';
}

// Spawn options
function spawnOpts(extra = {}) {
  return { shell: shell(), ...extra };
}

module.exports = {
  PIPELINE_DIR, ROOT, TMP, OUTPUT,
  IS_GITHUB_ACTIONS, IS_TERMUX, IS_LINUX,
  loadEnv, videoCodec, codecOptions, shell, spawnOpts,
};
