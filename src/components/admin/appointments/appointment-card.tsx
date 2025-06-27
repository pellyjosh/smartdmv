import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Appointment, Pet, User } from "@/db/schema";
import { Video, User2, CalendarClock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [pet, setPet] = useState<Pet | null>(null);
  const [practitioner, setPractitioner] = useState<User | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch pet details
  useEffect(() => {
    const fetchPetDetails = async () => {
      try {
        const res = await fetch(`/api/pets/${appointment.petId}`, {
          credentials: "include",
        });
        
        if (res.ok) {
          const petData = await res.json();
          setPet(petData);
        }
      } catch (error) {
        console.error("Error fetching pet details:", error);
      }
    };
    
    fetchPetDetails();
  }, [appointment.petId]);
  
  // Handle rescheduling mutation
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async (data: { date: string }) => {
      return await apiRequest("PATCH", `/api/appointments/${appointment.id}`, {
        date: data.date,
        status: "scheduled"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setIsRescheduleDialogOpen(false);
      toast({
        title: "Appointment rescheduled",
        description: "The appointment has been successfully rescheduled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rescheduling failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle cancellation mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/appointments/${appointment.id}`, {
        status: "cancelled"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment cancelled",
        description: "The appointment has been cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle rescheduling form submission
  const handleReschedule = () => {
    if (!rescheduleDate) {
      toast({
        title: "Please select a date",
        description: "You need to select a new date for the appointment.",
        variant: "destructive",
      });
      return;
    }
    
    rescheduleAppointmentMutation.mutate({ date: new Date(rescheduleDate).toISOString() });
  };
  
  // Handle cancellation
  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      cancelAppointmentMutation.mutate();
    }
  };
  
  const appointmentDate = new Date(appointment.date);
  const isUpcoming = appointmentDate > new Date();
  const isCancelled = appointment.status === "cancelled";
  const isCompleted = appointment.status === "completed";
  
  // Generate appointment status badge styling
  const getStatusStyles = () => {
    if (isCancelled) return "bg-red-100 text-red-700";
    if (isCompleted) return "bg-green-100 text-green-700";
    return appointment.type === "virtual" ? "bg-primary-100 text-primary-700" : "bg-amber-100 text-amber-700";
  };
  
  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm 
      ${isCancelled ? "border-l-4 border-red-500" : 
        isCompleted ? "border-l-4 border-green-500" : 
        appointment.type === "virtual" ? "border-l-4 border-primary-500" : "border-l-4 border-amber-500"} 
      hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center
            ${isCancelled ? "bg-red-100" : 
              isCompleted ? "bg-green-100" : 
              appointment.type === "virtual" ? "bg-primary-100" : "bg-amber-100"}`}
          >
            {isCancelled ? (
              <AlertCircle className={`h-5 w-5 ${isCancelled ? "text-red-500" : ""}`} />
            ) : appointment.type === "virtual" ? (
              <Video className={`h-5 w-5 ${isCompleted ? "text-green-500" : "text-primary-500"}`} />
            ) : (
              <User2 className={`h-5 w-5 ${isCompleted ? "text-green-500" : "text-amber-500"}`} />
            )}
          </div>
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-900">
              {isCancelled ? (
                <span className="line-through">{appointment.title}</span>
              ) : (
                appointment.title
              )}
            </p>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyles()}`}>
              {appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center mt-1">
            <span className="text-sm text-slate-700">
              {pet ? `${pet.name} (${pet.species})` : `Pet ID: ${appointment.petId}`}
            </span>
            <span className="text-xs text-slate-500 mx-2">•</span>
            <span className="text-sm text-slate-700">
              {isCancelled ? "Cancelled" : isCompleted ? "Completed" : "Scheduled"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            {!isCancelled && (
              <div className="flex space-x-2">
                {isUpcoming && !isCompleted && (
                  <>
                    <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CalendarClock className="h-3 w-3 mr-1" />
                          Reschedule
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reschedule Appointment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <p className="text-sm text-slate-500">
                              Current appointment time:
                            </p>
                            <p className="font-medium">
                              {appointmentDate.toLocaleDateString()} at {appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <label htmlFor="new-date" className="text-sm font-medium text-slate-700">
                              Select new date and time
                            </label>
                            <input
                              id="new-date"
                              type="datetime-local"
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              min={new Date().toISOString().slice(0, 16)}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsRescheduleDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleReschedule}
                              disabled={rescheduleAppointmentMutation.isPending || !rescheduleDate}
                            >
                              {rescheduleAppointmentMutation.isPending ? "Rescheduling..." : "Confirm"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCancel}
                      disabled={cancelAppointmentMutation.isPending}
                    >
                      {cancelAppointmentMutation.isPending ? "Cancelling..." : "Cancel"}
                    </Button>
                  </>
                )}
                
                {appointment.type === "virtual" && isUpcoming && !isCancelled && !isCompleted && (
                  <Button 
                    size="sm"
                    onClick={() => window.location.href = `/telemedicine/${appointment.id}`}
                  >
                    <Video className="h-3 w-3 mr-1" />
                    Join Call
                  </Button>
                )}
              </div>
            )}
            <span className="text-xs text-slate-500">{appointment.notes || "No notes"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
