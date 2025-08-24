#!/usr/bin/env node

/**
 * WebSocket Server Entry Point
 * 
 * This is the main entry point for the WebSocket server that supports
 * telemedicine and whiteboard functionality.
 * 
 * Usage:
 *   npm run ws                    # Start in development mode
 *   NODE_ENV=production npm run ws # Start in production mode
 */

import { WebSocketServer } from './server';

// Handle graceful shutdown
let server: WebSocketServer | null = null;

async function startServer() {
  try {
    console.log('🚀 Starting WebSocket server...');
    
    server = new WebSocketServer();
    await server.start();
    
    console.log('✅ WebSocket server started successfully');
    
    // Setup graceful shutdown handlers
    setupGracefulShutdown();
    
  } catch (error) {
    console.error('❌ Failed to start WebSocket server:', error);
    process.exit(1);
  }
}

function setupGracefulShutdown() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n📡 Received ${signal}, initiating graceful shutdown...`);
      
      if (server) {
        try {
          await server.stop();
          console.log('🛑 Server stopped gracefully');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      } else {
        process.exit(0);
      }
    });
  });
}

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
  // For uncaught exceptions, we should exit
  process.exit(1);
});

// Start the server
startServer();
