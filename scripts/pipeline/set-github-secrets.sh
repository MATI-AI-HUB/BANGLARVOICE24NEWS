#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════════════
#  GitHub Secrets Setter — from Supabase Vault
#  Reads secrets from Vault, uploads to GitHub Actions secrets
# ═══════════════════════════════════════════════════════════════

set +H
cd "$(dirname "$0")/../.."  # repo root
ROOT=$(pwd)

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  GitHub Secrets Uploader — from Vault              ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# ─── Config ───
REPO="banglarvoice33-byte/BANGLARVOICE-APPS"
ENV_FILE="frontend/.env.local"

# ─── Check gh CLI ───
if ! command -v gh >/dev/null 2>&1; then
  echo "❌ gh CLI not installed"
  echo "   Install: pkg install gh"
  exit 1
fi

# ─── Check PAT ───
if [ -z "${GH_TOKEN:-}" ]; then
  echo "⚠️  GH_TOKEN not set"
  echo ""
  echo "Please provide your GitHub PAT (starts with ghp_):"
  read -s PAT
  export GH_TOKEN="$PAT"
fi

# ─── Verify PAT works ───
echo "🔐 Verifying GitHub PAT..."
USER_INFO=$(gh api user 2>/dev/null)
if [ -z "$USER_INFO" ]; then
  echo "❌ PAT invalid or expired"
  exit 1
fi

LOGIN=$(echo "$USER_INFO" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).login))")
echo "   ✅ Authenticated as: $LOGIN"
echo ""

# ─── Verify repo access ───
echo "🔍 Checking repo access: $REPO"
if ! gh api "repos/$REPO" >/dev/null 2>&1; then
  echo "   ❌ Cannot access $REPO"
  echo "   Verify: repo exists + PAT has 'repo' scope"
  exit 1
fi
echo "   ✅ Repo accessible"
echo ""

# ─── Extract secrets from .env.local ───
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found"
  exit 1
fi

echo "📋 Extracting secrets from $ENV_FILE..."
echo ""

# Secret names to upload
SECRETS=(
  "SUPABASE_DB_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "GROQ_API_KEY"
  "OPENROUTER_API_KEY"
  "PEXELS_API_KEY"
  "YOUTUBE_API_KEY"
  "YOUTUBE_CHANNEL_ID"
  "OAUTH_CLIENT_ID"
  "OAUTH_CLIENT_SECRET"
  "YOUTUBE_REFRESH_TOKEN"
)

# ─── Upload each secret ───
UPLOADED=0
FAILED=0

for name in "${SECRETS[@]}"; do
  # Extract value
  value=$(grep "^${name}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')

  if [ -z "$value" ]; then
    echo "⚠️  ${name} — not found in .env.local (skip)"
    FAILED=$((FAILED+1))
    continue
  fi

  # Show masked value
  len=${#value}
  prefix="${value:0:8}"
  suffix="${value: -6}"
  echo "   [$((UPLOADED + FAILED + 1))/${#SECRETS[@]}] $name (${len} chars, ${prefix}...${suffix})"

  # Upload
  if echo "$value" | gh secret set "$name" --repo "$REPO" 2>/dev/null; then
    UPLOADED=$((UPLOADED+1))
  else
    echo "      ❌ Upload failed"
    FAILED=$((FAILED+1))
  fi
done

# ─── Summary ───
echo ""
echo "════════════════════════════════════════════════════"
echo "  ✅ Uploaded: $UPLOADED"
echo "  ❌ Failed:   $FAILED"
echo "════════════════════════════════════════════════════"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All secrets uploaded successfully!"
  echo ""
  echo "Verify: https://github.com/$REPO/settings/secrets/actions"
else
  echo "⚠️  Some secrets failed. Check above."
fi

# ─── List secrets on GitHub ───
echo ""
echo "📋 Secrets currently on GitHub:"
gh secret list --repo "$REPO" 2>&1 | head -20 || echo "   (could not list)"

