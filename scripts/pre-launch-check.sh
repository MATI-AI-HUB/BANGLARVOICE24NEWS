#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo " BANGLAR VOICE: PRE-LAUNCH MASTERCHECK"
echo "========================================="

FAIL=0

# 1. Git State Check
if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
  echo "❌ FAIL: Not on main branch"; FAIL=1; fi
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ FAIL: Uncommitted changes exist"; FAIL=1; fi

# 2. Critical Files Existence
for f in \
  frontend/app/pricing/page.tsx \
  frontend/app/article/\[slug]/page.tsx \
  frontend/components/paywall.tsx \
  frontend/components/ad-slot.tsx \
  frontend/components/plausible.tsx \
  frontend/lib/rate-limit.ts \
  frontend/middleware.ts \
  worker/src/sentry.ts \
  supabase/functions/_shared/sentry.ts \
  .github/workflows/backup-automation.yml \
  .github/workflows/android-release.yml \
  docs/HANDOVER.md; do
  [ -f "$f" ] || { echo "❌ MISSING: $f"; FAIL=1; }
done

# 3. Dependency Integrity
grep -q '"@sentry/nextjs"' frontend/package.json || { echo "❌ FAIL: @sentry/nextjs missing"; FAIL=1; }
grep -q '"@sentry/node"' worker/package.json || { echo "❌ FAIL: @sentry/node missing"; FAIL=1; }
grep -q '"@upstash/ratelimit"' frontend/package.json || { echo "❌ FAIL: @upstash/ratelimit missing"; FAIL=1; }

# 4. Security Headers Presence
grep -q 'Cache-Control.*immutable' frontend/next.config.js || { echo "⚠️ WARN: Immutable cache header missing"; }
grep -q 'X-Content-Type-Options' frontend/next.config.js || { echo "⚠️ WARN: X-Content-Type-Options missing"; }

# 5. Middleware Route Protection
grep -q '/admin/:path\*' frontend/middleware.ts || { echo "❌ FAIL: Admin route protection missing"; FAIL=1; }

# 6. Rate Limiting Active
grep -q 'slidingWindow' frontend/lib/rate-limit.ts || { echo "❌ FAIL: Rate limiter not configured"; FAIL=1; }

# 7. Backup Schedule Valid
grep -q 'cron.*0 2 \* \* 0' .github/workflows/backup-automation.yml || { echo "❌ FAIL: Weekly backup cron invalid"; FAIL=1; }

echo "========================================="
if [ $FAIL -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED — LAUNCH READY"
else
  echo "❌ CRITICAL FAILURES DETECTED — DO NOT DEPLOY"
fi
echo "========================================="
