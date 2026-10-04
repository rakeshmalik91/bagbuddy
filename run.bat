@echo off
setlocal

where npm >nul 2>nul
if errorlevel 1 (
    echo [run] npm was not found on PATH. Install Node.js 20.19+ or 22.12+ from https://nodejs.org
    exit /b 1
)

:: The server runs in this same console, but it is not a child of this script.
:: That is what keeps Ctrl+C quiet: there is no batch left to stop and ask
:: "Terminate batch job (Y/N)?", the console simply signals PowerShell, which
:: stops the server. Closing the window works too, because
:: utils\dev-server.ps1 ties the server to the console it was started in.
:: An optional first argument is the port, which must match webapp\vite.config.ts.
start /b powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0utils\dev-server.ps1" %*

echo [run] Dev server starting in this window. Press Ctrl+C, or close the window, to stop it.

endlocal & exit /b 0