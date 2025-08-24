import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';

interface RoomParticipant {
  ws: WebSocket;
  userId?: string;
  userName?: string;
  roomId: string;
}

interface SignalingMessage {
  type: 'join-room' | 'offer' | 'answer' | 'ice-candidate' | 'chat-message' | 'user-joined' | 'user-left';
  roomId?: string;
  userName?: string;
  userId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  message?: string;
}

class TelemedicineSignalingServer {
  private wss: WebSocketServer;
  private rooms: Map<string, Set<RoomParticipant>> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('Telemedicine WebSocket signaling server started');
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    console.log('New WebSocket connection established');

    ws.on('message', (data: Buffer) => {
      try {
        const message: SignalingMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });
  }

  private handleMessage(ws: WebSocket, message: SignalingMessage) {
    switch (message.type) {
      case 'join-room':
        this.handleJoinRoom(ws, message);
        break;
      case 'offer':
        this.handleOffer(ws, message);
        break;
      case 'answer':
        this.handleAnswer(ws, message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(ws, message);
        break;
      case 'chat-message':
        this.handleChatMessage(ws, message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleJoinRoom(ws: WebSocket, message: SignalingMessage) {
    if (!message.roomId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room ID is required'
      }));
      return;
    }

    const participant: RoomParticipant = {
      ws,
      userId: message.userId,
      userName: message.userName || 'Anonymous',
      roomId: message.roomId
    };

    // Add to room
    if (!this.rooms.has(message.roomId)) {
      this.rooms.set(message.roomId, new Set());
    }

    const room = this.rooms.get(message.roomId)!;
    room.add(participant);

    console.log(`User ${participant.userName} joined room ${message.roomId}`);

    // Notify other participants in the room
    this.broadcastToRoom(message.roomId, {
      type: 'user-joined',
      userName: participant.userName,
      userId: participant.userId
    }, ws);

    // Send confirmation to the joining user
    ws.send(JSON.stringify({
      type: 'joined-room',
      roomId: message.roomId,
      participantCount: room.size
    }));
  }

  private handleOffer(ws: WebSocket, message: SignalingMessage) {
    if (!message.roomId || !message.offer) return;

    this.broadcastToRoom(message.roomId, {
      type: 'offer',
      offer: message.offer
    }, ws);
  }

  private handleAnswer(ws: WebSocket, message: SignalingMessage) {
    if (!message.roomId || !message.answer) return;

    this.broadcastToRoom(message.roomId, {
      type: 'answer',
      answer: message.answer
    }, ws);
  }

  private handleIceCandidate(ws: WebSocket, message: SignalingMessage) {
    if (!message.roomId || !message.candidate) return;

    this.broadcastToRoom(message.roomId, {
      type: 'ice-candidate',
      candidate: message.candidate
    }, ws);
  }

  private handleChatMessage(ws: WebSocket, message: SignalingMessage) {
    if (!message.roomId || !message.message) return;

    const participant = this.findParticipant(ws);
    if (!participant) return;

    this.broadcastToRoom(message.roomId, {
      type: 'chat-message',
      userName: participant.userName,
      message: message.message
    }, ws);
  }

  private handleDisconnection(ws: WebSocket) {
    const participant = this.findParticipant(ws);
    if (!participant) return;

    const room = this.rooms.get(participant.roomId);
    if (room) {
      room.delete(participant);
      
      // Notify other participants
      this.broadcastToRoom(participant.roomId, {
        type: 'user-left',
        userName: participant.userName,
        userId: participant.userId
      });

      // Clean up empty rooms
      if (room.size === 0) {
        this.rooms.delete(participant.roomId);
        console.log(`Room ${participant.roomId} cleaned up`);
      }
    }

    console.log(`User ${participant.userName} left room ${participant.roomId}`);
  }

  private findParticipant(ws: WebSocket): RoomParticipant | null {
    for (const room of this.rooms.values()) {
      for (const participant of room) {
        if (participant.ws === ws) {
          return participant;
        }
      }
    }
    return null;
  }

  private broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    room.forEach(participant => {
      if (participant.ws !== excludeWs && participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(messageStr);
      }
    });
  }

  public getRoomInfo(roomId: string) {
    const room = this.rooms.get(roomId);
    return {
      exists: !!room,
      participantCount: room?.size || 0,
      participants: room ? Array.from(room).map(p => ({
        userId: p.userId,
        userName: p.userName
      })) : []
    };
  }
}

export default TelemedicineSignalingServer;
