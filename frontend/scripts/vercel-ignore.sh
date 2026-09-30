#!/usr/bin/env bash
set -euo pipefail
# Vercel Ignored Build Step: exit 0 skips the build, exit 1 proceeds.
# Hobby/preview: only build production branch `main` and owner hardening branch.

branch="${VERCEL_GIT_COMMIT_REF:-}"

case "$branch" in
  main|p1-owner-hardening|"")
    echo "Allowed branch '${branch:-unknown}'; proceeding with Vercel build"
    exit 1
    ;;
esac

echo "Branch '$branch' is not an allowed deploy branch; skipping Vercel build"
exit 0
