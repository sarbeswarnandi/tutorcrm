@echo off
echo Starting TutorCRM Backend...
cd /d "%~dp0backend"
echo Backend starting on http://0.0.0.0:8000
echo Press Ctrl+C to stop.
venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
