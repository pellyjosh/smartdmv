'use client';

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient";
import { 
  PlusCircle, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle,
  Activity,
  RefreshCw,
  FullscreenIcon,
  Loader2
} from "lucide-react";
import {
  getWhiteboardStatusFromAppointment,
  getAppointmentStatusFromWhiteboard,
  shouldAppearOnWhiteboard,
  getAppointmentUrgency,
  getStatusLabel,
  getStatusColor,
  type AppointmentStatus,
  type WhiteboardStatus,
  type UrgencyLevel
} from "@/lib/appointment-workflow";
import { WhiteboardItem, UserRoleEnum, WhiteboardNote } from "@/db/schema";
import { connectWebSocket, sendMessage, registerMessageHandler } from "@/lib/websocket";
import WhiteboardItemCard from "@/components/whiteboard/WhiteboardItemCard";

// Types
interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
  ownerId: number;
}

interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: string;
  durationMinutes: string;
  status: AppointmentStatus;
  petId?: string;
  clientId?: string;
  staffId?: string;
  practitionerId: string;
  practiceId: string;
  createdAt: string;
  updatedAt: string;
  pet?: Pet;
}

// Form schema for creating whiteboard items
const whiteboardItemFormSchema = z.object({
  petId: z.coerce.number({ message: "Please select a pet" }),
  status: z.enum(['triage', 'active', 'completed']).default('triage'),
  urgency: z.enum(['high', 'medium', 'low', 'none']).optional().default('none'),
  notes: z.string().optional(),
  appointmentId: z.coerce.number().optional(),
  position: z.number().default(0),
});

type WhiteboardItemFormValues = z.infer<typeof whiteboardItemFormSchema>;

