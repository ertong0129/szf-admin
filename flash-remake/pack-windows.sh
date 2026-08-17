#!/bin/sh
# Build a Windows zip at the repo root for GitHub raw download.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
GAME="$ROOT/flash-remake/game"
OUT="$ROOT/daming-windows.zip"

cd "$GAME"
rm -f "$OUT" "$ROOT/大明传说-Windows.zip"
zip -r "$OUT" \
  index.html play.html server.js server.py serve.ps1 \
  start.bat 启动游戏.bat 使用说明.txt \
  css js assets data \
  -x "*/__pycache__/*"
cp -f "$OUT" "$ROOT/大明传说-Windows.zip"
echo "wrote $OUT"
unzip -l "$OUT" | tail -20
