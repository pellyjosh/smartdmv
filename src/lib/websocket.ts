// DEPRECATED: This file is maintained for backward compatibility only
// Please use the new unified WebSocket system at /src/lib/websocket/
// 
// Migration guide:
// - Replace `import { connectWebSocket } from '@/lib/websocket'` 
//   with `import { webSocketManager } from '@/lib/websocket'`
// - Use service-specific imports: `import { whiteboardService, telemedicineService } from '@/lib/websocket'`

import webSocketManager from './websocket/manager';
import { whiteboardService } from './websocket/whiteboard-service';
import { telemedicineService } from './websocket/telemedicine-service';

// Export the services directly for new imports
export { whiteboardService } from './websocket/whiteboard-service';
export { telemedicineService } from './websocket/telemedicine-service';
export { default as webSocketManager } from './websocket/manager';

// Re-export types
export * from './websocket/types';

// Re-export for backward compatibility with proper types
export function connectWebSocket(): WebSocket | null {
  console.warn('DEPRECATED: Using legacy connectWebSocket. Please migrate to webSocketManager.connect()');
  return webSocketManager.connect();
}

export function sendMessage(data: any): boolean {
  console.warn('DEPRECATED: Using legacy sendMessage. Please migrate to webSocketManager.sendMessage()');
  return webSocketManager.sendMessage(data);
}

export function registerMessageHandler(type: string, handler: (data: any) => void): () => void {
  console.warn('DEPRECATED: Using legacy registerMessageHandler. Please migrate to webSocketManager.registerHandler()');
  return webSocketManager.registerHandler(type, handler);
}

export function closeWebSocket(): void {
  console.warn('DEPRECATED: Using legacy closeWebSocket. Please migrate to webSocketManager.disconnect()');
  webSocketManager.disconnect();
}

// Whiteboard-specific legacy functions
export function connectWhiteboardWebSocket(): WebSocket | null {
  console.warn('DEPRECATED: Using legacy connectWhiteboardWebSocket. Please migrate to whiteboardService.connect()');
  whiteboardService.connect();
  return webSocketManager.connect();
}

export function registerWhiteboardHandler(handler: (data: any) => void): () => void {
  console.warn('DEPRECATED: Using legacy registerWhiteboardHandler. Please migrate to whiteboardService.onWhiteboardUpdate()');
  return whiteboardService.onWhiteboardUpdate(handler);
}

export function sendWhiteboardUpdate(practiceId: number, data?: any): boolean {
  console.warn('DEPRECATED: Using legacy sendWhiteboardUpdate. Please migrate to whiteboardService.sendWhiteboardUpdate()');
  return whiteboardService.sendWhiteboardUpdate(practiceId, data);
}
