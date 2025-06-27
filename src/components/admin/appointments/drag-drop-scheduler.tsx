import { useState, useEffect, useRef, MouseEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Appointment, Pet, User } from "@/db/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addMinutes, parseISO, isEqual } from "date-fns";
import { Calendar, Clock, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "./appointment-card";
import { DatePicker } from "./date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Time slot interval in minutes
const TIME_SLOT_INTERVAL = 30;

// Start and end hours for the scheduler (24-hour format)
const START_HOUR = 8;
const END_HOUR = 18;

interface DragDropSchedulerProps {
  practiceId: number;
  userRole: string;
  userId: number;
}

export function DragDropScheduler({ practiceId, userRole, userId }: DragDropSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [quickScheduleOpen, setQuickScheduleOpen] = useState(false);
  const timeSlotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Format date for API query
  const formattedDate = selectedDate.toISOString().split('T')[0];

  // Query for appointments on selected date
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["/api/appointments/by-date", formattedDate],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/by-date/${formattedDate}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  // Query for all pets
  const { data: pets = [], isLoading: isLoadingPets } = useQuery({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const res = await fetch(`/api/pets`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pets");
      return res.json();
    },
  });

  // Query for all practitioners in the practice
  const { data: practitioners = [], isLoading: isLoadingPractitioners } = useQuery({
    queryKey: ["/api/practitioners", practiceId],
    queryFn: async () => {
      const res = await fetch(`/api/practitioners?practiceId=${practiceId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch practitioners");
      return res.json();
    },
    enabled: !!practiceId,
  });

  // Mutation for updating appointment time
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, newDateTime }: { id: number; newDateTime: string }) => {
      return await apiRequest("PATCH", `/api/appointments/${id}`, {
        date: newDateTime
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/by-date", formattedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment updated",
        description: "The appointment has been successfully rescheduled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update appointment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Generate all time slots for the selected date
  const generateTimeSlots = () => {
    const slots = [];
    const startTime = new Date(selectedDate);
    startTime.setHours(START_HOUR, 0, 0, 0);
    
    const endTime = new Date(selectedDate);
    endTime.setHours(END_HOUR, 0, 0, 0);
    
    let currentTime = new Date(startTime);
    
    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, TIME_SLOT_INTERVAL);
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Group appointments by time slot
  const appointmentsByTime: Record<string, Appointment[]> = {};
  
  timeSlots.forEach(slot => {
    appointmentsByTime[slot] = [];
  });
  
  appointments.forEach((appointment: Appointment) => {
    const time = format(new Date(appointment.date), 'HH:mm');
    // Find the closest time slot
    const closestSlot = timeSlots.find(slot => slot === time) || timeSlots[0];
    
    if (!appointmentsByTime[closestSlot]) {
      appointmentsByTime[closestSlot] = [];
    }
    appointmentsByTime[closestSlot].push(appointment);
  });

  // Handle drag start
  const handleDragStart = (appointment: Appointment) => {
    setDraggedAppointment(appointment);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    setDragOverSlot(timeSlot);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedAppointment(null);
    setDragOverSlot(null);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    
    if (!draggedAppointment) return;
    
    // Combine date and new time slot
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(hours, minutes, 0, 0);
    
    // Update appointment with new date/time
    updateAppointmentMutation.mutate({
      id: draggedAppointment.id,
      newDateTime: newDateTime.toISOString()
    });
    
    // Reset drag state
    setDraggedAppointment(null);
    setDragOverSlot(null);
  };

  // Navigate to previous/next day
  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Calendar sidebar */}
      <div className="bg-white p-4 rounded-lg shadow-sm md:col-span-1">
        <DatePicker selectedDate={selectedDate} onDateSelect={setSelectedDate} />

        <div className="mt-6">
          <h3 className="font-medium text-lg mb-3">Practitioners</h3>
          <div className="space-y-2">
            {isLoadingPractitioners ? (
              <div className="animate-pulse h-12 bg-slate-100 rounded"></div>
            ) : practitioners.length === 0 ? (
              <p className="text-sm text-slate-500">No practitioners found</p>
            ) : (
              practitioners.map((practitioner: User) => (
                <div 
                  key={practitioner.id} 
                  className="flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer"
                >
                  <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mr-2">
                    {practitioner.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{practitioner.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Drag-Drop Scheduler */}
      <div className="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="font-semibold text-xl">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            
            <Button variant="outline" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule New Appointment</DialogTitle>
              </DialogHeader>
              {/* Form content would go here */}
              <p className="text-center py-4">Appointment form would be displayed here</p>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingAppointments ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Calendar className="h-10 w-10 mx-auto opacity-30 mb-2" />
            <p>No time slots configured.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timeSlots.map((timeSlot) => (
              <div 
                key={timeSlot}
                ref={el => timeSlotRefs.current[timeSlot] = el}
                className={`border rounded-lg p-2 ${
                  dragOverSlot === timeSlot ? "bg-primary-50 border-primary-300" : ""
                }`}
                onDragOver={(e) => handleDragOver(e, timeSlot)}
                onDrop={(e) => handleDrop(e, timeSlot)}
              >
                <div className="text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <Clock className="inline-block h-4 w-4 mr-1" />
                  {timeSlot}
                </div>
                
                <div className="space-y-2">
                  {appointmentsByTime[timeSlot]?.map((appointment) => (
                    <div 
                      key={appointment.id}
                      draggable
                      onDragStart={() => handleDragStart(appointment)}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <AppointmentCard appointment={appointment} pets={pets} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}