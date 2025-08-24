import { Connection, Room } from './types';

/**
 * Manages WebSocket connections and rooms
 * Provides methods for connection lifecycle, room management, and message broadcasting
 */
export class ConnectionManager {
  private connections = new Map<string, Connection>();
  private rooms = new Map<string, Room>();

  /**
   * Add a new connection
   */
  addConnection(connectionId: string, socket: any): Connection {
    const connection: Connection = {
      socket,
      rooms: new Set(),
      userId: null,
      userName: null,
      connectionId,
      connectedAt: new Date()
    };

    this.connections.set(connectionId, connection);
    console.log(`✅ Connection added: ${connectionId} (Total: ${this.connections.size})`);
    
    return connection;
  }

  /**
   * Get a connection by ID
   */
  getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Remove a connection and clean up all associated rooms
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from all rooms
    connection.rooms.forEach(roomId => {
      this.leaveRoom(connectionId, roomId);
    });

    this.connections.delete(connectionId);
    console.log(`❌ Connection removed: ${connectionId} (Total: ${this.connections.size})`);
  }

  /**
   * Update connection user info
   */
  updateConnectionUser(connectionId: string, userId: number, userName: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.userId = userId;
      connection.userName = userName;
    }
  }

  /**
   * Join a room (create room if it doesn't exist)
   */
  joinRoom(connectionId: string, roomId: string, appointmentId?: number): Room {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        connectionIds: new Set(),
        createdAt: new Date(),
        lastActivity: new Date(),
        appointmentId
      });
    }

    const room = this.rooms.get(roomId)!;
    
    // Add connection to room
    room.connectionIds.add(connectionId);
    connection.rooms.add(roomId);
    room.lastActivity = new Date();

    console.log(`👥 Connection ${connectionId} joined room ${roomId} (Room size: ${room.connectionIds.size})`);
    
    return room;
  }

  /**
   * Leave a room
   */
  leaveRoom(connectionId: string, roomId: string): void {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (connection) {
      connection.rooms.delete(roomId);
    }

    if (room) {
      room.connectionIds.delete(connectionId);
      room.lastActivity = new Date();

      // Remove empty rooms
      if (room.connectionIds.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🗑️ Empty room removed: ${roomId}`);
      } else {
        console.log(`👋 Connection ${connectionId} left room ${roomId} (Room size: ${room.connectionIds.size})`);
      }
    }
  }

  /**
   * Get room info
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get all connections in a room
   */
  getRoomConnections(roomId: string): Connection[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.connectionIds)
      .map(connId => this.connections.get(connId))
      .filter((conn): conn is Connection => conn !== undefined);
  }

  /**
   * Broadcast message to all connections in a room (excluding sender)
   */
  broadcastToRoom(roomId: string, message: any, excludeConnectionId?: string): number {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(`📤 Room ${roomId} not found for broadcast`);
      return 0;
    }

    let sentCount = 0;
    const messageStr = JSON.stringify(message);

    room.connectionIds.forEach(connId => {
      if (connId === excludeConnectionId) return;

      const connection = this.connections.get(connId);
      if (connection && connection.socket.readyState === 1) { // WebSocket.OPEN = 1
        try {
          connection.socket.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`❌ Error sending to ${connId}:`, error);
          // Remove failed connection
          this.removeConnection(connId);
        }
      }
    });

    room.lastActivity = new Date();
    console.log(`📤 Broadcasted ${message.type} to ${sentCount} connections in room ${roomId}`);
    
    return sentCount;
  }

  /**
   * Send message to specific connection
   */
  sendToConnection(connectionId: string, message: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== 1) {
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Error sending to ${connectionId}:`, error);
      this.removeConnection(connectionId);
      return false;
    }
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      connections: this.connections.size,
      rooms: this.rooms.size,
      roomDetails: Array.from(this.rooms.values()).map(room => ({
        id: room.id,
        connectionCount: room.connectionIds.size,
        appointmentId: room.appointmentId,
        lastActivity: room.lastActivity
      }))
    };
  }

  /**
   * Clean up inactive rooms (rooms with no activity for specified time)
   */
  cleanupInactiveRooms(maxInactiveMinutes = 60): number {
    const cutoff = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    let cleanedCount = 0;

    this.rooms.forEach((room, roomId) => {
      if (room.lastActivity < cutoff && room.connectionIds.size === 0) {
        this.rooms.delete(roomId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} inactive rooms`);
    }

    return cleanedCount;
  }
}
