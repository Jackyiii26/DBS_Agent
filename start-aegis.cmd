@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20.10 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo Starting Aegis DCTA. Keep this window open while using the app.
echo Open http://localhost:3000 in your browser unless PORT is configured otherwise.
echo Press Ctrl+C to stop.
echo.
node server/index.mjs
if errorlevel 1 pause
