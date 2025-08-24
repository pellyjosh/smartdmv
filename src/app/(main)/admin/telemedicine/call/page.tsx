'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/context/ThemeContext';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Settings,
  User,
  Calendar,
  Clock,
  Heart,
  Monitor,
  Users,
  MessageSquare,
  MoreVertical,
  Shield,
  AlertTriangle,
  CheckCircle,
  Camera,
  Volume2,
  VolumeX,
  Maximize,
  X
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { telemedicineService, webSocketManager, WebSocketStatus } from '@/lib/websocket';
import { format, isAfter, isBefore, addMinutes, differenceInMinutes } from 'date-fns';

interface CallParticipant {
  id: string;
  name: string;
  role: 'veterinarian' | 'client';
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

interface AppointmentDetails {
  id: string;
  title: string;
  clientName: string;
  petName: string;
  scheduledTime: string;
  duration: number;
  practitionerName: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

type CallPhase = 'pre-call' | 'active' | 'ended';

export default function TelemedicineCallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Get appointment ID from URL params
  const appointmentId = searchParams.get('appointmentId');
  
  // Call state
  const [callPhase, setCallPhase] = useState<CallPhase>('pre-call');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Time validation state
  const [canJoinCall, setCanJoinCall] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isCallExpired, setIsCallExpired] = useState(false);
  
  // Camera/preview state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);

