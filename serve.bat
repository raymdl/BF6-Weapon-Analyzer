@echo off
REM Start a local dev server for the BF6 Weapon Analyzer site.
REM Required because browsers block module/data loading under file://.

cd /d "%~dp0"
echo.
echo Serving from: %CD%
echo Open in browser: http://localhost:5174/
echo Press Ctrl+C to stop.
echo.
node scripts\serve.mjs
