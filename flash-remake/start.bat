@echo off
cd /d %~dp0game
echo open http://127.0.0.1:8088/
node server.js
pause
