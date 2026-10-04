@echo off
setlocal
cd /d "%~dp0"

set "PYTHON="
where py >nul 2>nul && set "PYTHON=py -3"
if not defined PYTHON where python >nul 2>nul && set "PYTHON=python"
if not defined PYTHON (
    echo [sync] Python was not found on PATH. Install Python 3.10+ from https://www.python.org/downloads/
    exit /b 1
)

echo [sync] Backing up saved boards. Any argument goes to utils\sync.py, for example:
echo [sync]   sync.bat --email rakeshmalik91@gmail.com
echo.
%PYTHON% utils\sync.py %*
set "CODE=%errorlevel%"

if not "%CODE%"=="0" echo.
if not "%CODE%"=="0" echo [sync] utils\sync.py exited with %CODE%.
endlocal & exit /b %CODE%