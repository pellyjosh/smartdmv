"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  ArrowLeft,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ClientHeader } from "@/components/client/ClientHeader";
import VideoCall from "@/components/telemedicine/VideoCall";
import { useQuery } from "@tanstack/react-query";

export default function ClientVideoCallPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "waiting" | "connecting" | "connected" | "ended"
  >("waiting");

  // Fetch appointment details for this video call
  const { data: appointment, isLoading: isLoadingAppointment } = useQuery({
    queryKey: ["/api/appointments/room", roomId],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/room/${roomId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Appointment not found");
        }
        throw new Error("Failed to fetch appointment");
      }
      return response.json();
    },
    enabled: !!user && !!roomId,
  });

  const handleJoinCall = () => {
    setIsInCall(true);
    setCallStatus("connecting");
  };

  const handleEndCall = () => {
    setIsInCall(false);
    setCallStatus("ended");
    toast({
      title: "Call Ended",
      description: "The video consultation has ended.",
    });

    // Navigate back to appointments
    setTimeout(() => {
      router.push("/client?tab=appointments");
    }, 2000);
  };

  const handleCallStatusChange = (status: string) => {
    if (status === "connected") {
      setCallStatus("connected");
    } else if (status === "disconnected") {
      setCallStatus("ended");
    }
  };

  if (!user || user.role !== "CLIENT") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Access denied. Client login required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Invalid video call room ID.</p>
            <Button asChild className="mt-4">
              <Link href="/client">Back to Portal</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {!isInCall && (
        <ClientHeader
          title="Video Consultation"
          subtitle="Connect with your veterinarian"
          showBackButton={true}
          backHref="/client?tab=appointments"
          backLabel="Back to Appointments"
        />
      )}

      {isInCall ? (
        <div className="h-screen -mt-6 -mx-4">
          <VideoCall
            roomId={roomId}
            isInitiator={false}
            onCallEnd={handleEndCall}
            userName={user.name || "Client"}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Consultation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAppointment ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : appointment ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Subject
                      </h4>
                      <p>{appointment.title}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Status
                      </h4>
                      <Badge
                        variant={
                          appointment.status === "pending"
                            ? "outline"
                            : appointment.status === "approved"
                            ? "default"
                            : appointment.status === "in_progress"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {appointment.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    {appointment.practitioner && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Veterinarian
                        </h4>
                        <p>Dr. {appointment.practitioner.name}</p>
                      </div>
                    )}
                    {appointment.pet && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Pet
                        </h4>
                        <p>
                          {appointment.pet.name} ({appointment.pet.species})
                        </p>
                      </div>
                    )}
                  </div>

                  {appointment.description && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Description
                      </h4>
                      <p className="text-sm whitespace-pre-wrap">
                        {appointment.description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Appointment details not found or access denied.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Status and Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Call Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center">
                  <div
                    className={cn(
                      "inline-flex items-center px-3 py-2 rounded-full text-sm font-medium",
                      callStatus === "waiting" &&
                        "bg-yellow-100 text-yellow-800",
                      callStatus === "connecting" &&
                        "bg-blue-100 text-blue-800",
                      callStatus === "connected" &&
                        "bg-green-100 text-green-800",
                      callStatus === "ended" && "bg-gray-100 text-gray-800"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        callStatus === "waiting" && "bg-yellow-500",
                        callStatus === "connecting" &&
                          "bg-blue-500 animate-pulse",
                        callStatus === "connected" && "bg-green-500",
                        callStatus === "ended" && "bg-gray-500"
                      )}
                    />
                    {callStatus === "waiting" && "Waiting for veterinarian"}
                    {callStatus === "connecting" && "Connecting..."}
                    {callStatus === "connected" && "Connected"}
                    {callStatus === "ended" && "Call ended"}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    {callStatus === "waiting" && (
                      <p>
                        Your video consultation request has been sent. The
                        veterinarian will join shortly.
                      </p>
                    )}
                    {callStatus === "connecting" && (
                      <p>Establishing connection...</p>
                    )}
                    {callStatus === "connected" && (
                      <p>You are now connected with the veterinarian.</p>
                    )}
                    {callStatus === "ended" && (
                      <p>
                        The consultation has ended. You will be redirected
                        shortly.
                      </p>
                    )}
                  </div>

                  {callStatus === "waiting" && (
                    <div className="flex justify-center gap-4">
                      <Button onClick={handleJoinCall} size="lg">
                        <Video className="h-4 w-4 mr-2" />
                        Join Video Call
                      </Button>
                    </div>
                  )}

                  {callStatus === "ended" && (
                    <div className="flex justify-center gap-4">
                      <Button asChild variant="outline">
                        <Link href="/client?tab=appointments">
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back to Appointments
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pre-call Instructions */}
          {callStatus === "waiting" && (
            <Card>
              <CardHeader>
                <CardTitle>Before You Join</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">
                      Technical Requirements:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Ensure you have a stable internet connection</li>
                      <li>Allow camera and microphone access when prompted</li>
                      <li>Use a quiet, well-lit location</li>
                      <li>
                        Have your pet ready if this consultation is about them
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">During the Call:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>
                        Speak clearly and position your pet in view if needed
                      </li>
                      <li>Prepare any questions you want to ask</li>
                      <li>
                        Have any relevant documents or photos ready to share
                      </li>
                      <li>Take notes during the consultation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
