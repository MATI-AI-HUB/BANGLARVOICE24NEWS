#!/data/data/com.termux/files/usr/bin/bash
set -e

PROJECT_REF="iqdpuedsykjicquvnmii"
FUNCTION_SLUG="news-pipeline"
BUNDLE_DIR=~/edge-function-deploy
BUNDLE_FILE="${BUNDLE_DIR}/index.ts"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN not set"
  echo "   export SUPABASE_ACCESS_TOKEN=sbp_xxx"
  exit 1
fi

echo "📦 Step 1: Bundling function..."

# Create a clean temporary directory
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

# Bundle the source code into a single file named index.ts
python3 << 'PYEOF' > "$BUNDLE_FILE"
import re
from pathlib import Path

shared = Path('supabase/functions/_shared')
func = Path('supabase/functions/news-pipeline')

main = (func / 'index.ts').read_text(encoding='utf-8')
cors = (shared / 'cors.ts').read_text(encoding='utf-8')
ai = (shared / 'ai-client.ts').read_text(encoding='utf-8')

# Remove shared imports from main
main = re.sub(r'import\s+\{[^}]+\}\s+from\s+["\']\.\./_shared/[^"\']+["\'];?\s*\n', '', main)

# Strip exports and type imports from shared files
cors = re.sub(r'\bexport\s+', '', cors)
ai = re.sub(r'\bexport\s+', '', ai)
ai = re.sub(r'import\s+type\s+\{[^}]+\}\s+from\s+["\'][^"\']+["\'];?\s*\n', '', ai)

print("// AUTO-BUNDLED for Supabase Edge Function deploy")
print(cors)
print(ai)
print(main)
PYEOF

echo "   ✅ Bundle: $(wc -l < $BUNDLE_FILE) lines, $(wc -c < $BUNDLE_FILE) bytes"
echo "   📁 Bundle location: $BUNDLE_FILE"

echo ""
echo "🚀 Step 2: Deploying via /functions/deploy endpoint..."

# Correct curl command for Supabase Management API
# - slug as query param
# - metadata as a JSON string in a form field
# - file as a separate form field with an explicit filename
HTTP_CODE=$(curl -s -o ~/deploy_resp.json -w "%{http_code}" \
  -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${FUNCTION_SLUG}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "content-type: multipart/form-data" \
  --form "metadata={\"entrypoint_path\":\"index.ts\",\"name\":\"${FUNCTION_SLUG}\",\"verify_jwt\":false}" \
  --form "file=@${BUNDLE_FILE};filename=index.ts")

echo ""
echo "HTTP Status: $HTTP_CODE"
echo "📋 Response:"
cat ~/deploy_resp.json | python3 -m json.tool 2>/dev/null || cat ~/deploy_resp.json

echo ""
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Deploy SUCCESS!"
  echo ""
  echo "🧪 Test with:"
  echo "   curl -X POST 'https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_SLUG}' \\"
  echo "     -H 'Authorization: Bearer \$SERVICE_KEY' \\"
  echo "     -H 'Content-Type: application/json' -d '{}'"
else
  echo "❌ Deploy FAILED (HTTP $HTTP_CODE)"
fi

# Clean up
rm -rf "$BUNDLE_DIR"
