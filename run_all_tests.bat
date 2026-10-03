@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo [test] npm was not found on PATH. Install Node.js 20.19+ or 22.12+ from https://nodejs.org
    exit /b 1
)

if not exist "node_modules" (
    echo [test] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [test] npm install failed.
        exit /b 1
    )
)

echo.
echo === 1/3  Type check (tsc) ===
call npm run typecheck
if errorlevel 1 goto :fail

echo.
echo === 2/3  Lint (eslint) ===
call npm run lint
if errorlevel 1 goto :fail

echo.
echo === 3/3  Production build (vite build) ===
call npm run build
if errorlevel 1 goto :fail

echo.
echo === All checks passed ===
endlocal
exit /b 0

:fail
echo.
echo === Checks failed ===
endlocal
exit /b 1