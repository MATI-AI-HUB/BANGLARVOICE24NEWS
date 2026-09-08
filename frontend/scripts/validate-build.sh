#!/usr/bin/env bash
# Banglar Voice — Frontend legal/compliance build-safety gate.
# Usage: bash scripts/validate-build.sh   (from repo root, e.g. frontend/)
set -euo pipefail

echo "==> [1/4] TypeScript type-check (tsc --noEmit)"
npx tsc --noEmit

echo "==> [2/4] Fake-lawyer / placeholder scan (must return nothing)"
if grep -Rnw app -e "Lawyer Name" -e "Advocate Smith" -e "John Doe, Esq" 2>/dev/null; then
  echo "FAIL: fake lawyer placeholder found in app/" >&2
  exit 1
fi
echo "    clean: no fake lawyer names."

echo "==> [3/4] Static legal date anchor present"
if ! grep -Rq "08 Sep 2026" "app/(legal)"; then
  echo "FAIL: '08 Sep 2026' anchor missing in app/(legal)/" >&2
  exit 1
fi
echo "    anchor ok."

echo "==> [4/4] Production build"
npm run build

echo "==> All legal-compliance checks passed. ✔"
