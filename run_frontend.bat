@echo off
title TutorCRM Frontend
cd /d %~dp0frontend

set WIFI_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set WIFI_IP=%%a
)
set WIFI_IP=%WIFI_IP: =%

echo ========================================================
echo   Starting Next.js frontend...
echo   * On this PC:  http://localhost:3000
echo   * On your Phone: http://%WIFI_IP%:3000
echo ========================================================
echo.
call npm run dev
pause
