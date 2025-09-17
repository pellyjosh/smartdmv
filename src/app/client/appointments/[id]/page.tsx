'use client';

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { ClientHeader } from "@/components/client/ClientHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Video,
  FileText,
  Edit,
  X,
  Check,
  AlertCircle,
  Stethoscope,
  MessageSquare,
  Download,
  PawPrint,
  Navigation
} from "lucide-react";
import { format } from "@/lib/date-utils";
import Link from "next/link";

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const appointmentId = params.id as string;
  
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);

  // Fetch appointment details
  const { 
    data: appointment, 
    isLoading: isAppointmentLoading, 
    error: appointmentError 
  } = useQuery({
    queryKey: [`/api/appointments/${appointmentId}`, appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch appointment details");
      }
      return await res.json();
    },
    enabled: !!appointmentId && user?.role === 'CLIENT',
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel appointment');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been successfully cancelled.",
      });
      setShowCancelDialog(false);
      router.push('/client?tab=appointments');
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isAppointmentLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <ClientHeader 
          title="Appointment Details" 
          showBackButton={true}
          backHref="/client?tab=appointments"
          backLabel="Back to Appointments"
        />
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (appointmentError || !appointment) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <ClientHeader 
          title="Appointment Details" 
          showBackButton={true}
          backHref="/client?tab=appointments"
          backLabel="Back to Appointments"
        />
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium text-base mb-2">Appointment Not Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The appointment you're looking for doesn't exist or you don't have access to view it.
            </p>
            <Button asChild>
              <Link href="/client?tab=appointments">Back to Appointments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.date);
  const isUpcoming = appointment.status === 'scheduled' && appointmentDate > new Date();
  const isPast = appointmentDate < new Date() || appointment.status === 'completed' || appointment.status === 'cancelled';
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'virtual' ? <Video className="h-5 w-5 text-blue-500" /> : <Stethoscope className="h-5 w-5 text-green-500" />;
  };

  // Calculate time until appointment
  const getTimeUntilAppointment = () => {
    if (!isUpcoming) return null;
    
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} away`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} away`;
    } else {
      return 'Starting soon';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <ClientHeader 
        title="Appointment Details"
        subtitle={appointment.title}
        showBackButton={true}
        backHref="/client?tab=appointments"
        backLabel="Back to Appointments"
      />

      {/* Appointment Overview */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                {getTypeIcon(appointment.type)}
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {appointment.title}
                  {getStatusBadge(appointment.status)}
                </h2>
                <p className="text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  {format(appointmentDate, 'EEEE, MMMM d, YYYY')} at {format(appointmentDate, 'h:mm a')}
                </p>
                {isUpcoming && (
                  <p className="text-sm text-blue-600 font-medium">
                    {getTimeUntilAppointment()}
                  </p>
                )}
              </div>
            </div>
            
            {isUpcoming && (
              <div className="flex gap-2">
                {appointment.type === 'virtual' && (
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Video className="h-4 w-4 mr-2" />
                    Join Call
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowRescheduleDialog(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
                <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Type</h4>
                  <p className="flex items-center gap-2 mt-1">
                    {getTypeIcon(appointment.type)}
                    <span className="capitalize">{appointment.type} Appointment</span>
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Duration</h4>
                  <p className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {appointment.duration || 30} minutes
                  </p>
                </div>

                {appointment.petName && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Pet</h4>
                    <p className="flex items-center gap-2 mt-1">
                      <PawPrint className="h-4 w-4 text-muted-foreground" />
                      {appointment.petName}
                    </p>
                  </div>
                )}

                {appointment.doctor && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Veterinarian</h4>
                    <p className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Dr. {appointment.doctor}
                    </p>
                  </div>
                )}
              </div>

              {appointment.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Notes</h4>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{appointment.notes}</p>
                  </div>
                </>
              )}

              {appointment.reason && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Reason for Visit</h4>
                    <p className="text-sm">{appointment.reason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Location/Meeting Details */}
          <Card>
            <CardHeader>
              <CardTitle>
                {appointment.type === 'virtual' ? 'Virtual Meeting Details' : 'Location Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointment.type === 'virtual' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Video Call Instructions</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Ensure you have a stable internet connection</li>
                      <li>• Test your camera and microphone beforehand</li>
                      <li>• Join the call 5 minutes before your appointment time</li>
                      <li>• Have your pet comfortable and accessible for examination</li>
                    </ul>
                  </div>
                  
                  {isUpcoming && (
                    <div className="flex gap-2">
                      <Button>
                        <Video className="h-4 w-4 mr-2" />
                        Test Camera & Microphone
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download Meeting App
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Clinic Address</h4>
                    <p className="flex items-start gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>
                        SmartDVM Veterinary Clinic<br />
                        123 Pet Care Avenue<br />
                        Veterinary District, VD 12345
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Contact</h4>
                    <p className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      (555) 123-PETS
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                    <Button variant="outline">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Clinic
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preparation Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Preparation Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2">Before Your Appointment</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Bring a list of current medications</li>
                    <li>• Note any recent changes in behavior or appetite</li>
                    <li>• Prepare questions you'd like to ask the veterinarian</li>
                    <li>• Bring previous medical records if visiting for the first time</li>
                    {appointment.type === 'in-person' && (
                      <li>• Ensure your pet is comfortable with car travel</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/client/book-appointment">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Book Another Appointment
                </Link>
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Veterinarian
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Download Appointment Info
              </Button>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground mb-2">If you need to make changes or have questions:</p>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">(555) 123-PETS</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Call at least 24 hours in advance for changes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Appointment Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-medium text-amber-900 mb-2">Cancellation Policy</h4>
              <p className="text-sm text-amber-800">
                Please cancel at least 24 hours in advance to avoid cancellation fees. 
                Emergency cancellations are accepted without penalty.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Appointment
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelAppointmentMutation.mutate()}
              disabled={cancelAppointmentMutation.isPending}
            >
              {cancelAppointmentMutation.isPending ? "Cancelling..." : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              To reschedule this appointment, you'll be redirected to the booking page with your current details pre-filled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowRescheduleDialog(false);
              router.push(`/client/book-appointment?reschedule=${appointmentId}`);
            }}>
              Continue to Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
