import webSocketManager from './manager';
import {
  TelemedicineOfferMessage,
  TelemedicineAnswerMessage, 
  TelemedicineIceCandidateMessage,
  TelemedicineUserJoinedMessage,
  TelemedicineUserLeftMessage,
  TelemedicineChatMessage,
  MessageHandler,
  WebSocketStatus
} from './types';

export class TelemedicineWebSocketService {
  private unregisterHandlers: (() => void)[] = [];

  public connect(): void {
    webSocketManager.enableService('telemedicine');
    webSocketManager.connect();
  }

  public joinRoom(roomId: string, appointmentId: number, userId: number, userName: string): void {
    const message: TelemedicineUserJoinedMessage = {
      type: 'telemedicine_user_joined',
      roomId,
      appointmentId,
      userId,
      userName,
      timestamp: Date.now()
    };
    
    webSocketManager.sendMessage(message);
  }

  public leaveRoom(roomId: string, appointmentId: number, userId: number): void {
    const message: TelemedicineUserLeftMessage = {
      type: 'telemedicine_user_left',
      roomId,
      appointmentId,
      userId,
      timestamp: Date.now()
    };
    
    webSocketManager.sendMessage(message);
  }

  public sendOffer(
    roomId: string, 
    appointmentId: number, 
    offer: RTCSessionDescriptionInit, 
    from: string
  ): boolean {
    const message: TelemedicineOfferMessage = {
      type: 'telemedicine_offer',
      roomId,
      appointmentId,
      offer,
      from,
      timestamp: Date.now()
    };
    
    return webSocketManager.sendMessage(message);
  }

  public sendAnswer(
    roomId: string,
    appointmentId: number,
    answer: RTCSessionDescriptionInit,
    from: string
  ): boolean {
    const message: TelemedicineAnswerMessage = {
      type: 'telemedicine_answer',
      roomId,
      appointmentId,
      answer,
      from,
      timestamp: Date.now()
    };
    
    return webSocketManager.sendMessage(message);
  }

  public sendIceCandidate(
    roomId: string,
    appointmentId: number,
    candidate: RTCIceCandidateInit,
    from: string
  ): boolean {
    const message: TelemedicineIceCandidateMessage = {
      type: 'telemedicine_ice_candidate',
      roomId,
      appointmentId,
      candidate,
      from,
      timestamp: Date.now()
    };
    
    return webSocketManager.sendMessage(message);
  }

  public sendChatMessage(
    roomId: string,
    appointmentId: number,
    message: string,
    from: string,
    fromUserId: number
  ): boolean {
    const chatMessage: TelemedicineChatMessage = {
      type: 'telemedicine_chat_message',
      roomId,
      appointmentId,
      message,
      from,
      fromUserId,
      timestamp: Date.now()
    };
    
    return webSocketManager.sendMessage(chatMessage);
  }

  // Event handlers
  public onOffer(handler: MessageHandler<TelemedicineOfferMessage>): () => void {
    const unregister = webSocketManager.registerHandler('telemedicine_offer', handler);
    this.unregisterHandlers.push(unregister);
    return unregister;
  }

  public onAnswer(handler: MessageHandler<TelemedicineAnswerMessage>): () => void {
    const unregister = webSocketManager.registerHandler('telemedicine_answer', handler);
    this.unregisterHandlers.push(unregister);
    return unregister;
  }

  public onIceCandidate(handler: MessageHandler<TelemedicineIceCandidateMessage>): () => void {
    const unregister = webSocketManager.registerHandler('telemedicine_ice_candidate', handler);
    this.unregisterHandlers.push(unregister);
    return unregister;
  }

  public onUserJoined(handler: MessageHandler<TelemedicineUserJoinedMessage>): () => void {
    const unregister = webSocketManager.registerHandler('telemedicine_user_joined', handler);
    this.unregisterHandlers.push(unregister);
    return unregister;
  }

  public onUserLeft(handler: MessageHandler<TelemedicineUserLeftMessage>): () => void {
    const unregister = webSocketManager.registerHandler('telemedicine_user_left', handler);
    this.unregisterHandlers.push(unregister);
    return unregister;
  }

  public onChatMessage(handler: MessageHandler<TelemedicineChatMessage>): () => void {
    const unregister = webSocketManager.registerHandler('telemedicine_chat_message', handler);
    this.unregisterHandlers.push(unregister);
    return unregister;
  }

  public disconnect(): void {
    // Unregister all handlers
    this.unregisterHandlers.forEach(unregister => {
      try {
        unregister();
      } catch (error) {
        console.error('Error unregistering telemedicine handler:', error);
      }
    });
    this.unregisterHandlers = [];
    
    webSocketManager.disableService('telemedicine');
  }

  public getStatus(): WebSocketStatus {
    return webSocketManager.getStatus();
  }

  public onStatusChange(listener: (status: WebSocketStatus) => void): () => void {
    return webSocketManager.onStatusChange(listener);
  }
}

// Create singleton instance
export const telemedicineService = new TelemedicineWebSocketService();
