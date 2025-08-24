# Unified WebSocket System

This document describes the unified WebSocket management system that handles multiple services (Whiteboard, Telemedicine, and future services) in a single, organized structure.

## Architecture Overview

The unified WebSocket system consists of:

1. **Client-side Components** (`/src/lib/websocket/`)

   - `manager.ts` - Central WebSocket connection manager
   - `types.ts` - TypeScript interfaces and types
   - `whiteboard-service.ts` - Whiteboard-specific functionality
   - `telemedicine-service.ts` - Telemedicine-specific functionality
   - `index.ts` - Main exports and legacy compatibility

2. **Server-side Components**
   - `unified-server.ts` - Single WebSocket server handling all services
   - `server.js` - Next.js custom server with WebSocket integration

## Client-side Usage

### Import Options

```typescript
// Modern approach - import specific services
import {
  whiteboardService,
  telemedicineService,
  WebSocketStatus,
} from "@/lib/websocket/";

// Import the manager directly
import { webSocketManager } from "@/lib/websocket/";

// Legacy compatibility (deprecated but still works)
import { connectWebSocket, registerMessageHandler } from "@/lib/websocket";
```

### Whiteboard Service

```typescript
import { whiteboardService } from "@/lib/websocket/";

// Connect to whiteboard service
whiteboardService.connect();

// Listen for whiteboard updates
const unsubscribe = whiteboardService.onWhiteboardUpdate((message) => {
  if (message.practiceId === myPracticeId) {
    // Handle whiteboard update
    refreshWhiteboardData();
  }
});

// Send whiteboard update
whiteboardService.sendWhiteboardUpdate(practiceId, { updated: true });

// Monitor connection status
const statusUnsubscribe = whiteboardService.onStatusChange((status) => {
  console.log("Whiteboard WebSocket status:", status);
});

// Cleanup
unsubscribe();
statusUnsubscribe();
whiteboardService.disconnect();
```

### Telemedicine Service

```typescript
import { telemedicineService } from "@/lib/websocket/";

// Connect to telemedicine service
telemedicineService.connect();

// Join a video call room
telemedicineService.joinRoom(roomId, appointmentId, userId, userName);

// Listen for WebRTC offers
const unsubscribeOffer = telemedicineService.onOffer((message) => {
  // Handle incoming video call offer
  handleIncomingOffer(message.offer, message.from);
});

// Send WebRTC answer
telemedicineService.sendAnswer(roomId, appointmentId, answer, userId);

// Send chat message
telemedicineService.sendChatMessage(
  roomId,
  appointmentId,
  "Hello!",
  userName,
  userId
);

// Listen for chat messages
const unsubscribeChat = telemedicineService.onChatMessage((message) => {
  displayChatMessage(message.message, message.from);
});

// Leave room and cleanup
telemedicineService.leaveRoom(roomId, appointmentId, userId);
telemedicineService.disconnect();
```

### Direct Manager Usage

```typescript
import { webSocketManager, WebSocketStatus } from "@/lib/websocket/";

// Connect
webSocketManager.connect();

// Register custom message handler
const unregister = webSocketManager.registerHandler(
  "custom_message",
  (message) => {
    console.log("Custom message received:", message);
  }
);

// Send custom message
webSocketManager.sendMessage({
  type: "custom_message",
  data: { test: true },
});

// Monitor status
const statusUnsubscribe = webSocketManager.onStatusChange((status) => {
  if (status === WebSocketStatus.CONNECTED) {
    console.log("WebSocket connected!");
  }
});

// Enable/disable services
webSocketManager.enableService("whiteboard");
webSocketManager.disableService("telemedicine");

// Get service info
const services = webSocketManager.getServices();
console.log("Available services:", services);
```

## Message Types

### Whiteboard Messages

- `whiteboard_update` - Notifies about whiteboard changes

### Telemedicine Messages

- `telemedicine_offer` - WebRTC video call offer
- `telemedicine_answer` - WebRTC video call answer
- `telemedicine_ice_candidate` - WebRTC ICE candidate
- `telemedicine_user_joined` - User joined video call
- `telemedicine_user_left` - User left video call
- `telemedicine_chat_message` - Chat message in video call

## Server-side Implementation

The server automatically handles:

1. **Connection Management** - Tracks all connected clients
2. **Room Management** - Manages telemedicine video call rooms
3. **Message Routing** - Routes messages based on type and service
4. **Practice Isolation** - Ensures messages only go to correct practice members
5. **Cleanup** - Automatically cleans up disconnected clients and empty rooms

### Message Flow

1. Client connects to `/ws` endpoint
2. Server assigns unique client ID and tracks connection
3. Client sends messages with specific types (e.g., `telemedicine_offer`)
4. Server routes message to appropriate handler based on type prefix
5. Server broadcasts to relevant clients (same room, practice, etc.)
6. Server handles cleanup when clients disconnect

## WebSocket Status

The system provides real-time status monitoring:

```typescript
enum WebSocketStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}
```

## Admin Dashboard

Access the WebSocket admin dashboard at `/admin/websocket-admin` to:

- Monitor connection status
- View active services and message handlers
- Test message sending
- View service configurations

## Migration from Legacy System

If you're using the old `websocket.ts` file:

### Before (Legacy)

```typescript
import { connectWebSocket, registerMessageHandler } from "@/lib/websocket";

connectWebSocket();
const unregister = registerMessageHandler("whiteboard_update", handler);
```

### After (Modern)

```typescript
import { whiteboardService } from "@/lib/websocket/";

whiteboardService.connect();
const unregister = whiteboardService.onWhiteboardUpdate(handler);
```

## Adding New Services

To add a new service (e.g., notifications):

1. **Add service configuration** in `manager.ts`:

```typescript
notifications: {
  name: 'Notifications',
  messageTypes: ['notification_sent', 'notification_read'],
  enabled: true
}
```

2. **Create service file** `notification-service.ts`:

```typescript
export class NotificationWebSocketService {
  // Service-specific methods
}
```

3. **Add to exports** in `index.ts`
4. **Update server handler** in `unified-server.ts`

## Best Practices

1. **Always cleanup subscriptions** when components unmount
2. **Use service-specific imports** instead of generic manager when possible
3. **Handle connection status** in your UI to show offline states
4. **Include practice/room context** in messages for proper routing
5. **Test WebSocket functionality** using the admin dashboard

## Troubleshooting

### Connection Issues

- Check if server is running on correct port (default: 9002)
- Verify WebSocket endpoint `/ws` is accessible
- Check browser console for connection errors

### Message Not Receiving

- Verify handler is registered before messages are sent
- Check message type matches exactly
- Ensure client is in correct room/practice context

### Performance Issues

- Monitor number of active connections in admin dashboard
- Consider message throttling for high-frequency updates
- Use appropriate cleanup to prevent memory leaks
