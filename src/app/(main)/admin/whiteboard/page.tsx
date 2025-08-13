'use client';
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
// Navigation components are now provided by AppLayout
import { TriageItem } from "@/components/whiteboard/triage-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { connectWebSocket, sendMessage, registerMessageHandler } from "@/lib/websocket";
import { Loader2, PlusCircle, RefreshCw, FullscreenIcon } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WhiteboardItem, Pet, UserRoleEnum, Appointment } from "@/db/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form schema for creating whiteboard items
const whiteboardItemFormSchema = z.object({
  petId: z.coerce.number({ message: "Please select a pet" }),
  status: z.enum(['triage', 'active', 'completed', 'pending_pickup', 'in_treatment']).default('triage'),
  urgency: z.enum(['high', 'medium', 'low', 'none']).optional().default('none'),
  notes: z.string().optional(),
  appointmentId: z.coerce.number().optional(),
  position: z.number().default(0),
});

type WhiteboardItemFormValues = z.infer<typeof whiteboardItemFormSchema>;

export default function WhiteboardPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [staffNote, setStaffNote] = useState("");
  const [staffNotes, setStaffNotes] = useState<Array<{ author: string; note: string }>>([
    { author: "Dr. Wilson", note: "Luna needs follow-up bloodwork after today's visit." },
    { author: "Nurse Amy", note: "Max's vaccines are ready for today's appointment." }
  ]);
  const { user } = useUser();
  const { toast } = useToast();

  // Get practice ID from user context
  const practiceId = user?.role === 'CLIENT' || user?.role === 'PRACTICE_ADMINISTRATOR' || user?.role === 'VETERINARIAN' || user?.role === 'PRACTICE_MANAGER'
    ? (user as any).practiceId
    : user?.role === 'ADMINISTRATOR' || user?.role === 'SUPER_ADMIN'
    ? (user as any).currentPracticeId
    : null;

  // Check if user has permission to access whiteboard
  const hasAccess = user && user.role !== UserRoleEnum.CLIENT;

  // Fetch whiteboard items
  const { data: whiteboardItems, isLoading: isWhiteboardLoading } = useQuery<WhiteboardItem[]>({
    queryKey: ["/api/whiteboard"],
    enabled: !!user && !!hasAccess,
  });

  // Fetch pets
  const { data: pets, isLoading: isPetsLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
    enabled: !!user && !!hasAccess,
  });

  // Fetch today's appointments
  const { data: appointments, isLoading: isAppointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", "today", practiceId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams({ date: today });
      if (practiceId) {
        params.append('practiceId', practiceId.toString());
      }
      const res = await apiRequest("GET", `/api/appointments?${params.toString()}`);
      return await res.json();
    },
    enabled: !!user && !!hasAccess && !!practiceId,
  });

  // Create unified items that combine whiteboard items and appointments
  const unifiedItems = React.useMemo(() => {
    const items: (WhiteboardItem & { isAppointment?: boolean })[] = [];
    
    // Add existing whiteboard items
    if (whiteboardItems) {
      items.push(...whiteboardItems.map(item => ({ ...item, isAppointment: false })));
    }
    
    // Add appointments as whiteboard items if they have a status that matches whiteboard workflow
    if (appointments) {
      appointments.forEach(appointment => {
        const appointmentStatus = appointment.status as string;
        if (['triage', 'active', 'completed', 'pending_pickup', 'in_treatment'].includes(appointmentStatus)) {
          // Check if this appointment is already linked to a whiteboard item
          const alreadyLinked = whiteboardItems?.some(item => item.appointmentId === parseInt(appointment.id));
          
          if (!alreadyLinked && appointment.petId) {
            items.push({
              id: parseInt(appointment.id) + 10000, // Offset to avoid ID conflicts
              petId: parseInt(appointment.petId),
              status: appointmentStatus as "triage" | "active" | "completed" | "pending_pickup" | "in_treatment",
              urgency: 'medium' as const, // Default urgency for appointments
              notes: appointment.description || null,
              appointmentId: parseInt(appointment.id),
              position: 0,
              practiceId: parseInt(appointment.practiceId),
              createdById: appointment.staffId ? parseInt(appointment.staffId) : 0,
              createdAt: appointment.createdAt,
              updatedAt: appointment.updatedAt,
              isAppointment: true
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
        createdById: user?.id || 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-items"] });
    },
  });

  const updateWhiteboardItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WhiteboardItem> }) => {
      const res = await apiRequest("PATCH", `/api/whiteboard/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-items"] });
    },
  });

  // Update whiteboard item mutation
    const updateItem = async (id: number, updates: Partial<WhiteboardItem>) => {
    try {
      const res = await apiRequest("PATCH", `/api/whiteboard/${id}`, updates);
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["whiteboard-items"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/whiteboard"] });
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

  // Submit whiteboard item form
  const onSubmit = (data: WhiteboardItemFormValues) => {
    // Get next position value
    const nextPosition = whiteboardItems && whiteboardItems.length > 0
      ? Math.max(...whiteboardItems.map(item => item.position)) + 1
      : 0;
    
    createWhiteboardItemMutation.mutate({
      petId: data.petId as number,
      status: data.status as "triage" | "active" | "completed" | "pending_pickup" | "in_treatment",
      urgency: data.urgency as "high" | "medium" | "low" | "none",
      notes: data.notes as string | undefined,
      appointmentId: data.appointmentId as number | undefined,
      position: nextPosition
    });
  };

  // Add staff note
  const addStaffNote = () => {
    if (!staffNote.trim()) return;
    
    setStaffNotes([
      ...staffNotes,
      { author: user?.name || "Staff", note: staffNote }
    ]);
    setStaffNote("");
    
    // In a real app, you'd send this note to the server
    toast({
      title: "Note added",
      description: "Your note has been added to the whiteboard.",
    });
  };

  // Filter whiteboard items by status
  const triageItems = whiteboardItems?.filter(item => item.status === "triage") || [];
  const activeItems = whiteboardItems?.filter(item => item.status === "active") || [];
  const completedItems = whiteboardItems?.filter(item => item.status === "completed") || [];

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!user || !hasAccess) return;

    let socket = null;
    let unregister = () => {};
    
    try {
      // Create a WebSocket connection
      socket = connectWebSocket();
      
      if (socket) {
        console.log('Whiteboard: WebSocket connection established');
        
        // Register handler for whiteboard updates
        unregister = registerMessageHandler("whiteboard_update", (data) => {
          try {
            if (data && data.practiceId === practiceId) {
              console.log('Whiteboard: Received update from WebSocket');
              // Refresh whiteboard data when updates come in
              queryClient.invalidateQueries({ queryKey: ["/api/whiteboard"] });
            }
          } catch (err) {
            console.error('Error handling whiteboard update:', err);
          }
        });
      }
    } catch (error) {
      console.error('Error setting up WebSocket for whiteboard:', error);
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
  }, [user, hasAccess, queryClient]);

  // Handle item drag events
  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    e.dataTransfer.setData("itemId", itemId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const itemId = Number(e.dataTransfer.getData("itemId"));
    const item = whiteboardItems?.find(i => i.id === itemId);
    
    if (item && item.status !== targetStatus) {
      updateWhiteboardItemMutation.mutate({
        id: itemId,
        data: { status: targetStatus as "triage" | "active" | "completed" | "pending_pickup" | "in_treatment" }
      });
      
      // Notify other users via WebSocket
      try {
        sendMessage({
          type: "whiteboard_update",
          action: "status_change",
          practiceId: practiceId,
          itemId,
          newStatus: targetStatus
        });
        console.log('Sent WebSocket message about status change');
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        // Continue execution - WebSocket errors shouldn't block UI operations
      }
    }
  };

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
                                onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
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
                                      <SelectItem key="none" value="">No appointment</SelectItem>,
                                      ...appointments
                                        .filter(apt => apt.status === 'approved')
                                        .map((appointment) => (
                                          <SelectItem key={appointment.id} value={appointment.id.toString()}>
                                            {new Date(appointment.date).toLocaleTimeString('en-US', { 
                                              hour: 'numeric', 
                                              minute: '2-digit',
                                              hour12: true 
                                            })} - Pet ID: {appointment.petId}
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
                    <TriageItem
                      key={item.id}
                      item={item}
                      pet={pets?.find(p => parseInt(p.id) === item.petId)}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onUpdate={(data) => updateWhiteboardItemMutation.mutate({ id: item.id, data })}
                      onDelete={() => deleteWhiteboardItemMutation.mutate(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-md">
                  <p className="text-sm text-slate-500">No patients in triage</p>
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
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : activeItems.length > 0 ? (
                <div className="space-y-3">
                  {activeItems.map((item) => (
                    <TriageItem
                      key={item.id}
                      item={item}
                      pet={pets?.find(p => parseInt(p.id) === item.petId)}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onUpdate={(data) => updateWhiteboardItemMutation.mutate({ id: item.id, data })}
                      onDelete={() => deleteWhiteboardItemMutation.mutate(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-md">
                  <p className="text-sm text-slate-500">No active patients</p>
                  <p className="text-xs text-slate-400 mt-1">Drag patients here from triage</p>
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
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : completedItems.length > 0 ? (
                <div className="space-y-3">
                  {completedItems.map((item) => (
                    <TriageItem
                      key={item.id}
                      item={item}
                      pet={pets?.find(p => parseInt(p.id) === item.petId)}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onUpdate={(data) => updateWhiteboardItemMutation.mutate({ id: item.id, data })}
                      onDelete={() => deleteWhiteboardItemMutation.mutate(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-md">
                  <p className="text-sm text-slate-500">No completed patients</p>
                  <p className="text-xs text-slate-400 mt-1">Drag patients here when finished</p>
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
              
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50 mb-3">
                {staffNotes.map((note, index) => (
                  <div key={index} className="flex items-start mb-2 last:mb-0">
                    <span className="text-xs font-medium text-slate-700">{note.author}:</span>
                    <p className="text-xs text-slate-600 ml-1">{note.note}</p>
                  </div>
                ))}
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
                  disabled={!staffNote.trim()}
                >
                  Add
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
                        <span className="text-slate-500">Completed Today:</span>
                        <span className="font-medium">{completedItems.length} patients</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">High Priority:</span>
                        <span className="font-medium">
                          {whiteboardItems?.filter(item => item.urgency === "high").length || 0} patients
                        </span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="appointments" className="mt-3">
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
                        <p>No appointments scheduled for today.</p>
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
