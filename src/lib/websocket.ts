let socket: WebSocket | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
const RECONNECT_DELAY = 3000; // 3 seconds

type MessageHandler = (data: any) => void;
const messageHandlers: Record<string, MessageHandler[]> = {};

// WebSocket readyState constants for cross-platform compatibility
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

export function connectWebSocket() {
  try {
    // Don't try to reconnect if we already have a valid connection
    if (socket) {
      const readyState = socket.readyState;
      // Check using numerical values directly for better compatibility
      if (readyState === 0 || readyState === 1) { // CONNECTING or OPEN
        return socket;
      }
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    // Handle both local development and Replit hosted environments
    let wsUrl;
    if (window.location.hostname.includes('replit') || window.location.hostname.includes('repl.co')) {
      // For Replit environment, use the same host without specifying port
      wsUrl = `${protocol}//${window.location.host}/ws`;
    } else {
      // For local development or other environments
      wsUrl = `${protocol}//${window.location.hostname}:${window.location.port || 5000}/ws`;
    }
    
    console.log('Attempting to connect to WebSocket at:', wsUrl);
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      // Clear reconnect interval if we successfully connected
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Check if we have handlers registered for this message type
        if (data && data.type && messageHandlers[data.type]) {
          messageHandlers[data.type].forEach(handler => handler(data));
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      
      // Attempt to reconnect unless it was a clean/intentional close
      if (!reconnectInterval && event.code !== 1000) {
        reconnectInterval = setInterval(() => {
          console.log('Attempting to reconnect WebSocket...');
          try {
            connectWebSocket();
          } catch (e) {
            console.error('Error reconnecting to WebSocket:', e);
          }
        }, RECONNECT_DELAY);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return socket;
  } catch (error) {
    console.error('Error establishing WebSocket connection:', error);
    return null;
  }
}

export function sendMessage(data: any) {
  try {
    if (!socket || socket.readyState !== WS_OPEN) {
      console.log('WebSocket not open, reconnecting before sending message');
      connectWebSocket();
      
      // Queue message to be sent when connection is established
      setTimeout(() => {
        try {
          sendMessage(data);
        } catch (e) {
          console.error('Error sending queued message:', e);
        }
      }, 500);
      return;
    }
    
    socket.send(JSON.stringify(data));
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
  }
}

export function registerMessageHandler(type: string, handler: MessageHandler) {
  try {
    if (!messageHandlers[type]) {
      messageHandlers[type] = [];
    }
    
    messageHandlers[type].push(handler);
    
    // Return a function to unregister the handler
    return () => {
      try {
        if (messageHandlers[type]) {
          messageHandlers[type] = messageHandlers[type].filter(h => h !== handler);
          if (messageHandlers[type].length === 0) {
            delete messageHandlers[type];
          }
        }
      } catch (e) {
        console.error('Error unregistering message handler:', e);
      }
    };
  } catch (error) {
    console.error('Error registering message handler:', error);
    return () => {}; // Return a no-op function if registration fails
  }
}

export function closeWebSocket() {
  try {
    if (socket) {
      socket.close(1000, 'User navigated away');
      socket = null;
    }
    
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  } catch (error) {
    console.error('Error closing WebSocket:', error);
  }
}
