#!/bin/bash
set -euo pipefail

# Deploy without GitHub Actions minutes.
# Frontend: Vercel CLI (Git integration or this script).
# Edge functions: Supabase CLI.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required"
  exit 1
fi

echo "Deploying frontend on Vercel from frontend/"
cd "$ROOT/frontend"
npx --yes vercel@latest --prod --yes

if command -v supabase >/dev/null 2>&1; then
  echo "Deploying Supabase Edge Functions"
  cd "$ROOT"
  supabase functions deploy --project-ref "${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF}"
else
  echo "Supabase CLI not found. Install it, then run:"
  echo "  supabase functions deploy --project-ref \$SUPABASE_PROJECT_REF"
fi