  // Clean up media stream
  const cleanupMediaStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      setLocalStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Handle page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupMediaStream();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupMediaStream(); // Cleanup on component unmount
    };
  }, [localStream]);
  
  // Mock appointment data - replace with actual API call
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  
  // Initialize media devices and appointment validation on mount
  useEffect(() => {
    initializeMediaDevices();
    if (appointmentId) {
      loadAppointmentDetails();
    }
  }, [appointmentId, user]);

  // Initialize media devices
  const initializeMediaDevices = async () => {
    try {
      // Check for camera and microphone availability
      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasCamera(devices.some(device => device.kind === 'videoinput'));
      setHasMicrophone(devices.some(device => device.kind === 'audioinput'));

      // Get user media for preview
      if (hasCamera || hasMicrophone) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: hasCamera,
          audio: hasMicrophone
        });
        setLocalStream(stream);
        
        if (videoRef.current && hasCamera) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  // Load appointment details and validate timing
  const loadAppointmentDetails = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointment');
      }

      const appointmentData = await response.json();
      
      // Transform API response to match our interface
      const appointment: AppointmentDetails = {
        id: appointmentData.id.toString(),
        title: appointmentData.title,
        clientName: appointmentData.client?.name || 'Unknown Client',
        petName: appointmentData.pet?.name || 'Unknown Pet', 
        scheduledTime: appointmentData.date, // API returns 'date' field
        duration: parseInt(String(appointmentData.durationMinutes)) || 30, // API returns 'durationMinutes'
        practitionerName: appointmentData.practitioner?.name || 'Unknown Practitioner',
        status: appointmentData.status as AppointmentDetails['status']
      };

      setAppointmentDetails(appointment);
      validateAppointmentTiming(appointment);
      
      // Mock participants
      setParticipants([
        {
          id: '1',
          name: user?.role === 'CLIENT' ? appointment.practitionerName : appointment.clientName,
          role: user?.role === 'CLIENT' ? 'veterinarian' : 'client',
          isVideoEnabled: true,
          isAudioEnabled: true
        }
      ]);
      
    } catch (error) {
      console.error('Error loading appointment:', error);
      
      // Fallback to mock data for development
      const mockAppointment: AppointmentDetails = {
        id: appointmentId!,
        title: 'Virtual Checkup - Buddy',
        clientName: 'John Smith',
        petName: 'Buddy',
        scheduledTime: addMinutes(new Date(), 60).toISOString(), // 1 hour from now as fallback
        duration: 30,
        practitionerName: 'Dr. Sarah Johnson',
        status: 'upcoming'
      };

      setAppointmentDetails(mockAppointment);
      validateAppointmentTiming(mockAppointment);
      
      setParticipants([
        {
          id: '1',
          name: user?.role === 'CLIENT' ? 'Dr. Sarah Johnson' : 'John Smith',
          role: user?.role === 'CLIENT' ? 'veterinarian' : 'client',
          isVideoEnabled: true,
          isAudioEnabled: true
        }
      ]);
    }
  };

  // Validate appointment timing
  const validateAppointmentTiming = (appointment: AppointmentDetails) => {
    const now = new Date();
    const scheduledTime = new Date(appointment.scheduledTime);
    const appointmentEnd = addMinutes(scheduledTime, appointment.duration);
    
    // Allow joining 15 minutes before scheduled time
    const joinWindow = addMinutes(scheduledTime, -15);
    
    const minutesUntilStart = differenceInMinutes(scheduledTime, now);
    const minutesUntilEnd = differenceInMinutes(appointmentEnd, now);
    
    console.log('Time validation:', {
      now: format(now, 'yyyy-MM-dd HH:mm:ss'),
      scheduledTime: format(scheduledTime, 'yyyy-MM-dd HH:mm:ss'),
      minutesUntilStart,
      minutesUntilEnd
    });
    
    setTimeUntilStart(minutesUntilStart);
    setTimeRemaining(minutesUntilEnd);
    
    // Can join if within the join window and before appointment end
    const canJoin = isAfter(now, joinWindow) && isBefore(now, appointmentEnd);
    setCanJoinCall(canJoin);
    
    // Check if appointment has expired
    setIsCallExpired(isAfter(now, appointmentEnd));
  };

  // Format time remaining in a user-friendly way
  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) return '';
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  };

  // Update timing every minute
  useEffect(() => {
    if (!appointmentDetails) return;
    
    const interval = setInterval(() => {
      validateAppointmentTiming(appointmentDetails);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [appointmentDetails]);

  // WebSocket connection for real-time communication
  useEffect(() => {
    if (!user || !appointmentId) return;

    let statusUnsubscribe: (() => void) | null = null;

    const connectWebSocket = () => {
      try {
        setWsStatus(WebSocketStatus.CONNECTING);
        
        statusUnsubscribe = telemedicineService.onStatusChange((status) => {
          setWsStatus(status);
        });

        telemedicineService.connect();
        
        // Join the specific appointment room
        if (user?.id && user?.name) {
          telemedicineService.joinRoom(
            `appointment_${appointmentId}`,
            parseInt(appointmentId),
            parseInt(user.id),
            user.name
          );
        }

      } catch (error) {
        console.error('WebSocket connection error:', error);
        setWsStatus(WebSocketStatus.DISCONNECTED);
      }
    };

    connectWebSocket();

    return () => {
      if (statusUnsubscribe) {
        statusUnsubscribe();
      }
      telemedicineService.disconnect();
    };
  }, [user, appointmentId]);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callPhase === 'active') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callPhase === 'active']);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleJoinCall = () => {
    if (!canJoinCall || isCallExpired) {
      return;
    }
    
    setCallPhase('active');
    setCallDuration(0);
    
    // Send chat message to indicate call start
    if (user?.name) {
      telemedicineService.sendChatMessage(
        `appointment_${appointmentId}`,
        parseInt(appointmentId!),
        'Call started',
        user.name,
        parseInt(user.id)
      );
    }
  };

  const handleEndCall = () => {
    setCallPhase('ended');
    setCallDuration(0);
    
    // Clean up media stream
    cleanupMediaStream();
    
    // Send chat message to indicate call end and leave room
    if (user?.name) {
      telemedicineService.sendChatMessage(
        `appointment_${appointmentId}`,
        parseInt(appointmentId!),
        `Call ended after ${formatDuration(callDuration)}`,
        user.name,
        parseInt(user.id)
      );
      
      telemedicineService.leaveRoom(
        `appointment_${appointmentId}`,
        parseInt(appointmentId!),
        parseInt(user.id)
      );
    }
    
    // Redirect back to appointments or telemedicine page
    setTimeout(() => {
      router.push('/admin/telemedicine');
    }, 2000);
  };

  // Handle back/cancel navigation
  const handleCancel = () => {
    cleanupMediaStream();
    router.push('/admin/telemedicine');
  };

  const toggleVideo = () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    
    // Actually control the video tracks
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = newVideoState;
        console.log(`Video track ${newVideoState ? 'enabled' : 'disabled'}`);
      });
    }
    
    // Send chat message to indicate video toggle
    if (user?.name) {
      telemedicineService.sendChatMessage(
        `appointment_${appointmentId}`,
        parseInt(appointmentId!),
        `Video ${newVideoState ? 'enabled' : 'disabled'}`,
        user.name,
        parseInt(user.id)
      );
    }
  };

  const toggleAudio = () => {
    const newAudioState = !isAudioEnabled;
    setIsAudioEnabled(newAudioState);
    
    // Actually control the audio tracks
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = newAudioState;
        console.log(`Audio track ${newAudioState ? 'enabled' : 'disabled'}`);
      });
    }
    
    // Send chat message to indicate audio toggle
    if (user?.name) {
      telemedicineService.sendChatMessage(
        `appointment_${appointmentId}`,
        parseInt(appointmentId!),
        `Audio ${newAudioState ? 'enabled' : 'disabled'}`,
        user.name,
        parseInt(user.id)
      );
    }
  };

  if (!appointmentId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-96 bg-gray-800 border-gray-700">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-white">Invalid Call Link</h2>
            <p className="text-gray-300 mb-4">No appointment ID provided</p>
            <Button onClick={handleCancel}>
              Return to Telemedicine
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointmentDetails) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  // Show expired appointment message
  if (isCallExpired) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-96 bg-gray-800 border-gray-700">
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-white">Appointment Expired</h2>
            <p className="text-gray-300 mb-4">
              This appointment ended on {format(addMinutes(new Date(appointmentDetails.scheduledTime), appointmentDetails.duration), 'MMM d, yyyy at h:mm a')}
            </p>
            <Button onClick={handleCancel}>
              Return to Telemedicine
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-call setup (Google Meet style)
  if (callPhase === 'pre-call') {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Heart className="h-6 w-6 text-red-500" />
              <span className="font-semibold">SmartDMV Telemedicine</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {/* Left side - Video preview */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full">
              {/* Video preview */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                {hasCamera && isVideoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">
                        {!hasCamera ? 'No camera detected' : 'Camera is off'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Video controls overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <Button
                    variant={isAudioEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={toggleAudio}
                    className="rounded-full w-10 h-10 p-0"
                    disabled={!hasMicrophone}
                  >
                    {isAudioEnabled && hasMicrophone ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    variant={isVideoEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={toggleVideo}
                    className="rounded-full w-10 h-10 p-0"
                    disabled={!hasCamera}
                  >
                    {isVideoEnabled && hasCamera ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Device status */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4 text-gray-300" />
                  <span className={hasCamera ? 'text-green-400' : 'text-red-400'}>
                    {hasCamera ? 'Camera detected' : 'No camera detected'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mic className="h-4 w-4 text-gray-300" />
                  <span className={hasMicrophone ? 'text-green-400' : 'text-red-400'}>
                    {hasMicrophone ? 'Microphone detected' : 'No microphone detected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Appointment info and join button */}
          <div className="w-96 bg-gray-800 border-l border-gray-700 p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 text-white">{appointmentDetails.title}</h2>
                <p className="text-gray-400 text-sm">Ready to join?</p>
              </div>

              <Separator className="bg-gray-700" />

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Scheduled</span>
                  </div>
                  <p className="text-white">
                    {format(new Date(appointmentDetails.scheduledTime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-white">
                    {format(new Date(appointmentDetails.scheduledTime), 'h:mm a')} ({appointmentDetails.duration} min)
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <User className="h-4 w-4" />
                    <span>Patient</span>
                  </div>
                  <p className="text-white">{appointmentDetails.petName}</p>
                  <p className="text-gray-400 text-sm">{appointmentDetails.clientName}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <Shield className="h-4 w-4" />
                    <span>Veterinarian</span>
                  </div>
                  <p className="text-white">{appointmentDetails.practitionerName}</p>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              {/* Time status */}
              <div className="space-y-3">
                {timeUntilStart !== null && timeUntilStart > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <Clock className="h-4 w-4" />
                    <span>Starts in {formatTimeRemaining(timeUntilStart)}</span>
                  </div>
                ) : timeRemaining !== null && timeRemaining > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>{formatTimeRemaining(timeRemaining)} remaining</span>
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleJoinCall}
                  disabled={!canJoinCall || (!hasCamera && !hasMicrophone)}
                >
                  <Video className="h-5 w-5 mr-2" />
                  {!canJoinCall ? 'Cannot Join Yet' : 'Join Call'}
                </Button>

                {!canJoinCall && timeUntilStart !== null && timeUntilStart > 15 && (
                  <p className="text-xs text-muted-foreground text-center">
                    You can join 15 minutes before the scheduled time
                  </p>
                )}

                {(!hasCamera && !hasMicrophone) && (
                  <p className="text-xs text-red-600 dark:text-red-400 text-center">
                    Camera or microphone required to join
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active call interface
  if (callPhase === 'active') {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="font-semibold">{appointmentDetails.title}</span>
              </div>
              
              <Badge variant={wsStatus === WebSocketStatus.CONNECTED ? "default" : "destructive"}>
                {wsStatus === WebSocketStatus.CONNECTED ? 'Connected' : 'Connecting...'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1 text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                {formatDuration(callDuration)}
              </div>
              {timeRemaining !== null && timeRemaining > 0 && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Clock className="h-4 w-4" />
                  {formatTimeRemaining(timeRemaining)} remaining
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Video Area */}
        <div className="flex-1 relative bg-gray-800">
          {/* Main participant video */}
          <div className="h-full flex items-center justify-center">
            <div className="bg-gray-700 rounded-lg p-8 text-center max-w-md border border-gray-600">
              <div className="w-32 h-32 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="h-16 w-16 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-white">
                {user?.role === 'CLIENT' ? appointmentDetails.practitionerName : appointmentDetails.clientName}
              </p>
              <p className="text-sm text-gray-400">
                {isVideoEnabled ? 'Video enabled' : 'Video disabled'}
              </p>
            </div>
          </div>

          {/* Self video (picture-in-picture) */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
            {hasCamera && isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-600">
                <div className="text-center">
                  <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">You</p>
                </div>
              </div>
            )}
          </div>

          {/* Top-right controls */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              className="rounded-full w-12 h-12 p-0"
              disabled={!hasMicrophone}
            >
              {isAudioEnabled && hasMicrophone ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full w-12 h-12 p-0"
              disabled={!hasCamera}
            >
              {isVideoEnabled && hasCamera ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
              variant={isSpeakerEnabled ? "default" : "secondary"}
              size="lg"
              onClick={() => setIsSpeakerEnabled(!isSpeakerEnabled)}
              className="rounded-full w-12 h-12 p-0"
            >
              {isSpeakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="rounded-full w-12 h-12 p-0"
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndCall}
              className="rounded-full w-12 h-12 p-0"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>

          {/* Call info bar */}
          <div className="flex items-center justify-center mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{appointmentDetails.petName} • {appointmentDetails.clientName}</span>
              <span>•</span>
              <span>Veterinary Consultation</span>
              {timeRemaining !== null && timeRemaining <= 5 && timeRemaining > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-400 font-semibold">Call ending in {formatTimeRemaining(timeRemaining)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chat sidebar (if enabled) */}
        {showChat && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Chat</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-gray-400">
              Chat functionality coming soon...
            </div>
          </div>
        )}
      </div>
    );
  }

  // Call ended screen
  if (callPhase === 'ended') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-96 bg-gray-800 border-gray-700">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-white">Call Ended</h2>
            <p className="text-gray-300 mb-4">
              Your telemedicine session has ended. Duration: {formatDuration(callDuration)}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Redirecting you back to the telemedicine dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
