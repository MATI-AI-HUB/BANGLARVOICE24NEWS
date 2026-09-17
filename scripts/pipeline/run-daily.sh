#!/data/data/com.termux/files/usr/bin/bash
# ═════════════════════════════════════════════════════════════════
#  Banglar Voice — Daily Pipeline Runner (Production)
#  Features: PATH setup, wake-lock, lock file, logging, notifications
# ═════════════════════════════════════════════════════════════════

set +H
set -u

# ─── Config ───
ROOT="$HOME/Banglarvoice-apps"
LOG_DIR="$HOME/bv-pipeline-logs"
LOCK_FILE="$HOME/.bv-pipeline.lock"
MAX_LOG_AGE_DAYS=14
PUBLIC_MODE="${1:-}"
WAKE_LOCK_TAG="bv-pipeline-$(date +%s)"

# ─── Setup PATH (cron doesn't load .bashrc) ───
export PATH="$PREFIX/bin:$PATH"
export PREFIX="/data/data/com.termux/files/usr"
export HOME="/data/data/com.termux/files/home"
export PATH="$PREFIX/bin:$PREFIX/bin/applets:$PATH"

# ─── Determine article arg ───
ARTICLE_ARG="--latest"
if [ "$PUBLIC_MODE" = "--article" ] && [ -n "${2:-}" ]; then
  ARTICLE_ARG="$2"
fi

# ─── Public flag (default: unlisted, safe) ───
UPLOAD_MODE="--unlisted"
if [ "$PUBLIC_MODE" = "--public" ] || [ "$2" = "--public" ]; then
  UPLOAD_MODE="--public"
fi

# ─── Log setup ───
mkdir -p "$LOG_DIR"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/run-$RUN_ID.log"
LAST_LOG="$LOG_DIR/latest.log"
ln -sf "$LOG" "$LAST_LOG"

log() {
  echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"
}

# ─── Lock file check (prevent overlap) ───
if [ -f "$LOCK_FILE" ]; then
  OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "0")
  if [ "$OLD_PID" -gt 0 ] && kill -0 "$OLD_PID" 2>/dev/null; then
    log "⚠️  Previous run (PID $OLD_PID) still active — SKIPPING"
    exit 0
  fi
  log "🧹 Stale lock file removed (PID $OLD_PID dead)"
  rm -f "$LOCK_FILE"
fi

# ─── Create lock ───
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT INT TERM

# ─── Wake lock (prevent phone sleep) ───
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
  log "🔒 Wake-lock acquired"
fi

# ─── Notify start ───
if command -v termux-notification >/dev/null 2>&1; then
  termux-notification \
    --title "Banglar Voice Pipeline" \
    --content "Starting video generation..." \
    --id "bv-pipeline" 2>/dev/null || true
fi

# ─── Header ───
{
  echo "╔════════════════════════════════════════════════════╗"
  echo "║  BANGLAR VOICE PIPELINE — Scheduled Run            ║"
  echo "╚════════════════════════════════════════════════════╝"
  echo "  RUN_ID:    $RUN_ID"
  echo "  ARTICLE:   $ARTICLE_ARG"
  echo "  UPLOAD:    $UPLOAD_MODE"
  echo "  LOG:       $LOG"
  echo "  HOST:      $(uname -a | cut -c1-60)"
  echo "════════════════════════════════════════════════════"
  echo ""
} | tee -a "$LOG"

# ─── Rotate old logs ───
find "$LOG_DIR" -name "run-*.log" -mtime +$MAX_LOG_AGE_DAYS -delete 2>/dev/null || true

# ─── Run pipeline ───
cd "$ROOT" || { log "❌ Cannot cd to $ROOT"; exit 1; }

START_TS=$(date +%s)

if node scripts/pipeline/auto-pipeline.js "$ARTICLE_ARG" $UPLOAD_MODE >> "$LOG" 2>&1; then
  STATUS="✅ SUCCESS"
  EXIT_CODE=0
else
  STATUS="❌ FAILED"
  EXIT_CODE=1
fi

END_TS=$(date +%s)
ELAPSED=$((END_TS - START_TS))

# ─── Extract result info ───
VIDEO_URL=$(grep -oE 'https://youtu\.be/[A-Za-z0-9_-]+' "$LOG" | tail -1 || echo "")
VIDEO_ID=$(echo "$VIDEO_URL" | grep -oE '[A-Za-z0-9_-]+$' || echo "")
ARTICLE_TITLE=$(grep -oE '📰 Article: .*' "$LOG" | tail -1 | sed 's/📰 Article: //' || echo "unknown")

# ─── Footer ───
{
  echo ""
  echo "════════════════════════════════════════════════════"
  echo "  Status:  $STATUS"
  echo "  Elapsed: ${ELAPSED}s"
  echo "  Article: $ARTICLE_TITLE"
  [ -n "$VIDEO_URL" ] && echo "  Video:   $VIDEO_URL"
  echo "════════════════════════════════════════════════════"
} | tee -a "$LOG"

# ─── Notification ───
if command -v termux-notification >/dev/null 2>&1; then
  if [ $EXIT_CODE -eq 0 ]; then
    termux-notification \
      --title "✅ Video Published" \
      --content "$ARTICLE_TITLE" \
      --id "bv-pipeline" \
      --priority "default" 2>/dev/null || true
  else
    termux-notification \
      --title "❌ Pipeline Failed" \
      --content "See log: $LOG" \
      --id "bv-pipeline" \
      --priority "high" 2>/dev/null || true
  fi
fi

# ─── Release wake lock ───
if command -v termux-wake-unlock >/dev/null 2>&1; then
  termux-wake-unlock
fi

exit $EXIT_CODE
