@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  echo 启动本地服务端 http://127.0.0.1:8088/
  echo 测试账号 demo / 123456
  echo 关闭本窗口即停止服务。
  start "" http://127.0.0.1:8088/
  node server.js
  goto :eof
)
echo 未检测到 Node.js，改为直接打开大厅页面。
echo 完整选服存档请先安装 Node.js 后重新运行本脚本。
start "" "%~dp0index.html"
exit /b 0
