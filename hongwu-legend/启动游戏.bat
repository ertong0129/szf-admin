@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在打开《洪武风云录》……
echo 若浏览器未弹出，请手动双击本目录中的 index.html
start "" "%~dp0index.html"
exit /b 0
