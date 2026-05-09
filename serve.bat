@echo off
REM Start a local dev server for the BF6 Weapon Analyzer site.
REM Required because pages now use fetch() to load data/*.json,
REM which browsers block under file:// for security reasons.

cd /d "%~dp0"
echo.
echo Serving from: %CD%
echo Open in browser: http://localhost:5174/
echo Press Ctrl+C to stop.
echo.
python -m http.server 5174
