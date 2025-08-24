import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId?: number;
  practiceId?: number;
  services: Set<string>; // Track which services this client is using
  rooms: Set<string>; // Track which rooms this client is in
}

interface WebSocketRoom {
  id: string;
  service: string;
  clients: Set<string>;
  appointmentId?: number;
  practiceId?: number;
}

export default class UnifiedWebSocketServer {
  private wss: WebSocketServer;
  private clients = new Map<string, WebSocketClient>();
  private rooms = new Map<string, WebSocketRoom>();
  private services = new Set(['whiteboard', 'telemedicine']);

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    console.log('UnifiedWebSocketServer: WebSocket server initialized');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private handleConnection(ws: WebSocket, request: any) {
    const clientId = this.generateId();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      services: new Set(),
      rooms: new Set()
    };

    this.clients.set(clientId, client);
    console.log(`UnifiedWebSocketServer: Client ${clientId} connected. Total clients: ${this.clients.size}`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error('UnifiedWebSocketServer: Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`UnifiedWebSocketServer: Client ${clientId} error:`, error);
      this.handleDisconnection(clientId);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection_established',
      clientId,
      services: Array.from(this.services)
    });
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`UnifiedWebSocketServer: Message from unknown client ${clientId}`);
      return;
    }

    const { type } = message;
    console.log(`UnifiedWebSocketServer: Received ${type} from client ${clientId}`);

    // Route message based on type
    if (type.startsWith('whiteboard_')) {
      this.handleWhiteboardMessage(clientId, message);
    } else if (type.startsWith('telemedicine_')) {
      this.handleTelemedicineMessage(clientId, message);
    } else {
      console.warn(`UnifiedWebSocketServer: Unknown message type: ${type}`);
    }
  }

  private handleWhiteboardMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.services.add('whiteboard');

    switch (message.type) {
      case 'whiteboard_update':
        // Broadcast to all clients in the same practice
        this.broadcastToPractice(message.practiceId, message, clientId);
        break;
      
      default:
        console.warn(`UnifiedWebSocketServer: Unknown whiteboard message type: ${message.type}`);
    }
  }

  private handleTelemedicineMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.services.add('telemedicine');

    const { roomId, appointmentId } = message;

    switch (message.type) {
      case 'telemedicine_user_joined':
        this.joinTelemedicineRoom(clientId, roomId, appointmentId, message);
        break;

      case 'telemedicine_user_left':
        this.leaveTelemedicineRoom(clientId, roomId);
        break;

      case 'telemedicine_offer':
      case 'telemedicine_answer':
      case 'telemedicine_ice_candidate':
      case 'telemedicine_chat_message':
        // Broadcast to all clients in the same room except sender
        this.broadcastToRoom(roomId, message, clientId);
        break;

      default:
        console.warn(`UnifiedWebSocketServer: Unknown telemedicine message type: ${message.type}`);
    }
  }

  private joinTelemedicineRoom(clientId: string, roomId: string, appointmentId: number, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        service: 'telemedicine',
        clients: new Set(),
        appointmentId,
        practiceId: message.practiceId
      });
    }

    const room = this.rooms.get(roomId)!;
    room.clients.add(clientId);
    client.rooms.add(roomId);

    console.log(`UnifiedWebSocketServer: Client ${clientId} joined telemedicine room ${roomId}`);

    // Notify all other clients in the room
    this.broadcastToRoom(roomId, {
      type: 'telemedicine_user_joined',
      roomId,
      appointmentId,
      userId: message.userId,
      userName: message.userName,
      clientId // Include client ID for identification
    }, clientId);

    // Send room info to the joining client
    this.sendToClient(clientId, {
      type: 'telemedicine_room_joined',
      roomId,
      appointmentId,
      participants: this.getRoomParticipants(roomId)
    });
  }

  private leaveTelemedicineRoom(clientId: string, roomId: string) {
    const client = this.clients.get(clientId);
    const room = this.rooms.get(roomId);
    
    if (!client || !room) return;

    room.clients.delete(clientId);
    client.rooms.delete(roomId);

    console.log(`UnifiedWebSocketServer: Client ${clientId} left telemedicine room ${roomId}`);

    // Notify remaining clients
    this.broadcastToRoom(roomId, {
      type: 'telemedicine_user_left',
      roomId,
      clientId
    });

    // Clean up empty room
    if (room.clients.size === 0) {
      this.rooms.delete(roomId);
      console.log(`UnifiedWebSocketServer: Removed empty room ${roomId}`);
    }
  }

  private broadcastToPractice(practiceId: number, message: any, excludeClientId?: string) {
    let count = 0;
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && 
          client.practiceId === practiceId && 
          client.services.has('whiteboard')) {
        this.sendToClient(clientId, message);
        count++;
      }
    });
    console.log(`UnifiedWebSocketServer: Broadcasted to ${count} clients in practice ${practiceId}`);
  }

  private broadcastToRoom(roomId: string, message: any, excludeClientId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    let count = 0;
    room.clients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
        count++;
      }
    });
    console.log(`UnifiedWebSocketServer: Broadcasted to ${count} clients in room ${roomId}`);
  }

  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error(`UnifiedWebSocketServer: Error sending to client ${clientId}:`, error);
      return false;
    }
  }

  private getRoomParticipants(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.clients) : [];
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`UnifiedWebSocketServer: Client ${clientId} disconnected`);

    // Leave all rooms
    client.rooms.forEach(roomId => {
      this.leaveTelemedicineRoom(clientId, roomId);
    });

    // Remove client
    this.clients.delete(clientId);
    console.log(`UnifiedWebSocketServer: Total clients: ${this.clients.size}`);
  }

  // Admin/monitoring methods
  public getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      services: Array.from(this.services),
      clientsByService: this.getClientsByService(),
      roomsByService: this.getRoomsByService()
    };
  }

  private getClientsByService() {
    const stats: Record<string, number> = {};
    this.services.forEach(service => {
      stats[service] = Array.from(this.clients.values())
        .filter(client => client.services.has(service)).length;
    });
    return stats;
  }

  private getRoomsByService() {
    const stats: Record<string, number> = {};
    this.services.forEach(service => {
      stats[service] = Array.from(this.rooms.values())
        .filter(room => room.service === service).length;
    });
    return stats;
  }

  public broadcastToService(service: string, message: any) {
    let count = 0;
    this.clients.forEach((client, clientId) => {
      if (client.services.has(service)) {
        this.sendToClient(clientId, message);
        count++;
      }
    });
    console.log(`UnifiedWebSocketServer: Broadcasted to ${count} ${service} clients`);
    return count;
  }
}
