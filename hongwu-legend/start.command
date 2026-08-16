#!/bin/bash
cd "$(cd "$(dirname "$0")" && pwd)"
export OPEN_BROWSER=1
# 忽略管道断开，避免登录后拉图时把整个窗口打死
trap '' PIPE
echo
echo "  大明传说 · 本地服"
echo "  --------------------------------"
echo "  服务就绪后会自动打开浏览器。"
echo "  不要关这个窗口，关掉就停服。"
echo

have_node() {
  command -v node >/dev/null 2>&1 && node -p "process.versions.node" >/dev/null 2>&1
}

run_once() {
  if have_node; then
    echo "  使用 Node.js $(node -p "process.versions.node")"
    node server.js
    return $?
  fi
  if command -v python3 >/dev/null 2>&1; then
    echo "  使用 python3"
    python3 -u server.py
    return $?
  fi
  if command -v python >/dev/null 2>&1; then
    echo "  使用 python"
    python -u server.py
    return $?
  fi
  echo "  没找到 Node.js 或 Python，改为直接打开页面。"
  echo "  建议先装 Node.js：https://nodejs.org"
  open "index.html"
  read -r -p "按回车关闭…"
  return 0
}

trap 'echo; echo "  已停止服务。"; exit 0' INT TERM
while true; do
  run_once
  code=$?
  if [ "$code" -eq 0 ]; then
    break
  fi
  echo
  echo "  服务端异常退出（$code），3 秒后自动重启…"
  echo "  按 Ctrl+C 可彻底退出。"
  sleep 3
done
