import WebSocket, { WebSocketServer as WSServer } from 'ws';
import http from 'http';
import { ConnectionManager } from './connection-manager';
import { MessageHandler } from './message-handler';
import { AppointmentAutomation } from './appointment-automation';
import { getConfig, MESSAGE_TYPES } from './config';
import type { WebSocketMessage } from './types';

/**
 * Main WebSocket Server class
 * Orchestrates the entire WebSocket server functionality
 */
export class WebSocketServer {
  private server: http.Server;
  private wss: WSServer;
  private connectionManager: ConnectionManager;
  private messageHandler: MessageHandler;
  private appointmentAutomation: AppointmentAutomation;
  private config = getConfig();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private automationInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Create HTTP server for health checks and WebSocket upgrade
    this.server = http.createServer();
    
    // Create WebSocket server
    this.wss = new WSServer({ 
      server: this.server,
      path: this.config.path
    });

    // Initialize managers
    this.connectionManager = new ConnectionManager();
    this.messageHandler = new MessageHandler(this.connectionManager);
    this.appointmentAutomation = new AppointmentAutomation();

    this.setupHttpRoutes();
    this.setupWebSocketHandlers();
    this.setupCleanupInterval();
    this.setupAppointmentAutomation();
  }

  /**
   * Start the WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.config.port, () => {
          console.log(`🎯 WebSocket server running on ${this.config.host}:${this.config.port}`);
          console.log(`📍 WebSocket endpoint: ws://${this.config.host}:${this.config.port}${this.config.path}`);
          console.log(`🏥 Health check: http://${this.config.host}:${this.config.port}${this.config.healthPath}`);
          resolve();
        });

        this.server.on('error', (error) => {
          console.error('❌ Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🛑 Shutting down WebSocket server...');

      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Clear automation interval
      if (this.automationInterval) {
        clearInterval(this.automationInterval);
      }

      // Close all WebSocket connections
      this.wss.clients.forEach((ws: WebSocket) => {
        ws.close(1000, 'Server shutting down');
      });

      // Close WebSocket server
      this.wss.close(() => {
        // Close HTTP server
        this.server.close(() => {
          console.log('✅ WebSocket server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Setup HTTP routes for health checks and API endpoints
   */
  private setupHttpRoutes(): void {
    this.server.on('request', (req, res) => {
      const url = req.url || '';

      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (url === this.config.healthPath) {
        this.handleHealthCheck(req, res);
      } else if (url === '/stats') {
        this.handleStatsRequest(req, res);
      } else if (url === '/automation/trigger' && req.method === 'POST') {
        this.handleAutomationTrigger(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });
  }

  /**
   * Setup WebSocket connection handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const connectionId = this.generateConnectionId();
      
      console.log(`🔌 New WebSocket connection: ${connectionId}`);

      // Add connection to manager
      this.connectionManager.addConnection(connectionId, ws as any);

      // Send welcome message
      ws.send(JSON.stringify({
        type: MESSAGE_TYPES.CONNECTED,
        connectionId,
        timestamp: Date.now()
      }));

      // Handle incoming messages
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.messageHandler.handleMessage(connectionId, message);
        } catch (error) {
          console.error(`❌ Error parsing message from ${connectionId}:`, error);
          ws.send(JSON.stringify({
            type: MESSAGE_TYPES.ERROR,
            message: 'Invalid message format',
            timestamp: Date.now()
          }));
        }
      });

      // Handle connection close
      ws.on('close', (code: number, reason: Buffer) => {
        console.log(`🔌 Connection closed: ${connectionId} (Code: ${code}, Reason: ${reason.toString()})`);
        this.connectionManager.removeConnection(connectionId);
      });

      // Handle connection errors
      ws.on('error', (error: Error) => {
        console.error(`🔥 WebSocket error for ${connectionId}:`, error);
        this.connectionManager.removeConnection(connectionId);
      });
    });

    this.wss.on('error', (error: Error) => {
      console.error('🔥 WebSocket Server error:', error);
    });
  }

  /**
   * Setup periodic cleanup of inactive resources
   */
  private setupCleanupInterval(): void {
    // Clean up inactive rooms every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.connectionManager.cleanupInactiveRooms(60); // Remove rooms inactive for 1 hour
    }, 10 * 60 * 1000);
  }

  /**
   * Setup appointment automation to check for overdue appointments
   */
  private setupAppointmentAutomation(): void {
    // Check for overdue appointments every 5 minutes
    this.automationInterval = setInterval(async () => {
      try {
        await this.appointmentAutomation.processOverdueAppointments();
      } catch (error) {
        console.error('❌ Error in appointment automation:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Run once immediately after startup (with a delay)
    setTimeout(async () => {
      try {
        console.log('🚀 Running initial appointment automation check...');
        await this.appointmentAutomation.processOverdueAppointments();
      } catch (error) {
        console.error('❌ Error in initial appointment automation:', error);
      }
    }, 30000); // 30 seconds after startup
  }

  /**
   * Handle health check requests
   */
  private handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
    const stats = this.connectionManager.getStats();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...stats
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthData, null, 2));
  }

  /**
   * Handle stats requests (detailed information)
   */
  private handleStatsRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const stats = this.connectionManager.getStats();
    
    const detailedStats = {
      ...stats,
      server: {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        config: this.config
      },
      appointmentAutomation: this.appointmentAutomation.getStats(),
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(detailedStats, null, 2));
  }

  /**
   * Handle manual automation trigger requests
   */
  private async handleAutomationTrigger(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      console.log('🔄 Manual appointment automation trigger requested...');
      await this.appointmentAutomation.runManually();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Appointment automation triggered successfully',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Error in manual automation trigger:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to trigger appointment automation',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server statistics (for monitoring)
   */
  getStats() {
    return this.connectionManager.getStats();
  }
}
