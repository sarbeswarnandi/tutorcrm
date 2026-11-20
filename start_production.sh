#!/bin/bash
# TutorCRM Native Production Startup Script (Zero-Docker)
set -e

echo "=== Starting TutorCRM Native Production Server (Non-Docker) ==="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Backend Setup & Start
cd "$ROOT_DIR/backend"
if [ ! -d "venv" ]; then
    echo "[1/4] Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "[2/4] Starting FastAPI Backend on port 8000..."
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > "$ROOT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend running (PID: $BACKEND_PID, logs: backend.log)"

# 2. Frontend Setup & Start
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "[3/4] Installing frontend dependencies..."
    npm ci
fi

echo "[4/4] Building and launching Next.js on port 3000..."
npm run build
nohup npm run start -- -p 3000 -H 0.0.0.0 > "$ROOT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend running (PID: $FRONTEND_PID, logs: frontend.log)"

echo ""
echo "========================================================"
echo "  TutorCRM is live in Production Mode!"
echo "  * Open: http://localhost:3000"
echo "  * Stop servers: kill $BACKEND_PID $FRONTEND_PID"
echo "========================================================"
