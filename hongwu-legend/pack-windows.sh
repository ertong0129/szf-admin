#!/bin/sh
# 在仓库根目录生成 Windows / Mac 可分发 zip
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT/hongwu-legend"
chmod +x start.command 启动游戏.command server.py "大明传说.app/Contents/MacOS/launcher" 2>/dev/null || true

FILES="
  index.html play.html server.js server.py package.json
  start.bat start.command
  启动游戏.bat 启动游戏.command
  使用说明.txt README.md
  css js assets docs
  大明传说.app
"

WIN="$ROOT/大明传说-Windows.zip"
MAC="$ROOT/大明传说-Mac.zip"
rm -f "$MAC"
if [ "${MAC_ONLY:-0}" != "1" ]; then
  rm -f "$WIN"
fi

zip -r "$MAC" $FILES \
  -x "tests/*" -x "*.zip" -x "data/*" -x "__pycache__/*" -x "*/__pycache__/*"
cp -f "$MAC" "$ROOT/hongwu-mac.zip"

if [ "${MAC_ONLY:-0}" != "1" ]; then
  zip -r "$WIN" $FILES \
    -x "tests/*" -x "*.zip" -x "data/*" -x "__pycache__/*" -x "*/__pycache__/*"
  cp -f "$WIN" "$ROOT/hongwu-windows.zip"
  echo "wrote $WIN"
fi

echo "wrote $MAC"
