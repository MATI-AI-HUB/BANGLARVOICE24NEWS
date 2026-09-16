#!/data/data/com.termux/files/usr/bin/bash
set +H
cd /data/data/com.termux/files/home/Banglarvoice-apps
LOG_DIR="$HOME/bv-pipeline-logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/$(date +%Y%m%d-%H%M).log"
{
  echo "══════════════════════════════════════"
  echo "  PIPELINE: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "══════════════════════════════════════"
  node scripts/pipeline/auto-pipeline.js "$@" 2>&1
} | tee -a "$LOG"
