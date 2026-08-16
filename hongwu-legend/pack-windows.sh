#!/bin/sh
# 在仓库根目录生成可分发的 Windows zip
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/洪武风云录-Windows.zip"
rm -f "$OUT"
cd "$ROOT/hongwu-legend"
zip -r "$OUT" \
  index.html play.html server.js package.json \
  启动游戏.bat 使用说明.txt README.md \
  css js assets \
  -x "tests/*" -x "*.zip" -x "data/*"
echo "wrote $OUT"
