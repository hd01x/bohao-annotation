#!/bin/bash
# PremGuard Annotation Tool - Start Script
# Starts backend (FastAPI) and frontend (Vite) concurrently

cd "$(dirname "$0")"

echo "Starting PremGuard Annotation Tool..."
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""

# Start backend
cd "$(dirname "$0")"
python -m uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
