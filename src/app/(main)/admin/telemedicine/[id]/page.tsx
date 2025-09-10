'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import VideoCall from '@/components/telemedicine/VideoCall';
import { useUser } from '@/context/UserContext';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  Phone,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { isAdmin } from '@/lib/rbac-helpers';

interface TelemedicineAppointment {
  id: number;
  title: string;
  description: string | null;
  date: string;
  status: string;
  type: string;
  roomId: string | null;
  notes: string | null;
  telemedicineStartedAt: string | null;
  telemedicineEndedAt: string | null;
  pet?: {
    id: number;
    name: string;
  };
  client?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  practitioner?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export default function TelemedicineAppointmentPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  const appointmentId = params.id as string;
  const [isCallActive, setIsCallActive] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [showNotesDialog, setShowNotesDialog] = useState(false);

  // Fetch appointment details
  const { 
    data: appointment, 
    isLoading, 
    error,
    refetch 
  } = useQuery<TelemedicineAppointment>({
    queryKey: [`/api/appointments/${appointmentId}`],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch appointment');
      }
      return response.json();
    },
    enabled: !!appointmentId
  });

  // Start telemedicine session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/appointments/${appointmentId}/start-telemedicine`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to start telemedicine session');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsCallActive(true);
      // Refetch appointment to get updated status
      refetch();
    },
    onError: (error) => {
      console.error('Error starting session:', error);
    }
  });

  // End telemedicine session mutation
  const endSessionMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const response = await fetch(`/api/appointments/${appointmentId}/end-telemedicine`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });
      if (!response.ok) {
        throw new Error('Failed to end telemedicine session');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsCallActive(false);
      setShowNotesDialog(false);
      setSessionNotes('');
      // Refetch appointment to get updated status
      refetch();
      // Optionally redirect to appointments list
      // router.push('/admin/telemedicine');
    },
    onError: (error) => {
      console.error('Error ending session:', error);
    }
  });

  // Check if session is already active
  useEffect(() => {
    if (appointment?.status === 'in_progress') {
      setIsCallActive(true);
    }
  }, [appointment]);

  const handleStartSession = () => {
    startSessionMutation.mutate();
  };

  const handleEndCall = () => {
    setShowNotesDialog(true);
  };

  const handleSaveAndEndSession = () => {
    endSessionMutation.mutate(sessionNotes);
  };

  const canStartSession = () => {
    if (!appointment || !user) return false;
    
    // Check if user has permission to start session
    const hasPermission = 
      appointment.client?.id.toString() === user.id ||
      appointment.practitioner?.id.toString() === user.id ||
  isAdmin(user as any);

    return hasPermission && 
           (appointment.type === 'virtual' || appointment.type === 'telemedicine') &&
           appointment.status !== 'completed' &&
           appointment.status !== 'cancelled';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Appointment Not Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The requested appointment could not be found or you don't have access to it.
            </p>
            <Button onClick={() => router.push('/admin/telemedicine')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Telemedicine
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If call is active, show video call interface
  if (isCallActive && appointment.roomId) {
    return (
      <>
        <VideoCall
          roomId={appointment.roomId}
          isInitiator={appointment.practitioner?.id.toString() === user?.id}
          onCallEnd={handleEndCall}
          userName={user?.name || 'User'}
        />

        {/* Notes dialog */}
        {showNotesDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle>Session Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="notes">Add notes about this session (optional)</Label>
                  <Textarea
                    id="notes"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Enter session notes..."
                    className="mt-2"
                    rows={4}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleSaveAndEndSession}
                    disabled={endSessionMutation.isPending}
                    className="flex-1"
                  >
                    {endSessionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    End Session
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNotesDialog(false)}
                    disabled={endSessionMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  // Show appointment details and join button
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin/telemedicine')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Telemedicine
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{appointment.title}</CardTitle>
                <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(new Date(appointment.date), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {format(new Date(appointment.date), 'h:mm a')}
                  </span>
                </div>
              </div>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {appointment.description && (
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{appointment.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointment.pet && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Patient
                  </h3>
                  <p className="text-sm">{appointment.pet.name}</p>
                </div>
              )}

              {appointment.client && (
                <div>
                  <h3 className="font-medium mb-2">Client</h3>
                  <p className="text-sm">
                    {appointment.client.firstName} {appointment.client.lastName}
                  </p>
                </div>
              )}

              {appointment.practitioner && (
                <div>
                  <h3 className="font-medium mb-2">Practitioner</h3>
                  <p className="text-sm">
                    {appointment.practitioner.firstName} {appointment.practitioner.lastName}
                  </p>
                </div>
              )}
            </div>

            {appointment.notes && (
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Session Notes
                </h3>
                <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                  {appointment.notes}
                </p>
              </div>
            )}

            {appointment.telemedicineStartedAt && (
              <div>
                <h3 className="font-medium mb-2">Session History</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Started: {format(new Date(appointment.telemedicineStartedAt), 'MMM d, yyyy h:mm a')}</p>
                  {appointment.telemedicineEndedAt && (
                    <p>Ended: {format(new Date(appointment.telemedicineEndedAt), 'MMM d, yyyy h:mm a')}</p>
                  )}
                </div>
              </div>
            )}

            {canStartSession() && (
              <div className="pt-4 border-t">
                {appointment.status === 'in_progress' ? (
                  <Button 
                    onClick={() => setIsCallActive(true)}
                    size="lg" 
                    className="w-full"
                  >
                    <Video className="h-5 w-5 mr-2" />
                    Rejoin Call
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStartSession}
                    disabled={startSessionMutation.isPending}
                    size="lg" 
                    className="w-full"
                  >
                    {startSessionMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Video className="h-5 w-5 mr-2" />
                    )}
                    Start Telemedicine Session
                  </Button>
                )}
              </div>
            )}

            {!canStartSession() && appointment.status !== 'completed' && (
              <div className="pt-4 border-t">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      You don't have permission to start this session or the appointment is not ready.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
