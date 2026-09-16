/**
 * auto-pipeline.js — Full Article → YouTube automation
 * Usage:
 *   node scripts/pipeline/auto-pipeline.js                  # unlisted, latest
 *   node scripts/pipeline/auto-pipeline.js --public         # public
 *   node scripts/pipeline/auto-pipeline.js --article <id>   # specific
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const isPublic = args.includes('--public');
let articleArg = '--latest';
const artIdx = args.indexOf('--article');
if (artIdx !== -1 && args[artIdx + 1]) articleArg = args[artIdx + 1];

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║  BANGLAR VOICE — AUTO PIPELINE       ║');
console.log('╚══════════════════════════════════════╝');
console.log('Mode:   ' + (isPublic ? 'PUBLIC' : 'UNLISTED'));
console.log('Source: ' + articleArg);
console.log('');

const t0 = Date.now();

console.log('▶️  STEP 1: Generate video');
try {
  execSync(`node "${path.join(__dirname, 'generate-video.js')}" ${articleArg}`, {
    stdio: 'inherit',
    shell: '/data/data/com.termux/files/usr/bin/bash',
  });
} catch (e) { console.error('❌ Step 1 failed'); process.exit(1); }

console.log('');
console.log('▶️  STEP 2: Upload to YouTube');
try {
  const upArgs = isPublic ? '--latest --public' : '--latest';
  execSync(`node "${path.join(__dirname, 'upload-youtube.js')}" ${upArgs}`, {
    stdio: 'inherit',
    shell: '/data/data/com.termux/files/usr/bin/bash',
  });
} catch (e) { console.error('❌ Step 2 failed'); process.exit(1); }

const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║  ✅ PIPELINE COMPLETE (' + elapsed + 's)');
console.log('╚══════════════════════════════════════╝');
console.log('');
