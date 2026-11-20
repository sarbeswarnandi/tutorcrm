@echo off
title TutorCRM Launcher
echo ========================================================
echo   Starting TutorCRM Backend (FastAPI) and Frontend (Next.js)
echo ========================================================

REM Automatically detect current Wi-Fi/LAN IPv4 Address
set WIFI_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set WIFI_IP=%%a
)
set WIFI_IP=%WIFI_IP: =%

echo [1/2] Launching FastAPI Backend on http://0.0.0.0:8000 ...
start "TutorCRM - Backend (Port 8000)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Launching Next.js Frontend on http://0.0.0.0:3000 ...
start "TutorCRM - Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   TutorCRM is running! Open in your browser:
echo.
echo   * On this PC (Local):  http://localhost:3000
echo   * On your Phone:       http://%WIFI_IP%:3000
echo ========================================================
echo.
pause
