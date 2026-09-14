#!/data/data/com.termux/files/usr/bin/bash
set -e

PROJECT_REF="iqdpuedsykjicquvnmii"
FUNCTION_NAME="news-pipeline"
FUNCTION_DIR="supabase/functions/${FUNCTION_NAME}"
SHARED_DIR="supabase/functions/_shared"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN not set"
  exit 1
fi

if [ ! -f "${FUNCTION_DIR}/index.ts" ]; then
  echo "❌ Not found: ${FUNCTION_DIR}/index.ts"
  exit 1
fi

echo "📦 Bundling function..."

TMP=~/deploy_bundle.ts
python3 << 'PYEOF' > "$TMP"
import re
from pathlib import Path

shared_dir = Path('supabase/functions/_shared')
func_dir = Path('supabase/functions/news-pipeline')

main = (func_dir / 'index.ts').read_text(encoding='utf-8')
cors_code = (shared_dir / 'cors.ts').read_text(encoding='utf-8')
ai_client_code = (shared_dir / 'ai-client.ts').read_text(encoding='utf-8')

main = re.sub(r'import\s+\{[^}]+\}\s+from\s+["\']\.\./_shared/[^"\']+["\'];?\s*\n', '', main)

cors_clean = cors_code.replace('export function ', 'function ').replace('export const ', 'const ')

ai_clean = ai_client_code.replace('export async function ', 'async function ').replace('export interface ', 'interface ').replace('export type ', 'type ')
ai_clean = re.sub(r'import\s+type\s+\{[^}]+\}\s+from\s+["\'][^"\']+["\'];?\s*\n', '', ai_clean)

print("// === BUNDLED: cors.ts ===")
print(cors_clean)
print()
print("// === BUNDLED: ai-client.ts ===")
print(ai_clean)
print()
print("// === MAIN: news-pipeline/index.ts ===")
print(main)
PYEOF

echo "📊 Bundle size: $(wc -c < $TMP) bytes"

PAYLOAD=$(python3 -c "
import json
code = open('$TMP').read()
print(json.dumps({
  'slug': '${FUNCTION_NAME}',
  'name': '${FUNCTION_NAME}',
  'body': code,
  'verify_jwt': False
}))
")

echo "🚀 Deploying to Supabase..."

HTTP_STATUS=$(curl -s -o ~/deploy_resp.json -w "%{http_code}" \
  -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

if [ "$HTTP_STATUS" = "409" ] || [ "$HTTP_STATUS" = "400" ]; then
  echo "⚠️  Function exists — trying PATCH..."
  HTTP_STATUS=$(curl -s -o ~/deploy_resp.json -w "%{http_code}" \
    -X PATCH \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}")
fi

echo ""
echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
cat ~/deploy_resp.json | head -20

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo ""
  echo "✅ Deploy successful!"
else
  echo ""
  echo "❌ Deploy failed"
fi

rm -f "$TMP"
