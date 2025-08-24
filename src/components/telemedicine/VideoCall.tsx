'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, MicOff, Video, VideoOff, Phone, PhoneOff, 
  MessageSquare, Settings, Monitor, ScreenShare,
  Volume2, VolumeX
} from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  isInitiator?: boolean;
  onCallEnd?: () => void;
  userName?: string;
}

interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export default function VideoCall({ 
  roomId, 
  isInitiator = false, 
  onCallEnd,
  userName = "User"
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [chatMessages, setChatMessages] = useState<Array<{id: string, user: string, message: string, timestamp: Date}>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState('Remote User');

  // ICE servers configuration
  const iceServers: ICEServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  useEffect(() => {
    initializeCall();
    return () => {
      cleanupCall();
    };
  }, [roomId]);

  const initializeCall = async () => {
    try {
      // Initialize WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        wsRef.current?.send(JSON.stringify({
          type: 'join-room',
          roomId,
          userName
        }));
      };

      wsRef.current.onmessage = handleWebSocketMessage;
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize peer connection
      await initializePeerConnection(stream);

    } catch (error) {
      console.error('Error initializing call:', error);
      setConnectionStatus('error');
    }
  };

  const initializePeerConnection = async (localStream: MediaStream) => {
    const peerConnection = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = peerConnection;

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setIsConnected(true);
      setConnectionStatus('connected');
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(JSON.stringify({
          type: 'ice-candidate',
          roomId,
          candidate: event.candidate
        }));
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('Connection state:', state);
      setConnectionStatus(state);
      
      if (state === 'connected') {
        setIsConnected(true);
      } else if (state === 'disconnected' || state === 'failed') {
        setIsConnected(false);
      }
    };

    // Create offer if initiator
    if (isInitiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      wsRef.current?.send(JSON.stringify({
        type: 'offer',
        roomId,
        offer
      }));
    }
  };

  const handleWebSocketMessage = async (event: MessageEvent) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'offer':
        await handleOffer(data.offer);
        break;
      case 'answer':
        await handleAnswer(data.answer);
        break;
      case 'ice-candidate':
        await handleIceCandidate(data.candidate);
        break;
      case 'user-joined':
        setRemoteUserName(data.userName || 'Remote User');
        break;
      case 'chat-message':
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          user: data.userName,
          message: data.message,
          timestamp: new Date()
        }]);
        break;
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;

    await peerConnectionRef.current.setRemoteDescription(offer);
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);

    wsRef.current?.send(JSON.stringify({
      type: 'answer',
      roomId,
      answer
    }));
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    await peerConnectionRef.current.setRemoteDescription(answer);
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;
    await peerConnectionRef.current.addIceCandidate(candidate);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      if (peerConnectionRef.current) {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(screenStream.getVideoTracks()[0]);
          setIsScreenSharing(true);

          // Handle screen share end
          screenStream.getVideoTracks()[0].onended = async () => {
            if (localStreamRef.current && videoTrack) {
              await sender.replaceTrack(videoTrack);
              setIsScreenSharing(false);
            }
          };
        }
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const sendChatMessage = () => {
    if (newMessage.trim() && wsRef.current) {
      const message = {
        type: 'chat-message',
        roomId,
        userName,
        message: newMessage.trim()
      };

      wsRef.current.send(JSON.stringify(message));
      
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        user: userName,
        message: newMessage.trim(),
        timestamp: new Date()
      }]);

      setNewMessage('');
    }
  };

  const endCall = () => {
    cleanupCall();
    onCallEnd?.();
  };

  const cleanupCall = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Main video area */}
      <div className="flex-1 relative">
        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ display: isConnected ? 'block' : 'none' }}
        />

        {/* Connection status overlay */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg capitalize">{connectionStatus}</p>
              <p className="text-sm text-gray-300">
                {connectionStatus === 'connecting' ? 'Connecting to call...' : 
                 connectionStatus === 'error' ? 'Connection failed' : 
                 'Waiting for other participant...'}
              </p>
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-gray-600">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Remote user info */}
        {isConnected && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
            {remoteUserName}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="bg-gray-800 p-4 flex justify-center space-x-4">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          onClick={toggleMute}
          className="rounded-full h-12 w-12"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant={isVideoOff ? "destructive" : "secondary"}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full h-12 w-12"
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={startScreenShare}
          className="rounded-full h-12 w-12"
          disabled={isScreenSharing}
        >
          <ScreenShare className="h-5 w-5" />
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => setShowChat(!showChat)}
          className="rounded-full h-12 w-12"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={endCall}
          className="rounded-full h-12 w-12"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat sidebar */}
      {showChat && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-lg flex flex-col">
          <div className="bg-gray-100 p-4 border-b">
            <h3 className="font-semibold">Chat</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`${msg.user === userName ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-xs p-2 rounded-lg ${
                  msg.user === userName 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={sendChatMessage}>Send</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
