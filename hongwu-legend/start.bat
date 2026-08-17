@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title DaMing Legend
echo.
echo  DaMing Legend - local server
echo  --------------------------------
echo  Starting... browser opens when ready.
echo  Keep this window open.
echo.

set "OPEN_BROWSER=1"

where node >nul 2>nul
if errorlevel 1 goto try_py
node -p "process.versions.node" >nul 2>nul
if errorlevel 1 goto try_py
echo  Using Node.js
node server.js
if not errorlevel 1 goto done
echo  Node failed, trying Python.

:try_py
where py >nul 2>nul
if errorlevel 1 goto try_python
echo  Using Python launcher
py -3 server.py
if not errorlevel 1 goto done

:try_python
where python >nul 2>nul
if errorlevel 1 goto try_python3
echo  Using python
python server.py
if not errorlevel 1 goto done

:try_python3
where python3 >nul 2>nul
if errorlevel 1 goto nofound
echo  Using python3
python3 server.py
if not errorlevel 1 goto done

:nofound
echo.
echo  Node.js / Python not found.
echo  Opening index.html without server save.
echo  Install Node.js: https://nodejs.org
echo.
start "" "%~dp0index.html"
pause
exit /b 1

:done
echo.
echo  Server stopped.
pause
exit /b 0
