#!/bin/bash
echo "========================================="
echo " BANGLAR VOICE: FINAL PRE-LAUNCH AUDIT"
echo "========================================="

check_file() { [ -f "$1" ] && echo "✅ PASS: $1" || echo "❌ FAIL: $1 MISSING"; }
check_dep() { grep -q "\"$2\"" "$1" 2>/dev/null && echo "✅ PASS: Dependency '$2'" || echo "❌ FAIL: Dependency '$2' MISSING"; }

echo -e "\n--- Core Features ---"
check_file "frontend/app/pricing/page.tsx"
check_file "frontend/app/article/[id]/page.tsx"
check_file "worker/src/sentry.ts"
check_file "supabase/functions/paywall/index.ts"

echo -e "\n--- Monitoring & Ops ---"
check_file ".github/workflows/backup-automation.yml"
check_file ".github/workflows/android-release.yml"
check_file "frontend/components/plausible.tsx"
check_file "frontend/middleware.ts"
check_dep "frontend/package.json" "@sentry/nextjs"
check_dep "worker/package.json" "@sentry/node"

echo -e "\n--- Security ---"
check_file "frontend/lib/rate-limit.ts"
grep -q "SENTRY_DSN" frontend/.env.example 2>/dev/null && echo "✅ PASS: Sentry Env Configured" || echo "⚠️ WARN: Sentry Env Missing"

echo -e "\n========================================="
echo " AUDIT COMPLETE"
echo "========================================="
