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

// Load environment variables based on NODE_ENV
import dotenv from 'dotenv';
import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  // Try .env.local first
  '.env.local',
  // Fall back to .env
  '.env',
  // Then .env.production for production
  ...(nodeEnv === 'production' ? ['.env.production'] : [])
];

let loadedEnvFile = null;
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  try {
    const result = dotenv.config({ path: envPath });
    if (result.parsed && result.parsed.OWNER_DATABASE_URL) {
      loadedEnvFile = envFile;
      console.log(`[WS] ✅ Successfully loaded environment from: ${envFile}`);
      break;
    }
  } catch (error) {
    console.log(`[WS] ❌ Failed to load ${envFile}:`, error);
  }
}

if (!loadedEnvFile) {
  console.error(`[WS] ❌ No valid environment file found. Tried: ${envFiles.join(', ')}`);
}

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
