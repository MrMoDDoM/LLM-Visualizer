#!/bin/bash

# LLM Alignment Tool - Start Script
# This script starts both backend and frontend servers

echo "⚖️  Starting LLM Alignment Tool..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is available
if ! command -v python3 &> /dev/null
then
    echo -e "${RED}❌ Python3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

# Check if Node is available
if ! command -v node &> /dev/null
then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 14+${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${GREEN}🚀 Starting Backend Server...${NC}"
cd backend

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    python3 -m venv venv
fi

# Activate venv and install dependencies
source venv/bin/activate
if [ ! -f "venv/installed" ]; then
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    pip install -q -r requirements.txt
    touch venv/installed
fi

# Start backend in background
python main.py &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend running on http://localhost:8000 (PID: $BACKEND_PID)${NC}"
echo ""

# Wait a bit for backend to start
sleep 2

# Start Frontend
echo -e "${GREEN}🎨 Starting Frontend Server...${NC}"
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node dependencies (this may take a few minutes)...${NC}"
    npm install
fi

# Start frontend in background
npm start &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend running on http://localhost:3000 (PID: $FRONTEND_PID)${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}🎉 LLM Alignment Tool is running!${NC}"
echo "=========================================="
echo ""
echo "📍 Backend API:  http://localhost:8000"
echo "📍 Web Interface: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait
