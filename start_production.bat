@echo off
title TutorCRM Production Server (Non-Docker)
echo ========================================================
echo   Starting TutorCRM in Native Production Mode
echo ========================================================

REM Automatically detect current Wi-Fi/LAN IPv4 Address
set WIFI_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set WIFI_IP=%%a
)
set WIFI_IP=%WIFI_IP: =%

echo [1/3] Checking Frontend Production Build...
if not exist "%~dp0frontend\.next" (
    echo Building Next.js production bundle...
    cd /d "%~dp0frontend" && call npm run build
)

echo [2/3] Launching FastAPI Production Backend on http://0.0.0.0:8000 ...
start "TutorCRM - Backend (Port 8000)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [3/3] Launching Next.js Production Frontend on http://0.0.0.0:3000 ...
start "TutorCRM - Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run start -- -p 3000 -H 0.0.0.0"

echo.
echo ========================================================
echo   TutorCRM is running in Native Production Mode!
echo.
echo   * On this PC (Local):  http://localhost:3000
echo   * On your Phone:       http://%WIFI_IP%:3000
echo ========================================================
echo.
pause
