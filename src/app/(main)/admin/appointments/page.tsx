'use client';

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation"; 
// Navigation components are now provided by AppLayout
import { DatePicker } from "@/components/admin/appointments/date-picker";
import { AppointmentCard } from "@/components/admin/appointments/appointment-card";
import { EnhancedCalendar } from "@/components/admin/appointments/enhanced-calendar";
import { DraggableCalendar } from "@/components/admin/appointments/draggable-calendar";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarPlus, Layout, LayoutGrid } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/context/UserContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Appointment, appointmentStatusEnum, UserRoleEnum } from "@/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";

// Form schema for creating appointments
const appointmentFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  type: z.string({ message: "Please select appointment type" }),
  date: z.date({ message: "Please select a valid date" }),
  duration: z.coerce.number().min(15, { message: "Duration must be at least 15 minutes" }),
  petId: z.string({ message: "Please select a pet" }),
  practitionerId: z.string({ message: "Please select a practitioner" }),
  practiceId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(appointmentStatusEnum).default("pending"),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, userPracticeId } = useUser();
  const { toast } = useToast();
  // Next.js Router hooks instead of Wouter
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      title: "",
      type: "virtual",
      date: new Date(),
      duration: 30,
      notes: "",
    },
  });

  // Parse URL search parameters for Next.js
  useEffect(() => {
    // searchParams is a URLSearchParams object in Next.js
    if (searchParams) {
      // Check if view=schedule parameter exists to auto-open the scheduling dialog
      if (searchParams.get('view') === 'schedule') {
        setIsDialogOpen(true);
      }

      // Check if petId parameter exists to pre-select a pet
      const petId = searchParams.get('petId');
      if (petId) {
      
          form.setValue('petId', petId, { shouldValidate: true });
          console.log("Pre-selected pet ID from URL:", petId);
      }

      // Check if type parameter exists to pre-select appointment type
      const appointmentType = searchParams.get('type');
      if (appointmentType) {
        form.setValue('type', appointmentType, { shouldValidate: true });
        console.log("Pre-selected appointment type from URL:", appointmentType);
        // Auto-open dialog if type is specified
        setIsDialogOpen(true);
      }
    }
  }, [searchParams, form]); // Depend on searchParams object itself

  // Fetch appointments
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", ],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/appointments?practiceId=${userPracticeId}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  // Fetch pets for dropdown
  const { data: pets, isLoading: isLoadingPets } = useQuery<any[]>({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const res = await fetch(`/api/practice/pets/${userPracticeId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pets");
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch staff for dropdown (only when needed)
  const { data: staff, isLoading: isLoadingStaff } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch(`/api/users?practiceId=${userPracticeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch staff");
      }
      return res.json();
    },
    enabled: !!user && user.role === UserRoleEnum.PRACTICE_ADMINISTRATOR,
  });

  // Filter appointments for the selected date
  const filteredAppointments = useMemo(() => {
    return appointments?.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return (
        appointmentDate.getDate() === selectedDate.getDate() &&
        appointmentDate.getMonth() === selectedDate.getMonth() &&
        appointmentDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [appointments, selectedDate]);

  // Sort appointments by time
  const sortedAppointments = useMemo(() => {
    return filteredAppointments?.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [filteredAppointments]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      console.log("Sending appointment data to API:", data);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText}`);
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment created",
        description: "The appointment has been successfully created.",
      });
      setIsDialogOpen(false);
      form.reset();
      router.replace(pathname);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentFormValues) => {
    const formattedData = { ...data };

    if (user && userPracticeId) {
      formattedData.practiceId = userPracticeId;
    }
    console.log("user practice id", userPracticeId)
    console.log("createAppointmentMutation - data:", formattedData)

    if (formattedData.petId) {
      formattedData.petId = formattedData.petId;
      console.log("formattedData.petId", formattedData.petId)
    }

    if (formattedData.practitionerId) {
      formattedData.practitionerId = formattedData.practitionerId;
    }

    if (!formattedData.status) {
      formattedData.status = "pending";
    }

    console.log("Submitting appointment data:", formattedData);
    createAppointmentMutation.mutate(formattedData);
  };

  useEffect(() => {
    if (!pets) return;

    const updateTitle = () => {
      const currentPetId = form.getValues('petId');
      const currentType = form.getValues('type');

      if (currentPetId && currentType) {
        const selectedPet = pets.find(pet => pet.id === Number(currentPetId));
        if (selectedPet) {
          const capitalizedType = currentType.charAt(0).toUpperCase() + currentType.slice(1);
          const title = `${capitalizedType} - ${selectedPet.name}`;
          form.setValue('title', title, { shouldValidate: true });
        }
      }
    };

    // Initial update
    updateTitle();

    // Set up the watch for future changes
    const subscription = form.watch((value, { name }) => {
      if (name === 'petId' || name === 'type') {
        updateTitle();
      }
    });

    return () => subscription.unsubscribe();
  }, [form, pets]);

  const isLoading = isLoadingAppointments || isLoadingPets || isLoadingStaff;

  return (
    <div className="h-full">
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Appointments</h1>
          <Button onClick={() => setIsDialogOpen(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>

        {user && (
          <Tabs defaultValue="calendar" className="mb-6">
            <TabsList className="mb-4">
              <TabsTrigger value="calendar">
                <Layout className="h-4 w-4 mr-2" />
                Grid View
              </TabsTrigger>
              <TabsTrigger value="draggable">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Week View (Drag & Drop)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-0">
              <Card>
                <CardContent className="pt-4">
                  <EnhancedCalendar
                    practiceId={userPracticeId}
                    userRole={
                      user.role === "CLIENT" ||
                      user.role === "PRACTICE_ADMINISTRATOR" ||
                      user.role === "ADMINISTRATOR"
                        ? user.role
                        : "CLIENT"
                    }
                    userId={user.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="draggable" className="mt-0">
              <Card>
                <CardContent className="p-0 overflow-visible">
                  <DraggableCalendar
                    practiceId={userPracticeId}
                    userRole={
                      user.role === "CLIENT" ||
                      user.role === "PRACTICE_ADMINISTRATOR" ||
                      user.role === "ADMINISTRATOR"
                        ? user.role
                        : "CLIENT"
                    }
                    userId={user.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Traditional Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create New Appointment</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select appointment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="virtual">Virtual Consultation</SelectItem>
                            <SelectItem value="telemedicine">Telemedicine</SelectItem>
                            <SelectItem value="in-person">In-Person Visit</SelectItem>
                            <SelectItem value="wellness">Wellness Check</SelectItem>
                            <SelectItem value="surgery">Surgery</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="follow-up">Follow-up</SelectItem>
                            <SelectItem value="vaccination">Vaccination</SelectItem>
                            <SelectItem value="dental">Dental Care</SelectItem>
                            <SelectItem value="grooming">Grooming</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                            onChange={(e) => {
                              field.onChange(e.target.value ? new Date(e.target.value) : null);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="petId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet</FormLabel>
                        <FormControl>
                          <Combobox
                            options={
                              isLoadingPets 
                                ? [{ value: "loading", label: "Loading pets..." }]
                                : pets && pets.length > 0 
                                  ? pets.map((pet) => ({
                                      value: pet.id.toString(),
                                      label: `${pet.name} (${pet.species}${pet.breed ? ` - ${pet.breed}` : ''})`
                                    }))
                                  : [{ value: "none", label: "No pets available" }]
                            }
                            value={field.value}
                            onSelect={field.onChange}
                            placeholder="Search and select pet..."
                            emptyText="No pets found."
                            disabled={isLoadingPets || !pets || pets.length === 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="practitionerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Practitioner</FormLabel>
                      <FormControl>
                        <Combobox
                          options={
                            user && user.role === UserRoleEnum.CLIENT 
                              ? [{ value: user.id, label: "Default Practitioner" }]
                              : isLoadingStaff 
                                ? [{ value: "loading", label: "Loading staff..." }]
                                : staff && staff.length > 0 
                                  ? staff.map((s) => ({
                                      value: s.id,
                                      label: `${s.name}${s.email ? ` (${s.email})` : ''}`
                                    }))
                                  : user?.id 
                                    ? [{ value: user.id, label: user.name || "Current User" }]
                                    : [{ value: "none", label: "No practitioners available" }]
                          }
                          value={field.value}
                          onSelect={field.onChange}
                          placeholder="Search and select practitioner..."
                          emptyText="No practitioners found."
                          disabled={isLoadingStaff || (user?.role === UserRoleEnum.CLIENT && !user?.id)}
                        />
                      </FormControl>
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
                          placeholder="Enter any additional notes or information"
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
                    disabled={createAppointmentMutation.isPending}
                  >
                    {createAppointmentMutation.isPending ?
                      (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>) : "Create Appointment"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Legacy view - Hidden when using Enhanced Calendar */}
        <div className="hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>

            <Button size="sm" className="flex items-center" onClick={() => setIsDialogOpen(true)}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </div>

          {sortedAppointments && sortedAppointments.length > 0 ? (
            <div className="space-y-3">
              {sortedAppointments.map((appointment) => (
                <AppointmentCard


                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-slate-100 p-3 mb-3">
                  <CalendarPlus className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No appointments for this day</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4 text-center">
                  There are no appointments scheduled for this date.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>Schedule Appointment</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}