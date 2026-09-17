#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════
#  Banglar Voice — Cron Setup
#  Installs the pipeline cron job (idempotent)
# ═══════════════════════════════════════════════════════

set +H
ROOT="$HOME/Banglarvoice-apps"
RUNNER="$ROOT/scripts/pipeline/run-daily.sh"
CRON_TAG="banglar-voice-pipeline"

if [ ! -f "$RUNNER" ]; then
  echo "❌ Runner not found: $RUNNER"
  exit 1
fi

if ! command -v crontab >/dev/null 2>&1; then
  echo "❌ crontab not found. Install: pkg install cronie termux-services"
  exit 1
fi

# ─── Fetch existing crontab ───
EXISTING=$(crontab -l 2>/dev/null || echo "")

# Remove any old Banglar Voice entries
CLEANED=$(echo "$EXISTING" | grep -v "$CRON_TAG" || true)

# Add new entry
NEW_CRON="$CLEANED
# ─── Banglar Voice Pipeline ($CRON_TAG) ───
# Runs every 6 hours: 00:00, 06:00, 12:00, 18:00
# Change '--public' to '' for unlisted-only safe mode
0 */6 * * * $RUNNER --public >> \$HOME/bv-pipeline-logs/cron-stderr.log 2>&1"

echo "$NEW_CRON" | crontab -

echo "✅ Cron job installed"
echo ""
echo "════ Active crontab ════"
crontab -l | grep -A 3 "$CRON_TAG"
echo ""
echo "════ Verify service ════"
if command -v sv >/dev/null 2>&1; then
  if sv status crond >/dev/null 2>&1; then
    sv status crond
  else
    echo "⚠️  crond service not enabled. Run:"
    echo "   sv-enable crond"
  fi
fi
echo ""
echo "💡 Test manually: bash $RUNNER --public"
echo "💡 View logs:    ls -la \$HOME/bv-pipeline-logs/"
echo "💡 Remove cron:  crontab -e  (delete banglar-voice lines)"
