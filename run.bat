@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo [run] npm was not found on PATH. Install Node.js 20.19+ or 22.12+ from https://nodejs.org
    exit /b 1
)

if not exist "node_modules" (
    echo [run] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [run] npm install failed.
        exit /b 1
    )
)

echo [run] Starting the dev server. Your browser will open once it is ready.
echo [run] Press Ctrl+C to stop.
echo.

call npm run dev:open
endlocal