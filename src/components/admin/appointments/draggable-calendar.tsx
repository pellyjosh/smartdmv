import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Appointment, User, Pet } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, GripVertical, Calendar as CalendarIcon, X, AlertCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getPetAvatarColors } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
// import { SimpleCustomFieldSelect } from "@/components/form/simple-custom-field-select";

interface DraggableCalendarProps {
  practiceId: string | undefined;
  userRole: 'CLIENT' | 'PRACTICE_ADMINISTRATOR' | 'ADMINISTRATOR';
  userId: string;
}

// Time slots from 8am to 6pm
const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const hour = i + 8;
  return {
    time: hour < 12 ? `${hour}:00 AM` : hour === 12 ? `${hour}:00 PM` : `${hour - 12}:00 PM`,
    hour,
    label: hour < 12 ? `${hour}am` : hour === 12 ? `12pm` : `${hour - 12}pm`
  };
});

// Days of the week
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Appointment schema
const appointmentSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  type: z.enum(["virtual", "in-person", "surgery", "dental", "vaccination", "checkup", "wellness", "emergency"], 
    { message: "Please select appointment type" }),
  date: z.string().min(1, "Appointment date is required"),
  time: z.string().min(1, "Appointment time is required"),
  duration: z.coerce.number().min(15, { message: "Duration must be at least 15 minutes" }),
  petId: z.string().min(1, { message: "Please select a pet" }),
  practitionerId: z.string({ message: "Please select a practitioner" }),
  practiceId: z.string(),
  notes: z.string().optional(),
  status: z.enum(["completed", "approved", "rejected", "pending"]).default("pending"),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema> & { time: string };

