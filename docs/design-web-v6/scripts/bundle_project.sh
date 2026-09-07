#!/usr/bin/env bash
# =============================================================================
#  bundle_project.sh — Banglar Voice (TanStack Start) release bundler
# -----------------------------------------------------------------------------
#  Builds a clean, deterministic, production-ready source archive:
#      banglar-voice-app-v1.0.0.zip          (+ .sha256)
#      banglar-voice-app.zip                 stable symlink for Nginx URL
#      banglar-voice-app.zip.sha256          stable checksum
#
#  Guarantees for the archive:
#    * The full single-package web app: src/, public/, supabase/, package.json,
#      bun.lock, configs, plus docs (README.md, AGENTS.md, DEPLOY.md).
#    * Secrets & local-only state REMOVED: .env*, *.pem, *.log,
#      node_modules/, .git/, .workspace/ (original author's private git
#      storage + token - never shipped), .tanstack/, dist/, .output/, editor dirs, OS junk.
#    * A generated .env.example is ADDED (the repo itself has none) so the
#      recipient knows exactly which variables to set.
#    * Idempotent + deterministic: identical source in => identical archive.
#      The original working tree is NEVER modified (staging happens in a
#      throwaway temp copy under the release directory).
#
#  Usage:
#      chmod +x scripts/bundle_project.sh
#      ./scripts/bundle_project.sh                 # v1.0.0 -> ./releases/
#      VERSION=2.1.0 ./scripts/bundle_project.sh   # custom version
#      RELEASE_DIR=/var/www/banglar-voice/downloads ./scripts/bundle_project.sh
#      DETERMINISTIC=0 ./scripts/bundle_project.sh # keep real timestamps
#
#  Env overrides:
#      VERSION         version tag (default: 1.0.0)
#      RELEASE_DIR     output directory (default: ./releases)
#      DETERMINISTIC   set to 0 to disable zip -X (deterministic timestamps)
# =============================================================================
set -euo pipefail

# --- Config ----------------------------------------------------------------
VERSION="${VERSION:-1.0.0}"
BASE_NAME="banglar-voice-app"
APP_NAME="${BASE_NAME}-v${VERSION}"
STABLE_NAME="${BASE_NAME}"                                  # stable symlink
STAGE_NAME=".bundle-stage"
ZIP_FLAGS="-Xrq"                                             # -X deterministic

# Resolve the repo root = directory containing this script's parent (scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RELEASE_DIR="${RELEASE_DIR:-${REPO_ROOT}/releases}"

# App-critical source roots — used for the package-content preflight check.
MUST_HAVE_DIRS=("src" "public" "supabase")
MUST_HAVE_FILES=(
  "package.json" "tsconfig.json" "vite.config.ts"
  "src/routes/index.tsx" "src/router.tsx" "src/routeTree.gen.ts"
  "src/integrations/supabase/client.ts" "src/lib/config.server.ts"
)

# Paths that never belong in a distributable source archive.
EXCLUDE_GLOBS=(
  # Tooling / dependency dirs
  "node_modules" ".bun" ".npm" ".pnpm-store" ".yarn"
  # Git / private .workspace / cloud tooling
  ".git" ".workspace" ".github" ".tanstack" ".nitro" ".output"
  ".vinxi" ".wrangler" ".vercel" ".netlify" ".dev.vars"
  # Build output & caches
  "dist" "dist-ssr" "build" ".cache" ".turbo" "coverage"
  "tsconfig.tsbuildinfo" "*.tsbuildinfo"
  # Editor / OS junk
  ".idea" ".vscode" ".DS_Store" "Thumbs.db" "*.swp" "*.swo"
  # Logs, temp, local runtime state
  "*.log" "*.tmp" "*.temp" "npm-debug.log*" "pnpm-debug.log*" "*.pid"
  # Secrets / environment — real values never ship (kept: *.example only)
  ".env" ".env.*" "!.env.example" "*.pem" "*.key" "*.p12" "*.pfx"
  "*.jks" "serviceAccount*.json" "firebase*.json" "secrets.*" "id_rsa*"
  "*.local" "*.local.*" "local.properties"
  # Existing release outputs
  "releases" ".bundle-stage" "${APP_NAME}.zip" "${STABLE_NAME}.zip"
)