export default function WhiteboardPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Only get current date on client side to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      return new Date().toISOString().split('T')[0];
    }
    return '';
  });
  const [staffNote, setStaffNote] = useState("");
  const [isClient, setIsClient] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set client flag after hydration
  useEffect(() => {
    setIsClient(true);
    if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  // Get practice ID from user context
  const practiceId = user?.role === 'CLIENT' || user?.role === 'PRACTICE_ADMINISTRATOR' || user?.role === 'VETERINARIAN' || user?.role === 'PRACTICE_MANAGER'
    ? (user as any).practiceId
    : user?.role === 'ADMINISTRATOR' || user?.role === 'SUPER_ADMIN'
    ? (user as any).currentPracticeId
    : null;

  // Check if user has permission to access whiteboard
  const hasAccess = user && user.role !== UserRoleEnum.CLIENT;

  // Fetch whiteboard items for the selected date
  const { data: whiteboardItems, isLoading: isWhiteboardLoading, error: whiteboardError } = useQuery<WhiteboardItem[]>({
    queryKey: ["/api/whiteboard", selectedDate],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/whiteboard");
      
      if (!res.ok) {
        throw new Error(`Failed to fetch whiteboard items: ${res.status}`);
      }
      
      const allItems = await res.json();
      
      // Filter items that are either:
      // 1. Not linked to appointments (always show)
      // 2. Linked to appointments on the selected date
      if (!appointments) return allItems;
      
      const todayAppointmentIds = new Set(
        appointments
          .filter(apt => new Date(apt.date).toISOString().split('T')[0] === selectedDate)
          .map(apt => parseInt(apt.id))
      );
      
      return allItems.filter((item: WhiteboardItem) => 
        !item.appointmentId || todayAppointmentIds.has(item.appointmentId)
      );
    },
    enabled: !!user && !!hasAccess,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch pets
  const { data: pets, isLoading: isPetsLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pets");
      if (!res.ok) {
        throw new Error(`Failed to fetch pets: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!user && !!hasAccess,
  });

  // Fetch appointments for selected date
  const { data: appointments, isLoading: isAppointmentsLoading, error: appointmentsError } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", selectedDate, practiceId],
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (practiceId) {
        params.append('practiceId', practiceId.toString());
      }
      const res = await apiRequest("GET", `/api/appointments?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch appointments: ${res.status}`);
      }
      
      const allAppointments = await res.json();
      
      // Filter appointments for the selected date
      return allAppointments.filter((appointment: Appointment) => {
        const appointmentDate = new Date(appointment.date).toISOString().split('T')[0];
        return appointmentDate === selectedDate;
      });
    },
    enabled: !!user && !!hasAccess && !!practiceId,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch staff notes for the selected date
  const { data: staffNotes, isLoading: isNotesLoading } = useQuery<WhiteboardNote[]>({
    queryKey: ["/api/whiteboard-notes", selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      const res = await apiRequest("GET", `/api/whiteboard-notes?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch staff notes: ${res.status}`);
      }
      
      return res.json();
    },
    enabled: !!user && !!hasAccess,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Create unified items that combine whiteboard items and appointments
  const unifiedItems = React.useMemo(() => {
    const items: (WhiteboardItem & { 
      isAppointment?: boolean; 
      originalAppointmentStatus?: AppointmentStatus;
      pet?: Pet;
    })[] = [];
    
    // Add existing whiteboard items
    if (whiteboardItems) {
      items.push(...whiteboardItems.map(item => ({ 
        ...item, 
        isAppointment: false,
        urgency: (item.urgency || 'none') as UrgencyLevel // Convert null to 'none'
      })));
    }
    
    // Add appointments as whiteboard items if they should appear on whiteboard
    if (appointments) {
      appointments.forEach(appointment => {
        const appointmentStatus = appointment.status as AppointmentStatus;
        
        // Use the workflow function to determine if this appointment should appear
        if (shouldAppearOnWhiteboard(appointmentStatus)) {
          // Check if this appointment is already linked to a whiteboard item
          const alreadyLinked = whiteboardItems?.some(item => item.appointmentId === parseInt(appointment.id));
          
          if (!alreadyLinked && appointment.petId) {
            // Map appointment status to whiteboard status using workflow function
            const whiteboardStatus = getWhiteboardStatusFromAppointment(appointmentStatus);
            
            // Get urgency from appointment details
            const urgency = getAppointmentUrgency(appointment.title, appointment.description);
            
            items.push({
              id: parseInt(appointment.id) + 10000, // Offset to avoid ID conflicts
              petId: parseInt(appointment.petId),
              status: whiteboardStatus,
              urgency,
              notes: appointment.description || null,
              appointmentId: parseInt(appointment.id),
              position: 0,
              practiceId: parseInt(appointment.practiceId),
              assignedToId: appointment.staffId ? parseInt(appointment.staffId) : null,
              location: null,
              createdAt: new Date(appointment.createdAt),
              updatedAt: new Date(appointment.updatedAt),
              isAppointment: true,
              originalAppointmentStatus: appointmentStatus,
              pet: appointment.pet
            });
          }
        }
      });
    }
    
    return items;
  }, [whiteboardItems, appointments]);

  // Create whiteboard item form
  const form = useForm<WhiteboardItemFormValues>({
    resolver: zodResolver(whiteboardItemFormSchema),
    defaultValues: {
      status: "triage",
      urgency: "none",
      notes: "",
      position: 0,
    },
  });

  // Create whiteboard item mutation
    const createWhiteboardItemMutation = useMutation({
    mutationFn: async (data: Partial<WhiteboardItem>) => {
      const res = await apiRequest("POST", "/api/whiteboard", {
        ...data,
        practiceId: practiceId || 0,
        assignedToId: user?.id || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whiteboard", selectedDate] });
      toast({
        title: "Patient added to whiteboard",
        description: "The patient has been successfully added to the triage queue.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateWhiteboardItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WhiteboardItem> }) => {
      const res = await apiRequest("PATCH", `/api/whiteboard/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whiteboard", selectedDate] });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Appointment> }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", selectedDate, practiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/whiteboard", selectedDate] });
    },
  });

  // Update whiteboard item mutation
    const updateItem = async (id: number, updates: Partial<WhiteboardItem>) => {
    try {
      const res = await apiRequest("PATCH", `/api/whiteboard/${id}`, updates);
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/whiteboard", selectedDate] });
      }
    } catch (error) {
      console.error("Error updating whiteboard item:", error);
    }
  };

  // Delete whiteboard item mutation
  const deleteWhiteboardItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whiteboard/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whiteboard", selectedDate] });
      toast({
        title: "Whiteboard item deleted",
        description: "The item has been successfully removed from the whiteboard.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete whiteboard item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create staff note mutation
  const createStaffNoteMutation = useMutation({
    mutationFn: async (data: { note: string; date: string }) => {
      const res = await apiRequest("POST", "/api/whiteboard-notes", data);
      if (!res.ok) {
        throw new Error('Failed to create staff note');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whiteboard-notes", selectedDate] });
      toast({
        title: "Note added",
        description: "Your note has been added to the whiteboard.",
      });
      setStaffNote("");
      
      // Notify other users via WebSocket about the new note
      try {
        sendMessage({
          type: "whiteboard_update",
          action: "note_added",
          practiceId: practiceId,
          date: selectedDate
        });
        console.log('Sent WebSocket message about new staff note');
      } catch (error) {
        console.error('Error sending WebSocket message for staff note:', error);
        // Continue execution - WebSocket errors shouldn't block UI operations
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit whiteboard item form
  const onSubmit = (data: WhiteboardItemFormValues) => {
    // Get next position value
    const nextPosition = unifiedItems && unifiedItems.length > 0
      ? Math.max(...unifiedItems.map(item => item.position)) + 1
      : 0;
    
    createWhiteboardItemMutation.mutate({
      petId: data.petId as number,
      status: data.status as "triage" | "active" | "completed",
      urgency: data.urgency as "high" | "medium" | "low" | "none",
      notes: data.notes as string | undefined,
      appointmentId: data.appointmentId as number | undefined,
      position: nextPosition
    });
  };

  // Add staff note
  const addStaffNote = () => {
    if (!staffNote.trim()) return;
    
    createStaffNoteMutation.mutate({
      note: staffNote,
      date: selectedDate
    });
  };

  // Filter unified items by status
  const triageItems = unifiedItems?.filter(item => item.status === "triage") || [];
  const activeItems = unifiedItems?.filter(item => item.status === "active") || [];
  const completedItems = unifiedItems?.filter(item => item.status === "completed") || [];

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!user || !hasAccess) return;

    let socket = null;
    let unregister = () => {};
    
    try {
      // Create a WebSocket connection (optional feature)
      socket = connectWebSocket();
      
      if (socket) {
        console.log('Whiteboard: WebSocket connection established');
        
        // Register handler for whiteboard updates
        unregister = registerMessageHandler("whiteboard_update", (data) => {
          try {
            if (data && data.practiceId === practiceId) {
              console.log('Whiteboard: Received update from WebSocket');
              // Refresh whiteboard data when updates come in
              queryClient.invalidateQueries({ queryKey: ["/api/whiteboard", selectedDate] });
              queryClient.invalidateQueries({ queryKey: ["/api/appointments", selectedDate, practiceId] });
              queryClient.invalidateQueries({ queryKey: ["/api/whiteboard-notes", selectedDate] });
            }
          } catch (err) {
            console.error('Error handling whiteboard update:', err);
          }
        });
      } else {
        console.log('Whiteboard: WebSocket not available, using polling for updates');
      }
    } catch (error) {
      console.log('Whiteboard: WebSocket connection failed, continuing without real-time updates:', error);
    }
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      try {
        console.log('Whiteboard: Cleaning up WebSocket');
        unregister();
      } catch (err) {
        console.error('Error unregistering whiteboard message handler:', err);
      }
    };
  }, [user, hasAccess, queryClient, selectedDate, practiceId]);

  // Handle item drag events
  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    e.dataTransfer.setData("itemId", itemId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: WhiteboardStatus) => {
    e.preventDefault();
    const itemId = Number(e.dataTransfer.getData("itemId"));
    const item = unifiedItems?.find(i => i.id === itemId);
    
    if (item && item.status !== targetStatus) {
      if (item.isAppointment) {
        // 🔄 BIDIRECTIONAL: For appointment items, update BOTH appointment status AND whiteboard
        const newAppointmentStatus = getAppointmentStatusFromWhiteboard(
          targetStatus, 
          item.originalAppointmentStatus
        );
        
        const realAppointmentId = item.appointmentId || (item.id - 10000);
        
        // Update the appointment status (this will auto-sync to whiteboard via server)
        updateAppointmentMutation.mutate({
          id: realAppointmentId,
          data: { status: newAppointmentStatus }
        });
        
        toast({
          title: "Appointment & Whiteboard Updated",
          description: `Appointment moved to ${targetStatus} stage (${getStatusLabel(newAppointmentStatus)})`,
        });
      } else {
        // For manual whiteboard items (not linked to appointments), just update whiteboard
        updateWhiteboardItemMutation.mutate({
          id: itemId,
          data: { status: targetStatus }
        });
        
        toast({
          title: "Whiteboard Updated",
          description: `Patient moved to ${targetStatus} stage`,
        });
      }
      
      // Notify other users via WebSocket about the change
      try {
        sendMessage({
          type: "whiteboard_update",
          action: "status_change",
          practiceId: practiceId,
          itemId,
          newStatus: targetStatus,
          isAppointment: item.isAppointment || false,
          appointmentId: item.appointmentId,
          newAppointmentStatus: item.isAppointment ? getAppointmentStatusFromWhiteboard(targetStatus, item.originalAppointmentStatus) : null
        });
        console.log('Sent WebSocket message about status change');
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        // Continue execution - WebSocket errors shouldn't block UI operations
      }
    }
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="h-full">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // If user doesn't have access, show access denied message
  if (!hasAccess) {
    return (
      <div className="h-full">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  Only practice staff and administrators can access the digital whiteboard.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex-1 flex flex-col">
        
        {/* Header with Date Selector */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Digital Whiteboard</h1>
              <p className="text-sm text-slate-500">Manage patient flow and appointments</p>
              {(whiteboardError || appointmentsError) && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ Database connectivity issues detected. Some data may not be current.
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-700">Date:</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Today
              </Button>
            </div>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Triage Board */}
            <div 
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200" 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "triage")}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Triage</h2>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Patient
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Patient to Whiteboard</DialogTitle>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="petId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Patient</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(Number(value))}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a patient" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isPetsLoading ? (
                                    <SelectItem value="loading" disabled>Loading patients...</SelectItem>
                                  ) : pets && pets.length > 0 ? (
                                    pets.map((pet) => (
                                      <SelectItem key={pet.id} value={pet.id.toString()}>
                                        {pet.name} ({pet.species})
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="none" disabled>No patients available</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="urgency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Urgency</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select urgency level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="appointmentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Link to Appointment (Optional)</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "no-appointment" ? undefined : value ? Number(value) : undefined)}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an appointment" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isAppointmentsLoading ? (
                                    <SelectItem value="loading" disabled>Loading appointments...</SelectItem>
                                  ) : appointments && appointments.length > 0 ? (
                                    [
                                      <SelectItem key="none" value="no-appointment">No appointment</SelectItem>,
                                      ...appointments
                                        .filter(apt => {
                                          // Only show approved appointments for the selected date
                                          const aptDate = new Date(apt.date).toISOString().split('T')[0];
                                          return apt.status === 'approved' && aptDate === selectedDate;
                                        })
                                        .map((appointment) => (
                                          <SelectItem key={appointment.id} value={appointment.id.toString()}>
                                            {new Date(appointment.date).toLocaleTimeString('en-US', { 
                                              hour: 'numeric', 
                                              minute: '2-digit',
                                              hour12: true 
                                            })} - Pet ID: {appointment.petId}
                                            {appointment.description && ` (${appointment.description.substring(0, 20)}...)`}
                                          </SelectItem>
                                        ))
                                    ]
                                  ) : (
                                    <SelectItem value="none" disabled>No appointments today</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter any notes or information"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createWhiteboardItemMutation.isPending}
                          >
                            {createWhiteboardItemMutation.isPending ? "Adding..." : "Add to Whiteboard"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              
              {isWhiteboardLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : triageItems.length > 0 ? (
                <div className="space-y-3">
                  {triageItems.map((item) => (
                    <WhiteboardItemCard
                      key={item.id}
                      item={item}
                      onDelete={!item.isAppointment ? () => deleteWhiteboardItemMutation.mutate(item.id) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-md">
                  <p className="text-sm text-slate-500">No patients in triage</p>
                  <p className="text-xs text-slate-400 mb-2">
                    {selectedDate !== new Date().toISOString().split('T')[0] 
                      ? `Viewing ${selectedDate}` 
                      : 'Appointments with status "triage" will appear here automatically'
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Patient
                  </Button>
                </div>
              )}
            </div>
            
            {/* Active Patients */}
            <div 
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "active")}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Active Patients</h2>
                <Button size="icon" variant="ghost">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              {isWhiteboardLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : activeItems.length > 0 ? (
                <div className="space-y-3">
                  {activeItems.map((item) => (
                    <WhiteboardItemCard
                      key={item.id}
                      item={item}
                      onDelete={!item.isAppointment ? () => deleteWhiteboardItemMutation.mutate(item.id) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-md">
                  <p className="text-sm text-slate-500">No active patients</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedDate !== new Date().toISOString().split('T')[0] 
                      ? `Viewing ${selectedDate}` 
                      : 'Drag patients here from triage or set appointment status to "active"'
                    }
                  </p>
                </div>
              )}
            </div>
            
            {/* Completed */}
            <div 
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "completed")}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Completed</h2>
                <Button size="icon" variant="ghost">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              {isWhiteboardLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : completedItems.length > 0 ? (
                <div className="space-y-3">
                  {completedItems.map((item) => (
                    <WhiteboardItemCard
                      key={item.id}
                      item={item}
                      onDelete={!item.isAppointment ? () => deleteWhiteboardItemMutation.mutate(item.id) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-md">
                  <p className="text-sm text-slate-500">No completed patients</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedDate !== new Date().toISOString().split('T')[0] 
                      ? `Viewing ${selectedDate}` 
                      : 'Drag patients here when finished or set appointment status to "completed"'
                    }
                  </p>
                </div>
              )}
            </div>
            
            {/* Staff Notes and Info */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Staff Notes</h2>
                <Button size="icon" variant="ghost">
                  <FullscreenIcon className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50 mb-3 min-h-[100px]">
                {isNotesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                    <span className="text-xs text-slate-500 ml-2">Loading notes...</span>
                  </div>
                ) : staffNotes && staffNotes.length > 0 ? (
                  staffNotes.map((note, index) => (
                    <div key={note.id || index} className="flex items-start mb-2 last:mb-0">
                      <span className="text-xs font-medium text-slate-700">{note.author?.name || 'Staff'}:</span>
                      <p className="text-xs text-slate-600 ml-1">{note.note}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-500">No notes for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : selectedDate}</p>
                    <p className="text-xs text-slate-400 mt-1">Add a note below to share with the team</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center mt-2">
                <Input 
                  type="text" 
                  placeholder="Add a note..." 
                  className="text-xs"
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addStaffNote();
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  className="ml-2 text-xs"
                  onClick={addStaffNote}
                  disabled={!staffNote.trim() || createStaffNoteMutation.isPending}
                >
                  {createStaffNoteMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add'
                  )}
                </Button>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Clinic Status</h3>
                <Tabs defaultValue="summary">
                  <TabsList className="w-full">
                    <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                    <TabsTrigger value="appointments" className="flex-1">Appointments</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="mt-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Waiting Room:</span>
                        <span className="font-medium">{triageItems.length} patients</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">In Treatment:</span>
                        <span className="font-medium">{activeItems.length} patients</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Completed {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : 'Selected Date'}:</span>
                        <span className="font-medium">{completedItems.length} patients</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">High Priority:</span>
                        <span className="font-medium">
                          {unifiedItems?.filter(item => item.urgency === "high").length || 0} patients
                        </span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="appointments" className="mt-3">
                    <div className="mb-2 text-xs text-slate-400">
                      Showing {selectedDate === new Date().toISOString().split('T')[0] ? "today's" : selectedDate} appointments
                    </div>
                    {isAppointmentsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                      </div>
                    ) : appointments && appointments.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {appointments.map((appointment) => (
                          <div key={appointment.id} className="text-xs border border-slate-200 rounded-md p-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-slate-700">
                                  {new Date(appointment.date).toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </p>
                                <p className="text-slate-600">
                                  Pet ID: {appointment.petId}
                                </p>
                                {appointment.description && (
                                  <p className="text-slate-500 mt-1 text-xs">
                                    {appointment.description.length > 30 
                                      ? `${appointment.description.substring(0, 30)}...`
                                      : appointment.description
                                    }
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                  appointment.status === 'approved' 
                                    ? 'bg-green-100 text-green-700' 
                                    : appointment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : appointment.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {appointment.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 text-center py-2">
                        <p>No appointments scheduled for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : selectedDate}.</p>
                        <p className="mt-1">
                          <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                            <a href="/appointments">Schedule appointments</a>
                          </Button>
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>
        
      </div>
    </div>
  );
}