export function DraggableCalendar({ practiceId, userRole, userId }: DraggableCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>(userId);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{ day: string, time: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dragTimeoutRef = useRef<any>(null);

  // Calculate the start and end dates for the week view
  const getWeekDates = () => {
    const currentDay = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, ...
    const startDate = new Date(selectedDate);
    // Adjust so week starts on Monday
    startDate.setDate(selectedDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    return DAYS_OF_WEEK.map((day, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return {
        day,
        date,
        dateString: date.toISOString().split('T')[0]
      };
    });
  };

  const weekDates = getWeekDates();

  // Format date for API query (entire week)
  const startOfWeek = weekDates[0].date.toISOString().split('T')[0];
  const endOfWeek = weekDates[6].date.toISOString().split('T')[0];

  // Query for all practitioners in the practice
  const { data: practitioners = [], isLoading: isLoadingPractitioners } = useQuery({
    queryKey: ["/api/practice-users", practiceId],
    queryFn: async () => {
      const res = await fetch(`/api/practice-users?practiceId=${practiceId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch practitioners");
      return res.json();
    },
  });

  // Query for all appointments in the date range
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["/api/appointments/range", startOfWeek, endOfWeek, selectedPractitioner],
    queryFn: async () => {
      // We can use the date range endpoint once it's implemented
      // For now, we'll fetch by individual dates
      try {
        // Using the date range endpoint
        const res = await fetch(`/api/appointments/by-date-range?start=${startOfWeek}&end=${endOfWeek}&practitionerId=${selectedPractitioner}`, {
          credentials: "include",
        });
        
        if (!res.ok) throw new Error("Failed to fetch appointments by range");
        
        return await res.json();
      } catch (error) {
        console.error("Error fetching appointments by range:", error);
        
        // Fallback - fetch each day individually
        const allAppointments = [];
        for (const { dateString } of weekDates) {
          try {
            const dailyRes = await fetch(`/api/appointments/by-date/${dateString}`, {
              credentials: "include",
            });
            if (dailyRes.ok) {
              const dailyAppointments = await dailyRes.json();
              allAppointments.push(...dailyAppointments);
            }
          } catch (innerError) {
            console.error(`Error fetching appointments for ${dateString}:`, innerError);
          }
        }
        
        // Filter appointments for the selected practitioner
        return allAppointments.filter(appt => appt.practitionerId === selectedPractitioner);
      }
    },
  });

  // Query for all pets to show in pet selection
  const { data: pets = [], isLoading: isLoadingPets } = useQuery({
    queryKey: ["/api/practice/pets", practiceId],
    queryFn: async () => {
      const res = await fetch(`/api/practice/pets/${practiceId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pets");
      return res.json();
    },
  });

  // Initialize the appointment form
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      type: "in-person",
      date: selectedDate.toISOString().split('T')[0],
      time: "09:00",
      duration: 30,
      petId: "",
      practitionerId: selectedPractitioner,
      practiceId: practiceId,
      notes: "",
      status: "scheduled",
    },
  });

  // Setup edit form with similar structure
  const editForm = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      type: "in-person",
      date: selectedDate.toISOString().split('T')[0],
      time: "09:00",
      duration: 30,
      petId: "",
      practitionerId: selectedPractitioner,
      practiceId: practiceId,
      notes: "",
      status: "scheduled",
    },
  });

  // Update the form when selectedDate changes
  useEffect(() => {
    form.setValue("date", selectedDate.toISOString().split('T')[0]);
  }, [selectedDate, form]);

  // Update the form when a practitioner is selected
  useEffect(() => {
    form.setValue("practitionerId", selectedPractitioner);
    editForm.setValue("practitionerId", selectedPractitioner);
  }, [selectedPractitioner, form, editForm]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      try {
        // Combine date and time into ISO string
        const dateTime = new Date(`${data.date}T${data.time}`);
        
        // Create a new object without the time field
        const { time, ...appointmentData } = data;
        
        // Update with the combined date/time
        const finalAppointmentData = {
          ...appointmentData,
          date: dateTime.toISOString(),
          petId: parseInt(appointmentData.petId, 10),
        };
        
        const response = await apiRequest("POST", "/api/appointments", finalAppointmentData);
        return response;
      } catch (error) {
        console.error("Error creating appointment:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/range", startOfWeek, endOfWeek, selectedPractitioner] });
      setIsAddDialogOpen(false);
      toast({
        title: "Appointment scheduled",
        description: "The appointment has been successfully created.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<AppointmentFormValues> }) => {
      try {
        const finalData: { [key: string]: any } = { ...data };

        // If we have both date and time from the form, combine them
        if (finalData.date && finalData.time) {
          const dateTime = new Date(`${finalData.date}T${finalData.time}`);
          finalData.date = dateTime.toISOString();
          delete finalData.time;
        }

        // If petId is a string, parse it to a number for the API
        if (finalData.petId && typeof finalData.petId === 'string') {
          finalData.petId = parseInt(finalData.petId, 10);
        }
        
        console.log(`Sending update data for appointment ${id}:`, finalData);
        
        return await apiRequest("PATCH", `/api/appointments/${id}`, finalData);
      } catch (error) {
        console.error("Error updating appointment:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Get the new appointment date from the update data
      let newDate: Date | null = null;
      if (variables.data.date) {
        if (typeof variables.data.date === 'string') {
          newDate = new Date(variables.data.date);
        }
      }
      
      // Invalidate the general appointment queries
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/range"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/by-date"] });
      
      // If we know the specific date, invalidate that day specifically
      if (newDate) {
        const dateString = newDate.toISOString().split('T')[0];
        console.log("Invalidating specific date:", dateString);
        queryClient.invalidateQueries({ 
          queryKey: ["/api/appointments/by-date", dateString]
        });
        
        // Force a refetch for the new date to ensure it appears
        queryClient.fetchQuery({
          queryKey: ["/api/appointments/by-date", dateString],
          queryFn: async () => {
            const res = await fetch(`/api/appointments/by-date/${dateString}`, {
              credentials: "include",
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            if (!res.ok) throw new Error("Failed to fetch appointments");
            return res.json();
          }
        });
      }
      
      // Refresh the entire week of appointments
      weekDates.forEach(({ dateString }) => {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/appointments/by-date", dateString]
        });
      });
      
      setIsEditDialogOpen(false);
      setEditingAppointment(null);
      toast({
        title: "Appointment updated",
        description: "The appointment has been successfully updated.",
      });
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: (_, id) => {
      // Invalidate both general appointment queries
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/range"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/by-date"] });
      
      // Refresh the entire week of appointments
      weekDates.forEach(({ dateString }) => {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/appointments/by-date", dateString] 
        });
      });
      
      setIsEditDialogOpen(false);
      setEditingAppointment(null);
      toast({
        title: "Appointment deleted",
        description: "The appointment has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle new appointment form submission
  const onSubmit = (data: AppointmentFormValues) => {
    // Submit the appointment
    createAppointmentMutation.mutate(data);
  };

  // Handle edit form submission
  const onEditSubmit = (data: AppointmentFormValues) => {
    if (!editingAppointment) return;
    
    // Submit the updated appointment
    updateAppointmentMutation.mutate({ 
      id: editingAppointment.id,
      data
    });
  };

  // Handle appointment drag start
  const handleDragStart = (appointment: Appointment) => {
    setDraggedAppointment(appointment);
  };

  // Handle appointment drag over a time slot
  const handleDragOver = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    setHoveredTimeSlot({ day, time });
  };

  // Handle dropping an appointment on a time slot
  const handleDrop = (e: React.DragEvent, day: string, timeStr: string) => {
    e.preventDefault();
    setHoveredTimeSlot(null);
    
    if (!draggedAppointment) return;
    
    // Find the day date
    const dayDate = weekDates.find(d => d.day === day)?.date;
    if (!dayDate) return;
    
    // Parse the time (format: "9:00 AM")
    const [hourMinute, ampm] = timeStr.split(' ');
    const [hourStr, minuteStr] = hourMinute.split(':');
    let hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    // Adjust for PM
    if (ampm === 'PM' && hour < 12) {
      hour += 12;
    }
    // Adjust for 12 AM
    if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
    
    // Set the new date and time
    dayDate.setHours(hour, minute, 0, 0);
    
    // Update the appointment
    updateAppointmentMutation.mutate({
      id: draggedAppointment.id,
      data: { date: dayDate.toISOString() }
    });
    
    setDraggedAppointment(null);
  };

  // Handle clicking on an appointment to edit it
  const handleAppointmentClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    
    // Convert ISO date to date and time for the form
    const appointmentDate = new Date(appointment.date);
    const dateString = appointmentDate.toISOString().split('T')[0];
    const timeString = appointmentDate.toTimeString().slice(0, 5); // "HH:MM" format
    
    // Ensure type is one of the valid enum values
    const validAppointmentType = (["virtual", "in-person", "surgery", "dental", "vaccination", "checkup", "wellness", "emergency"].includes(appointment.type)) 
      ? appointment.type as "virtual" | "in-person" | "surgery" | "dental" | "vaccination" | "checkup" | "wellness" | "emergency"
      : "in-person";
    
    // Reset and populate the edit form
    editForm.reset({
      title: appointment.title,
      type: validAppointmentType,
      date: dateString,
      time: timeString,
      duration: appointment.duration,
      petId: String(appointment.petId),
      practitionerId: appointment.practitionerId,
      practiceId: appointment.practiceId,
      notes: appointment.notes || "",
      status: appointment.status,
    });
    
    setIsEditDialogOpen(true);
  };

  // Handle clicking on an empty time slot to add a new appointment
  const handleTimeSlotClick = (day: string, timeStr: string) => {
    // Find the day date
    const dayObj = weekDates.find(d => d.day === day);
    if (!dayObj) return;
    
    // Parse the time
    const [hourMinute, ampm] = timeStr.split(' ');
    const [hourStr, minuteStr] = hourMinute.split(':');
    let hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    // Adjust for PM
    if (ampm === 'PM' && hour < 12) {
      hour += 12;
    }
    // Adjust for 12 AM
    if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
    
    // Create a new date object with the selected day and time
    const newDate = new Date(dayObj.date);
    newDate.setHours(hour, minute, 0, 0);
    
    // Format for the form
    const dateString = newDate.toISOString().split('T')[0];
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Set the form values
    form.reset({
      title: "",
      type: "in-person",
      date: dateString,
      time: timeString,
      duration: 30,
      petId: "",
      practitionerId: selectedPractitioner,
      practiceId: practiceId,
      notes: "",
      status: "scheduled" as const,
    });
    
    // Open the add dialog
    setIsAddDialogOpen(true);
  };

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Delete confirmation handler
  const handleDeleteAppointment = () => {
    if (!editingAppointment) return;
    // Open the confirmation dialog instead of using browser confirm
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm delete action
  const confirmDeleteAppointment = () => {
    if (!editingAppointment) return;
    deleteAppointmentMutation.mutate(editingAppointment.id);
    setIsDeleteDialogOpen(false);
  };

  // Helper function to get appointments for a specific day and time
  const getAppointmentsForTimeSlot = (day: string, timeStr: string) => {
    const dayDate = weekDates.find(d => d.day === day)?.dateString;
    if (!dayDate) return [];
    
    return appointments.filter((appointment: Appointment) => {
      const appointmentDate = new Date(appointment.date);
      const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
      
      // Parse the time slot
      const [hourMinute, ampm] = timeStr.split(' ');
      const [hourStr, minuteStr] = hourMinute.split(':');
      let hour = parseInt(hourStr);
      
      // Adjust for PM
      if (ampm === 'PM' && hour < 12) {
        hour += 12;
      }
      // Adjust for 12 AM
      if (ampm === 'AM' && hour === 12) {
        hour = 0;
      }
      
      // Check if appointment is on this day and starts in this hour
      return (
        appointmentDateStr === dayDate &&
        appointmentDate.getHours() === hour
      );
    });
  };

  // Toggle between next and previous weeks
  const goToNextWeek = () => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(selectedDate.getDate() + 7);
    setSelectedDate(nextWeek);
  };

  const goToPrevWeek = () => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(selectedDate.getDate() - 7);
    setSelectedDate(prevWeek);
  };

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Helper to format date for display
  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const isLoading = isLoadingAppointments || isLoadingPractitioners || isLoadingPets;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 max-w-full overflow-x-auto">
      {/* Header controls */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPrevWeek}>
            ← Prev
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            Next →
          </Button>
          <span className="text-sm font-medium ml-2">
            {formatDateDisplay(weekDates[0].date)} - {formatDateDisplay(weekDates[6].date)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select 
            value={selectedPractitioner} 
            onValueChange={(value) => setSelectedPractitioner(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select practitioner" />
            </SelectTrigger>
            <SelectContent>
              {practitioners.map((practitioner: User) => (
                <SelectItem key={practitioner.id} value={practitioner.id}>
                  {practitioner.name || practitioner.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => {
            form.reset({
              title: "",
              type: "in-person",
              date: selectedDate.toISOString().split('T')[0],
              time: "09:00",
              duration: 30,
              petId: "",
              practitionerId: selectedPractitioner,
              practiceId: practiceId,
              notes: "",
              status: "scheduled" as const,
            });
            setIsAddDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-1" />
            Add Appointment
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="calendar-grid border rounded-lg">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-2 font-medium text-sm text-gray-500 border-r">&nbsp;</div>
            {weekDates.map(({ day, date }) => (
              <div 
                key={day} 
                className={`p-2 font-medium text-sm text-center border-r ${
                  date.toDateString() === new Date().toDateString() ? 'bg-primary-50' : ''
                }`}
              >
                <div>{day}</div>
                <div className="text-xs text-gray-500">{formatDateDisplay(date)}</div>
              </div>
            ))}
          </div>
          
          {/* Time slots */}
          {TIME_SLOTS.map(({ time, label }) => (
            <div key={time} className="grid grid-cols-8 border-b">
              <div className="p-2 text-xs text-right text-gray-500 border-r w-16">
                {time}
              </div>
              
              {DAYS_OF_WEEK.map((day) => {
                const timeSlotAppointments = getAppointmentsForTimeSlot(day, time);
                const hasAppointments = timeSlotAppointments.length > 0;
                const isHovered = hoveredTimeSlot && hoveredTimeSlot.day === day && hoveredTimeSlot.time === time;
                
                return (
                  <div 
                    key={`${day}-${time}`}
                    className={`p-1 border-r min-h-[80px] relative ${
                      isHovered ? 'bg-primary-50' : hasAppointments ? 'bg-primary-50/20' : ''
                    }`}
                    onClick={() => !hasAppointments && handleTimeSlotClick(day, time)}
                    onDragOver={(e) => handleDragOver(e, day, time)}
                    onDrop={(e) => handleDrop(e, day, time)}
                  >
                    {/* Render appointments in this time slot */}
                    {timeSlotAppointments.map((appointment: Appointment) => (
                      <div 
                        key={appointment.id}
                        className={`
                          p-1 mb-1 rounded text-xs cursor-grab relative
                          ${appointment.type === 'virtual' ? 'bg-blue-100 border-l-2 border-blue-500' : 
                            appointment.type === 'surgery' ? 'bg-red-100 border-l-2 border-red-500' : 
                            'bg-green-100 border-l-2 border-green-500'}
                        `}
                        draggable
                        onDragStart={() => handleDragStart(appointment)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppointmentClick(appointment);
                        }}
                      >
                        <div className="font-medium truncate">{appointment.title}</div>
                        <div className="flex items-center justify-between">
                          <span>
                            {new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="bg-white text-xs px-1 rounded">
                            {appointment.duration}m
                          </span>
                        </div>
                        <GripVertical className="h-3 w-3 absolute top-1 right-1 text-gray-400" />
                      </div>
                    ))}
                    
                    {/* Show the add button on empty slots when they're hovered */}
                    {!hasAppointments && isHovered && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary-50/50">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs px-2 py-1 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTimeSlotClick(day, time);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      
      {/* Add Appointment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>
              Create a new appointment in the selected time slot.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Pet Selection */}
              <FormField
                control={form.control}
                name="petId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet</FormLabel>
                    <Select 
                      onValueChange={(value: string) => {
                        field.onChange(value);
                        const pet = pets.find((p: Pet) => String(p.id) === value);
                        if (pet) {
                          form.setValue("title", `Checkup - ${pet.name}`);
                        }
                      }} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a pet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pets.map((pet: Pet) => (
                          <SelectItem key={pet.id} value={String(pet.id)}>
                            <div className="flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                {pet.photoPath ? (
                                  <AvatarImage src={pet.photoPath} alt={pet.name} />
                                ) : (
                                  <AvatarFallback className={`${getPetAvatarColors(pet.name).bg} ${getPetAvatarColors(pet.name).text} text-xs`}>
                                    {pet.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              {pet.name} ({pet.species})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Appointment Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Appointment title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Appointment Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="virtual">Virtual</SelectItem>
                        <SelectItem value="in-person">In-Person</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="dental">Dental</SelectItem>
                        <SelectItem value="vaccination">Vaccination</SelectItem>
                        <SelectItem value="checkup">Checkup</SelectItem>
                        <SelectItem value="wellness">Wellness</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any relevant notes" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAppointmentMutation.isPending}
                >
                  {createAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Appointment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Appointment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              {/* Pet Selection */}
              <FormField
                control={editForm.control}
                name="petId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet</FormLabel>
                    <Select 
                      onValueChange={(value: string) => {
                        field.onChange(value);
                        const pet = pets.find((p: Pet) => String(p.id) === value);
                        if (pet) {
                          editForm.setValue("title", `Checkup - ${pet.name}`);
                        }
                      }} 
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a pet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pets.map((pet: Pet) => (
                          <SelectItem key={pet.id} value={String(pet.id)}>
                            <div className="flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                {pet.photoPath ? (
                                  <AvatarImage src={pet.photoPath} alt={pet.name} />
                                ) : (
                                  <AvatarFallback className={`${getPetAvatarColors(pet.name).bg} ${getPetAvatarColors(pet.name).text} text-xs`}>
                                    {pet.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              {pet.name} ({pet.species})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Appointment Title */}
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Appointment title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Appointment Type */}
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="virtual">Virtual</SelectItem>
                        <SelectItem value="in-person">In-Person</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="dental">Dental</SelectItem>
                        <SelectItem value="vaccination">Vaccination</SelectItem>
                        <SelectItem value="checkup">Checkup</SelectItem>
                        <SelectItem value="wellness">Wellness</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Duration */}
              <FormField
                control={editForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Status */}
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Notes */}
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any relevant notes" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDeleteAppointment}
                  disabled={deleteAppointmentMutation.isPending}
                >
                  {deleteAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
                
                <div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateAppointmentMutation.isPending}
                  >
                    {updateAppointmentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <style>
        {`
          .calendar-grid {
            overflow-x: auto;
          }
        `}
      </style>

      {/* AlertDialog for delete appointment confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              {editingAppointment && (
                <div className="space-y-2">
                  <p>Are you sure you want to cancel this appointment?</p>
                  <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                    <p><strong>Title:</strong> {editingAppointment.title}</p>
                    <p><strong>Date:</strong> {new Date(editingAppointment.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {new Date(editingAppointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>Type:</strong> {editingAppointment.type}</p>
                    {editingAppointment.notes && <p><strong>Notes:</strong> {editingAppointment.notes}</p>}
                  </div>
                  <p className="text-destructive">This action cannot be undone.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAppointmentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Appointment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}