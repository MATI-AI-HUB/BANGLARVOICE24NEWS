echo "=== Z-CHECK E-PAPER ==="
find frontend -type f | xargs grep -l "ই-পেপার\|epaper\|e-paper" | head -10
echo "--- routes ---"
ls frontend/app/ | grep -E "epaper|e-paper|paper"
ls frontend/app/epaper/ 2>/dev/null || ls frontend/app/e-paper/ 2>/dev/null
echo "--- component ---"
cat frontend/app/epaper/page.tsx 2>/dev/null | head -50 || cat frontend/app/e-paper/page.tsx 2>/dev/null | head -50
echo "--- package ---"
grep -E "pdf|flip|sharp" frontend/package.json
