// WebSocket Server Configuration
export const WS_CONFIG = {
  // Development configuration
  development: {
    port: 9003,
    host: 'localhost',
    path: '/ws',
    healthPath: '/health',
    reconnectDelay: 3000,
    maxReconnectAttempts: 5,
    connectionTimeout: 5000
  },
  
  // Production configuration
  production: {
    port: process.env.WS_PORT || 8080,
    host: process.env.WS_HOST || '0.0.0.0',
    path: '/ws',
    healthPath: '/health',
    reconnectDelay: 5000,
    maxReconnectAttempts: 10,
    connectionTimeout: 10000
  }
};

// Get configuration for current environment
export function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  return WS_CONFIG[env as keyof typeof WS_CONFIG] || WS_CONFIG.development;
}

// WebSocket message types
export const MESSAGE_TYPES = {
  // Connection management
  CONNECTED: 'connected',
  ERROR: 'error',
  
  // Telemedicine messages
  TELEMEDICINE_USER_JOINED: 'telemedicine_user_joined',
  TELEMEDICINE_USER_LEFT: 'telemedicine_user_left',
  TELEMEDICINE_OFFER: 'telemedicine_offer',
  TELEMEDICINE_ANSWER: 'telemedicine_answer',
  TELEMEDICINE_ICE_CANDIDATE: 'telemedicine_ice_candidate',
  TELEMEDICINE_CHAT_MESSAGE: 'telemedicine_chat_message',
  
  // Whiteboard messages
  WHITEBOARD_UPDATE: 'whiteboard_update',
  
  // System messages
  HEALTH_CHECK: 'health_check',
  ROOM_INFO: 'room_info'
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];
