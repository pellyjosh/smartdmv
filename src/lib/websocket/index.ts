// Main WebSocket exports for easy importing
export { default as webSocketManager } from './manager';
export { whiteboardService } from './whiteboard-service';
export { telemedicineService } from './telemedicine-service';

// Re-export types
export * from './types';

// Legacy compatibility exports (to maintain backward compatibility)
import webSocketManager from './manager';
import { whiteboardService } from './whiteboard-service';

export function connectWebSocket() {
  return webSocketManager.connect();
}

export function sendMessage(data: any) {
  return webSocketManager.sendMessage(data);
}

export function registerMessageHandler(type: string, handler: (data: any) => void) {
  return webSocketManager.registerHandler(type, handler);
}

export function closeWebSocket() {
  return webSocketManager.disconnect();
}

// Whiteboard-specific legacy functions
export function connectWhiteboardWebSocket() {
  whiteboardService.connect();
  return webSocketManager.connect();
}

export function registerWhiteboardHandler(handler: (data: any) => void) {
  return whiteboardService.onWhiteboardUpdate(handler);
}

export function sendWhiteboardUpdate(practiceId: number, data?: any) {
  return whiteboardService.sendWhiteboardUpdate(practiceId, data);
}
