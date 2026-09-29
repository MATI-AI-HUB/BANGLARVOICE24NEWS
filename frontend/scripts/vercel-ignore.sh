#!/usr/bin/env bash
set -euo pipefail
# Vercel Ignored Build Step: exit 0 skips the build, exit 1 proceeds.
# Worker/data-only commits must not burn Hobby deploy quota.
root="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
if git -C "$root" diff --quiet HEAD^ HEAD -- frontend/ 2>/dev/null; then
  echo "No frontend/ changes; skipping Vercel build"
  exit 0
fi
exit 1
