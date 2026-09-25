@echo off
title Carely (keep this window open)
cd /d "%~dp0"
if not exist node_modules (
  echo Installing, first time only...
  call npm install
)
start "" cmd /c "timeout /t 4 >nul & start http://localhost:5176"
call npm run dev
pause
