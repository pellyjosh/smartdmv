#!/bin/bash

# Smart DMV Development Server Startup Script
# This script starts both the Next.js application and WebSocket server

echo "🚀 Starting Smart DMV Development Environment..."
echo ""

# Check if required dependencies are installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if concurrently is installed
if ! npm list concurrently &> /dev/null; then
    echo "📦 Installing concurrently for multi-process management..."
    npm install --save-dev concurrently
    echo ""
fi

echo "🎯 Starting services:"
echo "  - Next.js App: http://localhost:9002"  
echo "  - WebSocket Server: ws://localhost:9003/ws"
echo "  - Health Check: http://localhost:9003/health"
echo ""
echo "📝 Press Ctrl+C to stop all services"
echo ""

# Start both services
npm run dev:all
