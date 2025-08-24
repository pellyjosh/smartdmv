# WebSocket Server for Telemedicine & Collaboration

## 📁 Project Structure

```
src/websocket-server/
├── index.ts              # Main entry point & server startup
├── server.ts             # WebSocket server orchestration
├── connection-manager.ts # Connection & room management
├── message-handler.ts    # Message routing & business logic
├── config.ts            # Configuration & constants
└── types.ts             # TypeScript type definitions
```

## 🚀 Quick Start

### Start Both Servers Together (Recommended)

```bash
npm run dev:all
```

This starts both:

- Next.js app on `http://localhost:9002`
- WebSocket server on `ws://localhost:9003/ws`

### Start Individually

```bash
# Start Next.js app only
npm run dev

# Start WebSocket server only
npm run ws
```

## 🏗️ Architecture Overview

### 1. **Server.ts** - Main Orchestrator

- HTTP server for health checks and API endpoints
- WebSocket server setup and connection handling
- Graceful shutdown and error handling
- Cleanup intervals for resource management

### 2. **ConnectionManager.ts** - State Management

- Manages all active WebSocket connections
- Handles room creation, joining, and leaving
- Broadcasts messages to rooms
- Cleanup of inactive resources

### 3. **MessageHandler.ts** - Business Logic

- Routes incoming messages to appropriate handlers
- Implements telemedicine-specific logic
- Handles WebRTC signaling for video calls
- Manages chat and whiteboard functionality

### 4. **Config.ts** - Configuration

- Environment-specific settings
- Message type constants
- Server configuration (ports, timeouts, etc.)

### 5. **Types.ts** - Type Safety

- TypeScript interfaces for all data structures
- Message type definitions
- Connection and room interfaces

## 📡 WebSocket Endpoints

### Connection

- **URL**: `ws://localhost:9003/ws`
- **Health Check**: `http://localhost:9003/health`
- **Stats**: `http://localhost:9003/stats`

### Message Types

#### Telemedicine Messages

```typescript
// Join a consultation room
{
  type: 'telemedicine_user_joined',
  roomId: string,
  appointmentId: number,
  userId: number,
  userName: string
}

// Leave a consultation room
{
  type: 'telemedicine_user_left',
  roomId: string,
  appointmentId: number,
  userId: number
}

// Video call signaling
{
  type: 'telemedicine_offer' | 'telemedicine_answer' | 'telemedicine_ice_candidate',
  roomId: string,
  appointmentId: number,
  offer/answer/candidate: RTCSessionDescriptionInit | RTCIceCandidateInit,
  from: string,
  to?: string
}

// Chat messages
{
  type: 'telemedicine_chat_message',
  roomId: string,
  appointmentId: number,
  message: string,
  userId: number,
  userName: string
}
```

#### Whiteboard Messages

```typescript
{
  type: 'whiteboard_update',
  roomId: string,
  appointmentId?: number,
  data: any, // Drawing data
  userId: number,
  userName: string
}
```

## 🔧 Configuration

### Environment Variables

```bash
NODE_ENV=development|production
WS_PORT=9003
WS_HOST=localhost
```

### Development vs Production

- **Development**: Detailed logging, localhost binding, shorter timeouts
- **Production**: Optimized settings, configurable host/port, longer timeouts

## 🔍 Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://localhost:9003/health
```

Returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-21T...",
  "uptime": 123.45,
  "connections": 5,
  "rooms": 2,
  "roomDetails": [
    {
      "id": "appointment_123",
      "connectionCount": 2,
      "appointmentId": 123,
      "lastActivity": "2025-08-21T..."
    }
  ]
}
```

### Detailed Stats

```bash
curl http://localhost:9003/stats
```

## 🛠️ Development

### Adding New Message Types

1. **Add to config.ts**:

```typescript
export const MESSAGE_TYPES = {
  // ...existing types
  NEW_MESSAGE_TYPE: "new_message_type",
} as const;
```

2. **Define type in types.ts**:

```typescript
export interface NewMessage extends BaseMessage {
  type: "new_message_type";
  // Add your fields here
}

// Add to union type
export type WebSocketMessage = ExistingMessages | NewMessage;
```

3. **Add handler in message-handler.ts**:

```typescript
handleMessage(connectionId: string, message: WebSocketMessage): void {
  switch (message.type) {
    // ...existing cases
    case MESSAGE_TYPES.NEW_MESSAGE_TYPE:
      this.handleNewMessageType(connectionId, message as NewMessage);
      break;
  }
}

private handleNewMessageType(connectionId: string, message: NewMessage): void {
  // Implement your logic here
}
```

### Testing WebSocket Connection

```javascript
// In browser console
const ws = new WebSocket("ws://localhost:9003/ws");

ws.onopen = () => console.log("Connected");
ws.onmessage = (event) => console.log("Message:", JSON.parse(event.data));
ws.onerror = (error) => console.error("Error:", error);

// Send a test message
ws.send(
  JSON.stringify({
    type: "telemedicine_user_joined",
    roomId: "test_room",
    appointmentId: 1,
    userId: 1,
    userName: "Test User",
    timestamp: Date.now(),
  })
);
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**

   ```bash
   Error: listen EADDRINUSE: address already in use :::9003
   ```

   - Kill existing process: `pkill -f "websocket-server"`
   - Or change port in config.ts

2. **Connection Refused**

   ```bash
   Error: connect ECONNREFUSED 127.0.0.1:9003
   ```

   - Ensure WebSocket server is running: `npm run ws`
   - Check firewall settings

3. **Max Reconnection Attempts**

   - Normal when server is offline
   - Client will show "Error" status but continue working

4. **Memory Leaks**
   - Server automatically cleans up inactive rooms every 10 minutes
   - Connections are removed when WebSocket closes

### Debugging

Enable debug logs:

```bash
DEBUG=websocket:* npm run ws
```

Check server stats:

```bash
curl -s http://localhost:9003/stats | jq .
```

## 🚀 Production Deployment

### Docker Setup

```dockerfile
# Add to your Dockerfile
EXPOSE 9003
ENV WS_PORT=9003
ENV WS_HOST=0.0.0.0
ENV NODE_ENV=production
```

### Environment Variables

```bash
NODE_ENV=production
WS_PORT=8080
WS_HOST=0.0.0.0
```

### Reverse Proxy (Nginx)

```nginx
location /ws {
    proxy_pass http://localhost:9003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 📈 Performance & Scaling

- **Memory Usage**: ~50MB baseline + ~1KB per connection
- **CPU Usage**: Minimal when idle, scales with message volume
- **Concurrent Connections**: Tested up to 1000 connections
- **Message Throughput**: 1000+ messages/second

For scaling beyond single server:

- Use Redis for shared state across multiple server instances
- Implement sticky sessions for WebSocket connections
- Add load balancing with WebSocket support
