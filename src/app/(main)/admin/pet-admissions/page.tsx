'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { hasRole } from '@/lib/rbac-helpers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus, X, User, Clipboard, Home, CalendarClock, Edit, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUser } from '@/context/UserContext';
// Types for the admission data
type AdmissionStatus = 'admitted' | 'discharged' | 'hold' | 'isolation';

type Admission = {
  id: number;
  petId: number;
  clientId: number;
  attendingVetId: number;
  reason: string;
  notes: string | null;
  roomId: number | null;
  status: AdmissionStatus;
  admissionDate: string;
  dischargeDate: string | null;
  practiceId: number;
  createdById: number;
  updatedById: number | null;
  createdAt: string;
  updatedAt: string | null;
};

type AdmissionRoom = {
  id: number;
  roomNumber: string;
  type: string;
  capacity: number;
  status: string;
  notes: string | null;
  practiceId: number;
  createdAt: string;
  updatedAt: string | null;
};

type AdmissionNote = {
  id: number;
  admissionId: number;
  note: string;
  authorId: number;
  timestamp: string;
  createdAt: string;
};

type MedicationAdministration = {
  id: number;
  admissionId: number;
  medicationName: string;
  dosage: string;
  administeredById: number;
  administeredAt: string;
  notes: string | null;
  createdAt: string;
};

type Pet = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  ownerId: Text
};

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
};

// Form schemas
const admissionFormSchema = z.object({
  petId: z.string().min(1, { message: "Pet is required" }),
  clientId: z.string().min(1, { message: "Client is required" }),
  practiceId: z.string().min(1, { message: "PricticeId is required" }),
  attendingVetId: z.string().min(1, { message: "Attending veterinarian is required" }),
  reason: z.string().min(1, { message: "Reason for admission is required" }),
  notes: z.string().optional(),
  roomId: z.string().optional(),
  status: z.enum(["admitted", "hold", "isolation"]).default("admitted"),
});

const noteFormSchema = z.object({
  note: z.string().min(1, { message: "Note content is required" }),
});

const medicationFormSchema = z.object({
  medicationName: z.string().min(1, { message: "Medication name is required" }),
  dosage: z.string().min(1, { message: "Dosage is required" }),
  notes: z.string().optional(),
});

const dischargeFormSchema = z.object({
  notes: z.string().optional(),
});

const roomFormSchema = z.object({
  roomNumber: z.string().min(1, { message: "Room number is required" }),
  type: z.string().min(1, { message: "Room type is required" }),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1" }),
  notes: z.string().optional(),
});

// Status badge component
const StatusBadge = ({ status }: { status: AdmissionStatus }) => {
  const getVariant = () => {
    switch (status) {
      case 'admitted': return 'default';
      case 'discharged': return 'secondary';
      case 'hold': return 'outline';  // Changed from 'warning' to 'outline'
      case 'isolation': return 'destructive';
      default: return 'default';
    }
  };

  return <Badge variant={getVariant()}>{status}</Badge>;
};

