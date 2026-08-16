#!/bin/sh
# 在仓库根目录生成 Windows / Mac 可分发 zip
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT/hongwu-legend"
chmod +x start.command 启动游戏.command server.py "洪武风云录.app/Contents/MacOS/launcher" 2>/dev/null || true

FILES="
  index.html play.html server.js server.py package.json
  start.bat start.command
  启动游戏.bat 启动游戏.command
  使用说明.txt README.md
  css js assets docs
  洪武风云录.app
"

WIN="$ROOT/洪武风云录-Windows.zip"
MAC="$ROOT/洪武风云录-Mac.zip"
rm -f "$WIN" "$MAC"

zip -r "$WIN" $FILES \
  -x "tests/*" -x "*.zip" -x "data/*"
cp -f "$WIN" "$ROOT/hongwu-windows.zip"

zip -r "$MAC" $FILES \
  -x "tests/*" -x "*.zip" -x "data/*"
cp -f "$MAC" "$ROOT/hongwu-mac.zip"

echo "wrote $WIN"
echo "wrote $MAC"
