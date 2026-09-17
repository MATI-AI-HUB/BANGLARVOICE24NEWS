#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════
#  Banglar Voice — Pipeline Status Check
# ═══════════════════════════════════════════════════════

set +H
LOG_DIR="$HOME/bv-pipeline-logs"

echo ""
echo "═══════════════════════════════════════════════"
echo "  BANGLAR VOICE — PIPELINE STATUS"
echo "═══════════════════════════════════════════════"
echo ""

# ─── Cron status ───
echo "🔧 CRON:"
if command -v crontab >/dev/null 2>&1; then
  if crontab -l 2>/dev/null | grep -q "banglar-voice-pipeline"; then
    crontab -l | grep -A 1 "banglar-voice-pipeline" | tail -1 | sed 's/^/   /'
  else
    echo "   ❌ No cron installed"
  fi
else
  echo "   ❌ crontab not installed"
fi
echo ""

# ─── Service status ───
echo "🔌 SERVICE (crond):"
if sv status crond >/dev/null 2>&1; then
  sv status crond | sed 's/^/   /'
else
  echo "   ⚠️  crond status unknown"
fi
echo ""

# ─── Recent runs ───
echo "📋 RECENT RUNS (last 5):"
if [ -d "$LOG_DIR" ]; then
  ls -t "$LOG_DIR"/run-*.log 2>/dev/null | head -5 | while read f; do
    STATUS="?"
    if grep -q "✅ SUCCESS" "$f" 2>/dev/null; then STATUS="✅"; 
    elif grep -q "❌ FAILED" "$f" 2>/dev/null; then STATUS="❌"; 
    else STATUS="⏳"; fi
    SIZE=$(du -h "$f" | cut -f1)
    MTIME=$(date -r "$f" '+%m-%d %H:%M' 2>/dev/null || stat -c '%y' "$f" 2>/dev/null | cut -c1-16)
    printf "   %s %s  %s\n" "$STATUS" "$MTIME" "$(basename "$f")"
  done
else
  echo "   (no log dir)"
fi
echo ""

# ─── Last run summary ───
if [ -f "$LOG_DIR/latest.log" ]; then
  echo "🔍 LAST RUN DETAILS:"
  grep -E "📰 Article:|Status:|Elapsed:|Video:" "$LOG_DIR/latest.log" | tail -4 | sed 's/^/   /'
  echo ""
fi

# ─── Disk usage ───
echo "💾 DISK USAGE:"
du -sh "$LOG_DIR" 2>/dev/null | sed 's/^/   logs:   /'
du -sh ~/Banglarvoice-apps/scripts/pipeline/output 2>/dev/null | sed 's/^/   output: /'
echo ""

# ─── Lock status ───
LOCK="$HOME/.bv-pipeline.lock"
if [ -f "$LOCK" ]; then
  PID=$(cat "$LOCK" 2>/dev/null || echo "?")
  if kill -0 "$PID" 2>/dev/null; then
    echo "🔒 Pipeline running (PID $PID)"
  else
    echo "🧹 Stale lock (PID $PID) — safe to remove"
  fi
else
  echo "✅ No active pipeline"
fi
echo ""

echo "═══════════════════════════════════════════════"
