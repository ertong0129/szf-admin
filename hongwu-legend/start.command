#!/bin/bash
cd "$(cd "$(dirname "$0")" && pwd)"
export OPEN_BROWSER=1
echo
echo "  洪武风云录 · 本地服"
echo "  --------------------------------"
echo "  服务就绪后会自动打开浏览器。"
echo "  不要关这个窗口，关掉就停服。"
echo

have_node() {
  command -v node >/dev/null 2>&1 && node -p "process.versions.node" >/dev/null 2>&1
}

if have_node; then
  echo "  使用 Node.js $(node -p "process.versions.node")"
  exec node server.js
fi

if command -v python3 >/dev/null 2>&1; then
  echo "  使用 python3"
  exec python3 server.py
fi

if command -v python >/dev/null 2>&1; then
  echo "  使用 python"
  exec python server.py
fi

echo "  没找到 Node.js 或 Python，改为直接打开页面。"
echo "  建议先装 Node.js：https://nodejs.org"
open "index.html"
read -r -p "按回车关闭…"
