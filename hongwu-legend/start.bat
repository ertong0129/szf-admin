@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title 大明传说
echo.
echo  大明传说 · 本地服
echo  --------------------------------
echo  正在启动，浏览器会在服务就绪后自动打开。
echo  不要关这个黑窗口，关掉就停服。
echo.

set "OPEN_BROWSER=1"
set "STARTED="

REM 先确认是真 Node，不是微软商店空壳
set "NODEVER="
for /f "delims=" %%i in ('node -p "process.versions.node" 2^>nul') do set "NODEVER=%%i"
if defined NODEVER (
  echo  使用 Node.js %NODEVER%
  node server.js
  if not errorlevel 1 goto :done
  echo  Node 启动失败，改试 Python。
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo  使用 Python 启动器
  py -3 server.py
  if not errorlevel 1 goto :done
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo  使用 python
  python server.py
  if not errorlevel 1 goto :done
)

where python3 >nul 2>nul
if %errorlevel%==0 (
  echo  使用 python3
  python3 server.py
  if not errorlevel 1 goto :done
)

echo.
echo  没找到可用的 Node.js 或 Python。
echo  将直接打开本地页面（没有服务端存档）。
echo  建议安装 https://nodejs.org 后重新双击本文件。
echo.
start "" "%~dp0index.html"
pause
exit /b 1

:done
echo.
echo  服务已结束。
pause
exit /b 0
