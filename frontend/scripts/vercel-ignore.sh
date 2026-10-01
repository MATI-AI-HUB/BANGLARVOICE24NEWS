#!/usr/bin/env bash
set -euo pipefail
# Vercel Ignored Build Step: exit 0 = skip, exit 1 = proceed with build.
# Deploy policy: build for main, fix/* branches, and feature branches.

branch="${VERCEL_GIT_COMMIT_REF:-}"

case "$branch" in
  main|p1-owner-hardening|fix/*|feat/*|"")
    echo "✅ Allowed branch '${branch:-unknown}'; proceeding with Vercel build"
    exit 1
    ;;
  *)
    echo "⚠️  Branch '$branch' is not an allowed deploy branch; skipping"
    exit 0
    ;;
esac
