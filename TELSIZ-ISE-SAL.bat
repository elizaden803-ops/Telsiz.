@echo off
chcp 65001 >nul
title TELSIZ SERVER
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo   Node.js tapilmadi. Bu, bir defelik teleb olunur.
  echo   Indi yukleme sehifesi acilir - "LTS" duymesini basib qurun,
  echo   qurtardiqdan sonra bu fayla YENIDEN iki defe klikleyin.
  echo.
  start https://nodejs.org/
  pause
  exit /b
)

if not exist node_modules (
  echo.
  echo   Ilk defe hazirlanir, bir az gozleyin...
  echo.
  call npm install --no-fund --no-audit
)

start "" cmd /c "timeout /t 2 >nul && start http://localhost:3000/"

echo.
echo   TELSIZ ise dusur... Bu pencereni BAGLAMAYIN.
echo.
node server.js

pause
