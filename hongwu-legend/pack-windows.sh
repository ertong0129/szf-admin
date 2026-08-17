#!/bin/sh
# 在仓库根目录生成 Windows 可分发 zip。
# 游戏内容有改动时必须重打 Windows 包，并提交仓库根目录 hongwu-windows.zip，供 GitHub 直链下载。
# 不再默认打 Mac 包。
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT/hongwu-legend"

FILES="
  index.html play.html server.js server.py store_db.py package.json
  start.bat start.command
  启动游戏.bat 启动游戏.command
  使用说明.txt README.md
  css js assets docs
"

WIN="$ROOT/大明传说-Windows.zip"
rm -f "$WIN"
zip -r "$WIN" $FILES \
  -x "tests/*" -x "*.zip" -x "data/*" -x "__pycache__/*" -x "*/__pycache__/*"
cp -f "$WIN" "$ROOT/hongwu-windows.zip"
echo "wrote $WIN"
echo "wrote $ROOT/hongwu-windows.zip"
