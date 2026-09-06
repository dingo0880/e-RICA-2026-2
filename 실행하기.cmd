@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js and try again.
  pause
  exit /b 1
)
echo Syncing TXT question sheets...
node scripts\sync-from-txt.cjs
if errorlevel 1 (
  echo TXT sync failed. Check the error above.
  pause
  exit /b 1
)
echo Building quiz data...
node scripts\build-data.cjs
if errorlevel 1 (
  echo Quiz data build failed. Check the error above.
  pause
  exit /b 1
)
echo Starting E-RICA Quiz...
echo Keep this window open while using the quiz.
node server.cjs --open
pause
