// WebSocket message types and interfaces for all services

// Base message interface
export interface BaseWebSocketMessage {
  type: string;
  timestamp?: number;
  practiceId?: number;
  userId?: number;
}

// Whiteboard related messages
export interface WhiteboardUpdateMessage extends BaseWebSocketMessage {
  type: 'whiteboard_update';
  practiceId: number;
  data?: any;
}

// Telemedicine related messages
export interface TelemedicineMessage extends BaseWebSocketMessage {
  type: 'telemedicine_offer' | 'telemedicine_answer' | 'telemedicine_ice_candidate' | 'telemedicine_user_joined' | 'telemedicine_user_left' | 'telemedicine_chat_message';
  roomId: string;
  appointmentId: number;
}

export interface TelemedicineOfferMessage extends TelemedicineMessage {
  type: 'telemedicine_offer';
  offer: RTCSessionDescriptionInit;
  from: string;
}

export interface TelemedicineAnswerMessage extends TelemedicineMessage {
  type: 'telemedicine_answer';
  answer: RTCSessionDescriptionInit;
  from: string;
}

export interface TelemedicineIceCandidateMessage extends TelemedicineMessage {
  type: 'telemedicine_ice_candidate';
  candidate: RTCIceCandidateInit;
  from: string;
}

export interface TelemedicineUserJoinedMessage extends TelemedicineMessage {
  type: 'telemedicine_user_joined';
  userId: number;
  userName: string;
}

export interface TelemedicineUserLeftMessage extends TelemedicineMessage {
  type: 'telemedicine_user_left';
  userId: number;
}

export interface TelemedicineChatMessage extends TelemedicineMessage {
  type: 'telemedicine_chat_message';
  message: string;
  from: string;
  fromUserId: number;
}

// Union type for all possible WebSocket messages
export type WebSocketMessage = 
  | WhiteboardUpdateMessage 
  | TelemedicineOfferMessage 
  | TelemedicineAnswerMessage 
  | TelemedicineIceCandidateMessage 
  | TelemedicineUserJoinedMessage 
  | TelemedicineUserLeftMessage 
  | TelemedicineChatMessage;

// Message handler type
export type MessageHandler<T extends WebSocketMessage = WebSocketMessage> = (message: T) => void;

// Service configuration
export interface WebSocketServiceConfig {
  name: string;
  messageTypes: string[];
  enabled: boolean;
}

// WebSocket connection status
export enum WebSocketStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}