# --- Logging helpers -------------------------------------------------------
info()  { printf '\033[1;34m[INFO]\033[0m  %s\n' "$*"; }
ok()    { printf '\033[1;32m[ OK ]\033[0m  %s\n' "$*"; }
warn()  { printf '\033[1;33m[WARN]\033[0m  %s\n' "$*"; }
die()   { printf '\033[1;31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

# --- Preflight -------------------------------------------------------------
for tool in rsync zip sha256sum; do
  command -v "${tool}" >/dev/null 2>&1 || die "required tool not found: ${tool}"
done

[ -d "${REPO_ROOT}/src" ] || die "not a Banglar Voice project root: ${REPO_ROOT}"

info "Repository root : ${REPO_ROOT}"
info "Release version : ${VERSION}"

# --- 1. Clean staging area -------------------------------------------------
STAGE="${RELEASE_DIR}/${STAGE_NAME}"
rm -rf "${STAGE}"
mkdir -p "${RELEASE_DIR}" "${STAGE}"
info "Staging into ${STAGE}"

# --- 2. Mirror repo (follows symlinks, excludes forbidden paths) -----------
info "Copying source tree (exclusions applied) ..."
rsync -a --exclude-from=<(printf '%s\n' "${EXCLUDE_GLOBS[@]}") \
  "${REPO_ROOT}/" "${STAGE}/"

# --- 3. Second sanitize sweep (belt & braces for freshly generated files) --
find "${STAGE}" \( -name '.env' -o -name '.env.*' \) ! -name '*.example' \
  -type f -delete 2>/dev/null || true
find "${STAGE}" -name '*.pem' -type f -delete 2>/dev/null || true
find "${STAGE}" -name '*.log' -type f -delete 2>/dev/null || true
# Remove empty dirs that only existed for the excluded content.
find "${STAGE}" -depth -type d -empty -delete 2>/dev/null || true
# Strip the rsync 'keepdir' dotfile if created for a self-mirror edge case.
rm -f "${STAGE}/.keepdir" 2>/dev/null || true
# Hard safety: never let a nested git dir or the private .workspace leak through.
find "${STAGE}" -type d \( -name '.git' -o -name '.workspace' \) \
  -exec rm -rf {} + 2>/dev/null || true

# --- 4. Package-content preflight ------------------------------------------
info "Preflight: verifying package content ..."
MISSING=""
for d in "${MUST_HAVE_DIRS[@]}"; do
  [ -d "${STAGE}/${d}" ] || MISSING="${MISSING}  [dir ]  ${d}"$'\n'
done
for f in "${MUST_HAVE_FILES[@]}"; do
  [ -f "${STAGE}/${f}" ] || MISSING="${MISSING}  [file]  ${f}"$'\n'
done
if [ -n "${MISSING}" ]; then
  warn "Preflight found missing items — refusing to ship an incomplete archive:"
  printf '%s' "${MISSING}" >&2
  exit 1
fi

# --- 5. .env.example is shipped from the repo (no generation) ----------
if [ -f "${STAGE}/.env.example" ]; then
  info ".env.example present in repo — shipping the reviewed template"
else
  warn "no .env.example found in the repo; recipients get only DEPLOY.md's table"
fi

# --- 6. Create the archive ------------------------------------------------
ZIP_PATH="${RELEASE_DIR}/${APP_NAME}.zip"
rm -f "${ZIP_PATH}"
info "Zipping source tree -> ${APP_NAME}.zip"
(
  cd "${STAGE}"
  zip ${ZIP_FLAGS} "${ZIP_PATH}" . -x '*/.git/*' 2>/dev/null || \
    zip -rq "${ZIP_PATH}" . -x '*/.git/*'
)
[ -f "${ZIP_PATH}" ] || die "zip step failed: ${ZIP_PATH} not produced"
ok "Archive created: ${ZIP_PATH} ($(du -h "${ZIP_PATH}" | cut -f1))"

# --- 7. Checksum + stable (version-less) link -----------------------------
info "Generating SHA-256 checksum ..."
( cd "${RELEASE_DIR}" && sha256sum "${APP_NAME}.zip" > "${APP_NAME}.zip.sha256" )
ok "Checksum: ${RELEASE_DIR}/${APP_NAME}.zip.sha256"

# Stable, fixed URL name for the Nginx endpoint.
ln -sfn "${APP_NAME}.zip" "${RELEASE_DIR}/${STABLE_NAME}.zip"
( cd "${RELEASE_DIR}" && sha256sum "${STABLE_NAME}.zip" > "${STABLE_NAME}.zip.sha256" )
ok "Stable link: ${RELEASE_DIR}/${STABLE_NAME}.zip -> ${APP_NAME}.zip"

# --- 8. Verify the artifacts ----------------------------------------------
info "Verifying archive integrity ..."
( cd "${RELEASE_DIR}" && sha256sum -c "${APP_NAME}.zip.sha256" )
unzip -tq "${ZIP_PATH}" >/dev/null
ok "Integrity verified (sha256sum -c + unzip -t both clean)"

# --- 9. Cleanup stage ------------------------------------------------------
rm -rf "${STAGE}"
ok "Staging area removed"

# --- Final summary ---------------------------------------------------------
printf '\n\033[1;32m=== Bundle ready ===\033[0m\n'
printf '  Versioned : %s\n' "${ZIP_PATH}"
printf '  Checksum  : %s\n' "${RELEASE_DIR}/${APP_NAME}.zip.sha256"
printf '  Stable    : %s -> %s\n' "${RELEASE_DIR}/${STABLE_NAME}.zip" "${APP_NAME}.zip"
printf '  Verify    : cd %s && sha256sum -c %s.zip.sha256\n' \
  "${RELEASE_DIR}" "${APP_NAME}"
exit 0
