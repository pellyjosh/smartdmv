import { WebSocketMessage, MessageHandler, WebSocketStatus, WebSocketServiceConfig } from './types';

// WebSocket readyState constants for cross-platform compatibility
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private readonly RECONNECT_DELAY = 3000; // 3 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectAttempts = 0;
  
  private messageHandlers: Record<string, MessageHandler[]> = {};
  private statusListeners: ((status: WebSocketStatus) => void)[] = [];
  private currentStatus: WebSocketStatus = WebSocketStatus.DISCONNECTED;
  
  // Service configurations
  private services: Record<string, WebSocketServiceConfig> = {
    whiteboard: {
      name: 'Whiteboard',
      messageTypes: ['whiteboard_update'],
      enabled: true
    },
    telemedicine: {
      name: 'Telemedicine',
      messageTypes: [
        'telemedicine_offer',
        'telemedicine_answer', 
        'telemedicine_ice_candidate',
        'telemedicine_user_joined',
        'telemedicine_user_left',
        'telemedicine_chat_message'
      ],
      enabled: true
    }
  };

  private setStatus(status: WebSocketStatus) {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.statusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('Error in status listener:', error);
        }
      });
    }
  }

  public getStatus(): WebSocketStatus {
    return this.currentStatus;
  }

  public onStatusChange(listener: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  public connect(): WebSocket | null {
    try {
      // Don't try to reconnect if we already have a valid connection
      if (this.socket) {
        const readyState = this.socket.readyState;
        if (readyState === WS_CONNECTING || readyState === WS_OPEN) {
          return this.socket;
        }
      }

      // Stop if we've exceeded max attempts
      if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.log('WebSocketManager: Max reconnection attempts reached, stopping');
        this.setStatus(WebSocketStatus.ERROR);
        return null;
      }

      this.setStatus(WebSocketStatus.CONNECTING);
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      // Handle both local development and hosted environments
      let wsUrl;
      if (window.location.hostname.includes('replit') || window.location.hostname.includes('repl.co')) {
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        // For local development, use dedicated WebSocket port
        wsUrl = `${protocol}//${window.location.hostname}:9003/ws`;
      }
      
      console.log('WebSocketManager: Attempting to connect to:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);
      
      // Set a connection timeout to prevent hanging
      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState === WS_CONNECTING) {
          console.log('WebSocketManager: Connection timeout, closing socket');
          this.socket.close();
          this.setStatus(WebSocketStatus.ERROR);
        }
      }, 5000); // 5 second timeout
      
      this.socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocketManager: Connection established');
        this.setStatus(WebSocketStatus.CONNECTED);
        this.reconnectAttempts = 0;
        
        // Clear reconnect interval if we successfully connected
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('WebSocketManager: Error parsing message:', error);
        }
      };
      
      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocketManager: Connection closed:', event.code, event.reason);
        this.setStatus(WebSocketStatus.DISCONNECTED);
        
        // Only attempt to reconnect for unexpected closes and if we haven't hit the limit
        if (!this.reconnectInterval && 
            event.code !== 1000 && // Not a normal close
            this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.setStatus(WebSocketStatus.RECONNECTING);
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
          console.log('WebSocketManager: Max reconnection attempts reached, giving up');
          this.setStatus(WebSocketStatus.ERROR);
        }
      };
      
      this.socket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.warn('WebSocketManager: Connection failed:', error);
        this.setStatus(WebSocketStatus.ERROR);
        
        // If this is the first attempt, it means the server is likely not running
        if (this.reconnectAttempts === 0) {
          console.log('WebSocketManager: WebSocket server appears to be unavailable');
        }
      };
      
      return this.socket;
    } catch (error) {
      console.error('WebSocketManager: Error establishing connection:', error);
      this.setStatus(WebSocketStatus.ERROR);
      return null;
    }
  }

  private scheduleReconnect() {
    // Don't schedule if we already have one running or hit max attempts
    if (this.reconnectInterval || this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    console.log(`WebSocketManager: Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS} in ${this.RECONNECT_DELAY}ms`);
    
    this.reconnectInterval = setTimeout(() => {
      // Clear the interval first
      this.reconnectInterval = null;
      
      // Check if we should still attempt reconnection
      if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.log('WebSocketManager: Max attempts reached during scheduled reconnect');
        this.setStatus(WebSocketStatus.ERROR);
        return;
      }
      
      this.reconnectAttempts++;
      console.log(`WebSocketManager: Reconnection attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
      
      try {
        this.connect();
      } catch (error) {
        console.error('WebSocketManager: Error during scheduled reconnection:', error);
        this.setStatus(WebSocketStatus.ERROR);
      }
    }, this.RECONNECT_DELAY);
  }

  private handleMessage(message: WebSocketMessage) {
    const { type } = message;
    
    // Log message for debugging (remove in production)
    console.log(`WebSocketManager: Received ${type} message:`, message);
    
    // Check if this message type is handled by any enabled service
    const service = Object.values(this.services).find(s => 
      s.enabled && s.messageTypes.includes(type)
    );
    
    if (!service) {
      console.warn(`WebSocketManager: No enabled service found for message type: ${type}`);
      return;
    }
    
    // Execute all handlers for this message type
    if (this.messageHandlers[type]) {
      this.messageHandlers[type].forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`WebSocketManager: Error in ${type} handler:`, error);
        }
      });
    }
  }

  public sendMessage(message: WebSocketMessage): boolean {
    try {
      if (!this.socket || this.socket.readyState !== WS_OPEN) {
        console.log('WebSocketManager: Socket not open, attempting to reconnect');
        this.connect();
        
        // Queue message to be sent when connection is established
        setTimeout(() => {
          this.sendMessage(message);
        }, 1000);
        return false;
      }
      
      // Add timestamp if not present
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }
      
      this.socket.send(JSON.stringify(message));
      console.log(`WebSocketManager: Sent ${message.type} message`);
      return true;
    } catch (error) {
      console.error('WebSocketManager: Error sending message:', error);
      return false;
    }
  }

  public registerHandler<T extends WebSocketMessage>(
    type: string, 
    handler: MessageHandler<T>
  ): () => void {
    try {
      if (!this.messageHandlers[type]) {
        this.messageHandlers[type] = [];
      }
      
      this.messageHandlers[type].push(handler as MessageHandler);
      console.log(`WebSocketManager: Registered handler for ${type}`);
      
      // Return unregister function
      return () => {
        try {
          if (this.messageHandlers[type]) {
            this.messageHandlers[type] = this.messageHandlers[type].filter(h => h !== handler);
            if (this.messageHandlers[type].length === 0) {
              delete this.messageHandlers[type];
            }
            console.log(`WebSocketManager: Unregistered handler for ${type}`);
          }
        } catch (error) {
          console.error('WebSocketManager: Error unregistering handler:', error);
        }
      };
    } catch (error) {
      console.error('WebSocketManager: Error registering handler:', error);
      return () => {};
    }
  }

  public enableService(serviceName: string): boolean {
    if (this.services[serviceName]) {
      this.services[serviceName].enabled = true;
      console.log(`WebSocketManager: Enabled ${serviceName} service`);
      return true;
    }
    console.warn(`WebSocketManager: Service ${serviceName} not found`);
    return false;
  }

  public disableService(serviceName: string): boolean {
    if (this.services[serviceName]) {
      this.services[serviceName].enabled = false;
      console.log(`WebSocketManager: Disabled ${serviceName} service`);
      return true;
    }
    console.warn(`WebSocketManager: Service ${serviceName} not found`);
    return false;
  }

  public getServices(): Record<string, WebSocketServiceConfig> {
    return { ...this.services };
  }

  public disconnect(): void {
    try {
      // Clear any pending reconnection attempts
      if (this.reconnectInterval) {
        clearTimeout(this.reconnectInterval);
        this.reconnectInterval = null;
      }
      
      // Close the socket cleanly
      if (this.socket) {
        if (this.socket.readyState === WS_OPEN || this.socket.readyState === WS_CONNECTING) {
          this.socket.close(1000, 'User disconnected');
        }
        this.socket = null;
      }
      
      // Reset state
      this.setStatus(WebSocketStatus.DISCONNECTED);
      this.reconnectAttempts = 0;
      console.log('WebSocketManager: Disconnected cleanly');
    } catch (error) {
      console.error('WebSocketManager: Error during disconnect:', error);
      // Ensure we're in disconnected state even if there was an error
      this.setStatus(WebSocketStatus.DISCONNECTED);
      this.reconnectAttempts = 0;
    }
  }

  public getActiveHandlers(): string[] {
    return Object.keys(this.messageHandlers);
  }
}

// Create singleton instance
const webSocketManager = new WebSocketManager();

export default webSocketManager;
