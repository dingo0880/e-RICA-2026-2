@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js and try again.
  pause
  exit /b 1
)
echo Starting archived E-RICA Quiz UI...
echo Keep this window open while using the quiz.
node server.cjs --open
pause
