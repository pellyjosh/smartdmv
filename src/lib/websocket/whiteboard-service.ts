import webSocketManager from './manager';
import { 
  WhiteboardUpdateMessage, 
  MessageHandler,
  WebSocketStatus 
} from './types';

export class WhiteboardWebSocketService {
  private unregisterHandler: (() => void) | null = null;

  public connect(): void {
    webSocketManager.enableService('whiteboard');
    webSocketManager.connect();
  }

  public onWhiteboardUpdate(handler: MessageHandler<WhiteboardUpdateMessage>): () => void {
    this.unregisterHandler = webSocketManager.registerHandler('whiteboard_update', handler);
    return this.unregisterHandler;
  }

  public sendWhiteboardUpdate(practiceId: number, data?: any): boolean {
    const message: WhiteboardUpdateMessage = {
      type: 'whiteboard_update',
      practiceId,
      data,
      timestamp: Date.now()
    };
    
    return webSocketManager.sendMessage(message);
  }

  public disconnect(): void {
    if (this.unregisterHandler) {
      this.unregisterHandler();
      this.unregisterHandler = null;
    }
    webSocketManager.disableService('whiteboard');
  }

  public getStatus(): WebSocketStatus {
    return webSocketManager.getStatus();
  }

  public onStatusChange(listener: (status: WebSocketStatus) => void): () => void {
    return webSocketManager.onStatusChange(listener);
  }
}

// Create singleton instance
export const whiteboardService = new WhiteboardWebSocketService();