// Main component
const PetAdmissionPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [addMedicationDialogOpen, setAddMedicationDialogOpen] = useState(false);
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);

  const { userPracticeId } = useUser();

  // Queries
  const { data: admissions = [], isLoading: isLoadingAdmissions, refetch: refetchAdmissions } = useQuery<Admission[]>({
    queryKey: ['/api/admissions'],
    queryFn: async () => { // Added queryFn here
      const res = await apiRequest("GET", "/api/admissions");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch admissions");
      }
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: rooms = [], isLoading: isLoadingRooms, refetch: refetchRooms } = useQuery<AdmissionRoom[]>({
    queryKey: ['/api/admission-rooms'],
    queryFn: async () => { // Added queryFn here
      const res = await apiRequest("GET", "/api/admission-rooms");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch rooms");
      }
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: availableRooms = [], refetch: refetchAvailableRooms } = useQuery<AdmissionRoom[]>({
    queryKey: ['/api/admission-rooms', 'available'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admission-rooms?available=true");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch available rooms");
      }
      return await res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ['/api/pets'],
    queryFn: async () => { // Added queryFn here
      const res = await apiRequest("GET", `/api/pets?practiceId=${userPracticeId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch pets");
      }
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => { 
      const res = await apiRequest("GET", `/api/users?practiceId=${userPracticeId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch users");
      }
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Form setup
  const admissionForm = useForm<z.infer<typeof admissionFormSchema>>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      petId: "",
      clientId: "",
      attendingVetId: "",
      reason: "",
      notes: "",
      roomId: "",
      status: "admitted",
      practiceId: userPracticeId,
    },
  });

  const noteForm = useForm<z.infer<typeof noteFormSchema>>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      note: "",
    },
  });

  const medicationForm = useForm<z.infer<typeof medicationFormSchema>>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      medicationName: "",
      dosage: "",
      notes: "",
    },
  });

  const dischargeForm = useForm<z.infer<typeof dischargeFormSchema>>({
    resolver: zodResolver(dischargeFormSchema),
    defaultValues: {
      notes: "",
    },
  });

  const roomForm = useForm<z.infer<typeof roomFormSchema>>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      roomNumber: "",
      type: "",
      capacity: 1,
      notes: "",
    },
  });

  // Mutations
  const createAdmissionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof admissionFormSchema>) => {
      const res = await apiRequest("POST", "/api/admissions", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create admission");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Admission Created",
        description: "Pet has been admitted",
      });
      setAddRoomDialogOpen(false);
      admissionForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admissions'] });
      // Invalidate the parent key to refetch both all rooms and available rooms
      queryClient.invalidateQueries({ queryKey: ['/api/admission-rooms'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dischargeAdmissionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number, notes?: string }) => {
      const res = await apiRequest("POST", `/api/admissions/${id}/discharge`, { notes });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to discharge pet");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Pet Discharged",
        description: "Pet has been discharged",
      });
      dischargeForm.reset();
      setDischargeDialogOpen(false);
      setSelectedAdmission(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admissions'] });
      // Invalidate the parent key to refetch both all rooms and available rooms
      queryClient.invalidateQueries({ queryKey: ['/api/admission-rooms'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ admissionId, note }: { admissionId: number, note: string }) => {
      const res = await apiRequest("POST", `/api/admissions/${admissionId}/notes`, { note });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add note");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Note Added",
        description: "Note has been added",
      });
      noteForm.reset();
      setAddNoteDialogOpen(false);
      // Invalidate specific admission notes query if implemented, otherwise general admissions
      if (selectedAdmission) {
        queryClient.invalidateQueries({ queryKey: [`/api/admissions/${selectedAdmission.id}/notes`] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMedicationMutation = useMutation({
    mutationFn: async ({ admissionId, medicationName, dosage, notes }: { admissionId: number, medicationName: string, dosage: string, notes?: string }) => {
      const res = await apiRequest("POST", `/api/admissions/${admissionId}/medications`, { medicationName, dosage, notes });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add medication");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Medication Recorded",
        description: "Medication administration has been recorded",
      });
      medicationForm.reset();
      setAddMedicationDialogOpen(false);
      // Invalidate specific admission medications query if implemented, otherwise general admissions
      if (selectedAdmission) {
        queryClient.invalidateQueries({ queryKey: [`/api/admissions/${selectedAdmission.id}/medications`] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: z.infer<typeof roomFormSchema>) => {
      const payload = { ...data, practiceId: userPracticeId };
      const res = await apiRequest("POST", "/api/admission-rooms", payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create room");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Room Created",
        description: "Room has been created",
      });
      roomForm.reset();
      setAddRoomDialogOpen(false);
      refetchRooms(); // Explicitly refetch all rooms
    refetchAvailableRooms(); 
      queryClient.invalidateQueries({ queryKey: ['/api/admission-rooms'] }); // This will invalidate both room queries
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const onAdmissionSubmit = (data: z.infer<typeof admissionFormSchema>) => {
    // Convert string IDs to numbers for the mutation
    createAdmissionMutation.mutate(data);
  };

  const onDischargeSubmit = (data: z.infer<typeof dischargeFormSchema>) => {
    if (selectedAdmission) {
      dischargeAdmissionMutation.mutate({ id: selectedAdmission.id, notes: data.notes });
    }
  };

  const onNoteSubmit = (data: z.infer<typeof noteFormSchema>) => {
    if (selectedAdmission) {
      addNoteMutation.mutate({ admissionId: selectedAdmission.id, note: data.note }); // Ensure note is string
    }
  };

  const onMedicationSubmit = (data: z.infer<typeof medicationFormSchema>) => {
    if (selectedAdmission) {
      addMedicationMutation.mutate({ 
        admissionId: selectedAdmission.id, // Ensure admissionId is number
        medicationName: data.medicationName, 
        dosage: data.dosage, 
        notes: data.notes 
      });
    }
  };

  const onRoomSubmit = (data: z.infer<typeof roomFormSchema>) => {
    // Convert capacity to number for the mutation
    const numericData = { ...data, capacity: Number(data.capacity) };
    createRoomMutation.mutate(numericData);
  };

  const handleDischargeClick = (admission: Admission) => {
    setSelectedAdmission(admission);
    setDischargeDialogOpen(true);
  };

  const handleAddNoteClick = (admission: Admission) => {
    setSelectedAdmission(admission);
    setAddNoteDialogOpen(true);
  };

  const handleAddMedicationClick = (admission: Admission) => {
    setSelectedAdmission(admission);
    setAddMedicationDialogOpen(true);
  };

  // Filter admissions by status for active tab
  const filteredAdmissions = activeTab === "active" 
    ? admissions.filter(a => ['admitted', 'hold', 'isolation'].includes(a.status))
    : admissions.filter(a => a.status === 'discharged'); // Ensure 'discharged' is correctly filtered

  // Component
  return (
    <div className="container py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Pet Admissions</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Admit New Pet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Admit New Pet</DialogTitle>
              <DialogDescription>
                Enter the details to admit a pet to the hospital.
              </DialogDescription>
            </DialogHeader>
            <Form {...admissionForm}>
              <form onSubmit={admissionForm.handleSubmit(onAdmissionSubmit)} className="space-y-4">
                <FormField
                  control={admissionForm.control}
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value); // Update the petId field
                          const selectedPet = pets.find(pet => pet.id.toString() === value);
                          if (selectedPet) {
                            admissionForm.setValue("clientId", selectedPet.ownerId.toString(), {
                              shouldValidate: true,
                            });
                          } else {
                            admissionForm.setValue("clientId", "", { shouldValidate: true });
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pets.map(pet => (
                            <SelectItem key={pet.id} value={pet.id.toString()}>
                              {pet.name} ({pet.species})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={admissionForm.control}
                  name="clientId"
                  render={({ field }) => {
                    const selectedClient = users.find(user => user.id.toString() === field.value);
                    return (
                      <FormItem>
                        <FormLabel>Client (Owner)</FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            value={
                              selectedClient
                                ? `${selectedClient.username} (${selectedClient.email})`
                                : ''
                            }
                            disabled
                            className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={admissionForm.control}
                  name="attendingVetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attending Veterinarian</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a veterinarian" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users
                            .filter(u => hasRole(u as any, 'VETERINARIAN'))
                            .map(user => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.username} ({user.email})
                              </SelectItem>
                            ))}
                          {users.filter(u => hasRole(u as any, 'VETERINARIAN')).length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No veterinarian records found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={admissionForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Admission</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter the reason for admission" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={admissionForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter any additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={admissionForm.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Assignment</FormLabel>
                      <div className="flex space-x-2">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Assign a room (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableRooms.map(room => (
                              <SelectItem key={room.id} value={room.id.toString()}>
                                {room.roomNumber} - {room.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setAddRoomDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Optional - leave blank for pets without room assignment.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={admissionForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admitted">Regular Admission</SelectItem>
                          <SelectItem value="hold">Hold for Observation</SelectItem>
                          <SelectItem value="isolation">Isolation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit">
                    {createAdmissionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Admit Pet
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={addRoomDialogOpen} onOpenChange={setAddRoomDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
              <DialogDescription>
                Create a new room for admissions.
              </DialogDescription>
            </DialogHeader>
            <Form {...roomForm}>
              <form onSubmit={roomForm.handleSubmit(onRoomSubmit)} className="space-y-4">
                <FormField
                  control={roomForm.control}
                  name="roomNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Number</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., A-101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={roomForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="isolation">Isolation</SelectItem>
                          <SelectItem value="icu">ICU</SelectItem>
                          <SelectItem value="recovery">Recovery</SelectItem>
                          <SelectItem value="surgery">Surgery Prep</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={roomForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={roomForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any special notes about this room" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit">
                    {createRoomMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Room
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4">
          <Tabs defaultValue="active" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">Active Admissions</TabsTrigger>
              <TabsTrigger value="discharged">Discharged</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-4">
          {isLoadingAdmissions ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No {activeTab === "active" ? "active" : "discharged"} admissions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Admitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmissions.map(admission => {
                  const pet = pets.find(p => p.id === admission.petId);
                  const room = rooms.find(r => r.id === admission.roomId);
                  
                  return (
                    <TableRow key={admission.id}>
                      <TableCell>{admission.id}</TableCell>
                      <TableCell>{pet?.name || 'Unknown'}</TableCell>
                      <TableCell className="max-w-xs truncate">{admission.reason}</TableCell>
                      <TableCell><StatusBadge status={admission.status} /></TableCell>
                      <TableCell>{room?.roomNumber || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(admission.admissionDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {activeTab === "active" && (
                            <>
                              <Button 
                                size="icon" 
                                variant="outline"
                                onClick={() => handleAddNoteClick(admission)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="outline"
                                onClick={() => handleAddMedicationClick(admission)}
                              >
                                <Clipboard className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="outline"
                                onClick={() => handleDischargeClick(admission)}
                              >
                                <Home className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="w-full gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Admission Rooms</CardTitle>
            <CardDescription>Available and occupied rooms for inpatient care</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRooms ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No rooms have been added yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map(room => (
                    <TableRow key={room.id}>
                      <TableCell>{room.roomNumber}</TableCell>
                      <TableCell>{room.type}</TableCell>
                      <TableCell>{room.capacity}</TableCell>
                      <TableCell>
                        <Badge variant={room.status === "available" ? "default" : "secondary"}>
                          {room.status === "available" ? "Available" : "Occupied"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t px-6 py-4">
            <Button variant="outline" onClick={() => setAddRoomDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Discharge Dialog */}
      <AlertDialog open={dischargeDialogOpen} onOpenChange={setDischargeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discharge Pet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discharge this pet? This will free up any assigned room and update records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...dischargeForm}>
            <form onSubmit={dischargeForm.handleSubmit(onDischargeSubmit)}>
              <FormField
                control={dischargeForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Discharge Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter any discharge notes or follow-up instructions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="submit">
                    {dischargeAdmissionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Discharge
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Treatment Note</DialogTitle>
            <DialogDescription>
              Add a note about the pet's condition, treatment, or any observations.
            </DialogDescription>
          </DialogHeader>
          <Form {...noteForm}>
            <form onSubmit={noteForm.handleSubmit(onNoteSubmit)}>
              <FormField
                control={noteForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter your note" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button type="submit">
                  {addNoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Note
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Medication Dialog */}
      <Dialog open={addMedicationDialogOpen} onOpenChange={setAddMedicationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Medication Administration</DialogTitle>
            <DialogDescription>
              Record details of medication given to the pet.
            </DialogDescription>
          </DialogHeader>
          <Form {...medicationForm}>
            <form onSubmit={medicationForm.handleSubmit(onMedicationSubmit)}>
              <FormField
                control={medicationForm.control}
                name="medicationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medication Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Amoxicillin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={medicationForm.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., 250mg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={medicationForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional notes about the administration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button type="submit">
                  {addMedicationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Medication
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PetAdmissionPage;
