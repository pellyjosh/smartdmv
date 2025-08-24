import { ConnectionManager } from './connection-manager';
import { MESSAGE_TYPES } from './config';
import type { 
  WebSocketMessage, 
  TelemedicineUserJoinedMessage,
  TelemedicineUserLeftMessage,
  TelemedicineOfferMessage,
  TelemedicineAnswerMessage,
  TelemedicineIceCandidateMessage,
  TelemedicineChatMessage,
  WhiteboardUpdateMessage
} from './types';

/**
 * Handles incoming WebSocket messages and routes them appropriately
 * Implements business logic for different message types
 */
export class MessageHandler {
  constructor(private connectionManager: ConnectionManager) {}

  /**
   * Main message routing method
   */
  handleMessage(connectionId: string, message: WebSocketMessage): void {
    try {
      console.log(`📨 Handling message from ${connectionId}: ${message.type}`);

      switch (message.type) {
        case MESSAGE_TYPES.TELEMEDICINE_USER_JOINED:
          this.handleTelemedicineUserJoined(connectionId, message as TelemedicineUserJoinedMessage);
          break;

        case MESSAGE_TYPES.TELEMEDICINE_USER_LEFT:
          this.handleTelemedicineUserLeft(connectionId, message as TelemedicineUserLeftMessage);
          break;

        case MESSAGE_TYPES.TELEMEDICINE_OFFER:
        case MESSAGE_TYPES.TELEMEDICINE_ANSWER:
        case MESSAGE_TYPES.TELEMEDICINE_ICE_CANDIDATE:
          this.handleWebRTCSignaling(connectionId, message as TelemedicineOfferMessage | TelemedicineAnswerMessage | TelemedicineIceCandidateMessage);
          break;

        case MESSAGE_TYPES.TELEMEDICINE_CHAT_MESSAGE:
          this.handleTelemedicineChatMessage(connectionId, message as TelemedicineChatMessage);
          break;

        case MESSAGE_TYPES.WHITEBOARD_UPDATE:
          this.handleWhiteboardUpdate(connectionId, message as WhiteboardUpdateMessage);
          break;

        default:
          console.warn(`⚠️ Unknown message type: ${message.type}`);
          this.sendError(connectionId, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${connectionId}:`, error);
      this.sendError(connectionId, 'Internal server error');
    }
  }

  /**
   * Handle user joining a telemedicine room
   */
  private handleTelemedicineUserJoined(connectionId: string, message: TelemedicineUserJoinedMessage): void {
    const { roomId, appointmentId, userId, userName } = message;

    // Update connection with user info
    this.connectionManager.updateConnectionUser(connectionId, userId, userName);

    // Join the room
    this.connectionManager.joinRoom(connectionId, roomId, appointmentId);

    console.log(`👥 User ${userName} (${userId}) joined telemedicine room ${roomId} for appointment ${appointmentId}`);

    // Notify other users in the room
    this.connectionManager.broadcastToRoom(roomId, {
      type: MESSAGE_TYPES.TELEMEDICINE_USER_JOINED,
      roomId,
      appointmentId,
      userId,
      userName,
      timestamp: Date.now()
    }, connectionId);

    // Send room info to the new user
    const roomConnections = this.connectionManager.getRoomConnections(roomId);
    const otherUsers = roomConnections
      .filter(conn => conn.connectionId !== connectionId)
      .map(conn => ({
        userId: conn.userId,
        userName: conn.userName,
        connectionId: conn.connectionId
      }));

    this.connectionManager.sendToConnection(connectionId, {
      type: MESSAGE_TYPES.ROOM_INFO,
      roomId,
      appointmentId,
      users: otherUsers,
      timestamp: Date.now()
    });
  }

  /**
   * Handle user leaving a telemedicine room
   */
  private handleTelemedicineUserLeft(connectionId: string, message: TelemedicineUserLeftMessage): void {
    const { roomId, appointmentId, userId } = message;
    const connection = this.connectionManager.getConnection(connectionId);

    console.log(`👋 User ${connection?.userName || 'Unknown'} (${userId}) left telemedicine room ${roomId}`);

    // Leave the room
    this.connectionManager.leaveRoom(connectionId, roomId);

    // Notify other users in the room
    this.connectionManager.broadcastToRoom(roomId, {
      type: MESSAGE_TYPES.TELEMEDICINE_USER_LEFT,
      roomId,
      appointmentId,
      userId,
      userName: connection?.userName || 'Unknown',
      timestamp: Date.now()
    }, connectionId);
  }

  /**
   * Handle WebRTC signaling messages (offer, answer, ICE candidates)
   */
  private handleWebRTCSignaling(
    connectionId: string, 
    message: TelemedicineOfferMessage | TelemedicineAnswerMessage | TelemedicineIceCandidateMessage
  ): void {
    const { roomId } = message;

    console.log(`🔄 Relaying WebRTC ${message.type} in room ${roomId}`);

    // If message has a specific target, send only to that connection
    if ('to' in message && message.to) {
      const targetConnection = this.connectionManager.getRoomConnections(roomId)
        .find(conn => conn.connectionId === message.to || conn.userName === message.to);

      if (targetConnection) {
        this.connectionManager.sendToConnection(targetConnection.connectionId, message);
      } else {
        console.warn(`⚠️ Target user ${message.to} not found in room ${roomId}`);
      }
    } else {
      // Broadcast to all other users in the room
      this.connectionManager.broadcastToRoom(roomId, message, connectionId);
    }
  }

  /**
   * Handle chat messages in telemedicine rooms
   */
  private handleTelemedicineChatMessage(connectionId: string, message: TelemedicineChatMessage): void {
    const { roomId, appointmentId, message: chatMessage, userId, userName } = message;

    console.log(`💬 Chat message from ${userName} in room ${roomId}: ${chatMessage.substring(0, 50)}...`);

    // Broadcast to all users in the room (including sender for confirmation)
    this.connectionManager.broadcastToRoom(roomId, {
      type: MESSAGE_TYPES.TELEMEDICINE_CHAT_MESSAGE,
      roomId,
      appointmentId,
      message: chatMessage,
      userId,
      userName,
      timestamp: Date.now()
    });
  }

  /**
   * Handle whiteboard updates
   */
  private handleWhiteboardUpdate(connectionId: string, message: WhiteboardUpdateMessage): void {
    const { roomId, appointmentId, data, userId, userName } = message;

    console.log(`🎨 Whiteboard update from ${userName} in room ${roomId}`);

    // Broadcast to all other users in the room
    this.connectionManager.broadcastToRoom(roomId, {
      type: MESSAGE_TYPES.WHITEBOARD_UPDATE,
      roomId,
      appointmentId,
      data,
      userId,
      userName,
      timestamp: Date.now()
    }, connectionId);
  }

  /**
   * Send error message to a specific connection
   */
  private sendError(connectionId: string, errorMessage: string, code?: string): void {
    this.connectionManager.sendToConnection(connectionId, {
      type: MESSAGE_TYPES.ERROR,
      message: errorMessage,
      code,
      timestamp: Date.now()
    });
  }
}
