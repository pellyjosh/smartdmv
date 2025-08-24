// Type definitions for WebSocket server
export interface Connection {
  socket: any; // Using any to handle both browser WebSocket and ws library WebSocket
  rooms: Set<string>;
  userId: number | null;
  userName: string | null;
  connectionId: string;
  connectedAt: Date;
}

export interface Room {
  id: string;
  connectionIds: Set<string>;
  createdAt: Date;
  lastActivity: Date;
  appointmentId?: number;
}

export interface BaseMessage {
  type: string;
  timestamp: number;
}

export interface TelemedicineUserJoinedMessage extends BaseMessage {
  type: 'telemedicine_user_joined';
  roomId: string;
  appointmentId: number;
  userId: number;
  userName: string;
}

export interface TelemedicineUserLeftMessage extends BaseMessage {
  type: 'telemedicine_user_left';
  roomId: string;
  appointmentId: number;
  userId: number;
  userName?: string;
}

export interface TelemedicineOfferMessage extends BaseMessage {
  type: 'telemedicine_offer';
  roomId: string;
  appointmentId: number;
  offer: RTCSessionDescriptionInit;
  from: string;
  to?: string;
}

export interface TelemedicineAnswerMessage extends BaseMessage {
  type: 'telemedicine_answer';
  roomId: string;
  appointmentId: number;
  answer: RTCSessionDescriptionInit;
  from: string;
  to?: string;
}

export interface TelemedicineIceCandidateMessage extends BaseMessage {
  type: 'telemedicine_ice_candidate';
  roomId: string;
  appointmentId: number;
  candidate: RTCIceCandidateInit;
  from: string;
  to?: string;
}

export interface TelemedicineChatMessage extends BaseMessage {
  type: 'telemedicine_chat_message';
  roomId: string;
  appointmentId: number;
  message: string;
  userId: number;
  userName: string;
}

export interface WhiteboardUpdateMessage extends BaseMessage {
  type: 'whiteboard_update';
  roomId: string;
  appointmentId?: number;
  data: any;
  userId: number;
  userName: string;
}

export interface ConnectedMessage extends BaseMessage {
  type: 'connected';
  connectionId: string;
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
  code?: string;
}

export type WebSocketMessage = 
  | TelemedicineUserJoinedMessage
  | TelemedicineUserLeftMessage
  | TelemedicineOfferMessage
  | TelemedicineAnswerMessage
  | TelemedicineIceCandidateMessage
  | TelemedicineChatMessage
  | WhiteboardUpdateMessage
  | ConnectedMessage
  | ErrorMessage;
