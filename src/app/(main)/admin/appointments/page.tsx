"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
// Navigation components are now provided by AppLayout
import { DatePicker } from "@/components/admin/appointments/date-picker";
import { AppointmentCard } from "@/components/admin/appointments/appointment-card";
import { EnhancedCalendar } from "@/components/admin/appointments/enhanced-calendar";
import { DraggableCalendar } from "@/components/admin/appointments/draggable-calendar";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CalendarPlus,
  Layout,
  LayoutGrid,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/context/UserContext";
import {
  isPracticeAdministrator,
  isVeterinarian,
  isAdmin,
  hasRole,
} from "@/lib/rbac-helpers";
import { RequirePermission, PermissionButton } from "@/lib/rbac/components";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { appointmentStatusEnum } from "@/db/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineAppointments } from "@/hooks/offline/appointments";
import type { Appointment } from "@/hooks/offline/appointments/use-offline-appointments";
import { Badge } from "@/components/ui/badge";
import { SimpleCustomFieldSelect } from "@/components/form/simple-custom-field-select";

// Form schema for creating appointments
const appointmentFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  type: z.string({ message: "Please select appointment type" }),
  date: z.date({ message: "Please select a valid date" }),
  duration: z.coerce
    .number()
    .min(15, { message: "Duration must be at least 15 minutes" }),
  petId: z.string({ message: "Please select a pet" }),
  practitionerId: z
    .string()
    .min(1, { message: "Please select a practitioner" }),
  practiceId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(appointmentStatusEnum).default("pending"),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, userPracticeId } = useUser();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  // Keep a ref to the current network status to avoid closure issues
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Next.js Router hooks instead of Wouter
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Offline hook for fallback when network goes down
  const offlineAppointments = useOfflineAppointments();

  // Online query for appointments
  const {
    data: appointments,
    isLoading: isLoadingAppointments,
    refetch,
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: !!user && !!userPracticeId && isOnline,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/appointments?practiceId=${userPracticeId}`
      );
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  // Create appointment mutation with networkMode: 'always'
  const createAppointmentMutation = useMutation({
    networkMode: "always", // Execute even when offline is detected
    mutationFn: async (data: AppointmentFormValues) => {
      console.log("[Appointment Mutation] Starting mutation");
      console.log(
        "[Appointment Mutation] isOnlineRef.current:",
        isOnlineRef.current
      );
      console.log("[Appointment Mutation] navigator.onLine:", navigator.onLine);

      // Check current network status using ref to avoid stale closure
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;
      console.log(
        "[Appointment Mutation] currentNetworkStatus:",
        currentNetworkStatus
      );

      if (!currentNetworkStatus) {
        console.log("[Appointment Mutation] Using OFFLINE path");
        // Find the selected pet to get clientId
        const selectedPet = pets?.find(
          (p: any) => String(p.id) === String(data.petId)
        );
        const clientId = selectedPet?.clientId || selectedPet?.ownerId || null;
        console.log("[Appointment Mutation] Selected pet:", selectedPet);
        console.log("[Appointment Mutation] Client ID:", clientId);

        // Use offline hook
        const offlineData: Omit<Appointment, "id"> = {
          title: data.title,
          type: data.type,
          date:
            data.date instanceof Date
              ? data.date.toISOString()
              : String(data.date),
          durationMinutes: data.duration,
          petId: Number(data.petId),
          clientId: clientId ? Number(clientId) : null,
          practitionerId: data.practitionerId
            ? Number(data.practitionerId)
            : null,
          practiceId: data.practiceId ? Number(data.practiceId) : undefined,
          notes: data.notes || null,
          status: data.status || "pending",
        };
        console.log(
          "[Appointment Mutation] Calling offline createAppointment with:",
          offlineData
        );
        const result = await offlineAppointments.createAppointment(offlineData);
        console.log(
          "[Appointment Mutation] Offline createAppointment result:",
          result
        );
        return result;
      }

      console.log("[Appointment Mutation] Using ONLINE path");
      // Online path
      const transformedData = {
        title: data.title,
        type: data.type,
        date: data.date,
        durationMinutes: data.duration.toString(),
        petId: data.petId,
        practitionerId: data.practitionerId,
        practiceId: data.practiceId,
        notes: data.notes,
        status: data.status || "pending",
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const fetchPromise = fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
        credentials: "include",
      });

      const res = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as Response;

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
        description: isOnlineRef.current
          ? "The appointment has been successfully created."
          : "The appointment will be synced when you're back online.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get sync status from offline hook
  const pendingCount = offlineAppointments.pendingCount;
  const errorCount = offlineAppointments.errorCount;
  const syncNow = offlineAppointments.syncNow;

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      title: "",
      type: "virtual",
      date: new Date(),
      duration: 30,
      notes: "",
      practitionerId: "",
    },
  });

  // Parse URL search parameters for Next.js
  useEffect(() => {
    // searchParams is a URLSearchParams object in Next.js
    if (searchParams) {
      // Check if view=schedule parameter exists to auto-open the scheduling dialog
      if (searchParams.get("view") === "schedule") {
        setIsDialogOpen(true);
      }

      // Check if petId parameter exists to pre-select a pet
      const petId = searchParams.get("petId");
      if (petId) {
        form.setValue("petId", petId, { shouldValidate: true });
        console.log("Pre-selected pet ID from URL:", petId);
      }

      // Check if type parameter exists to pre-select appointment type
      const appointmentType = searchParams.get("type");
      if (appointmentType) {
        form.setValue("type", appointmentType, { shouldValidate: true });
        console.log("Pre-selected appointment type from URL:", appointmentType);
        // Auto-open dialog if type is specified
        setIsDialogOpen(true);
      }
    }
  }, [searchParams, form]); // Depend on searchParams object itself

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
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
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
    enabled: !!user && isPracticeAdministrator(user as any),
  });

  // Filter appointments for the selected date
  const filteredAppointments = useMemo(() => {
    return appointments?.filter((appointment: Appointment) => {
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
    return filteredAppointments?.sort((a: Appointment, b: Appointment) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [filteredAppointments]);

  // Handle appointment submission
  const onSubmit = async (data: AppointmentFormValues) => {
    console.log("[onSubmit] Starting submission");
    console.log("[onSubmit] Form data:", data);
    console.log("[onSubmit] isOnline:", isOnline);
    console.log("[onSubmit] isOnlineRef.current:", isOnlineRef.current);

    const formattedData = { ...data };

    if (user && userPracticeId) {
      formattedData.practiceId = userPracticeId;
    }

    if (!formattedData.status) {
      formattedData.status = "pending";
    }

    try {
      setIsSubmitting(true);
      console.log("[onSubmit] Calling mutateAsync with:", formattedData);
      const result = await createAppointmentMutation.mutateAsync(formattedData);
      console.log("[onSubmit] Mutation result:", result);
      setIsDialogOpen(false);
      form.reset();
      router.replace(pathname);
    } catch (error) {
      // Error already handled by the mutation
      console.error("[onSubmit] Failed to create appointment:", error);
    } finally {
      console.log("[onSubmit] Finally block - setting isSubmitting to false");
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!pets) return;

    const updateTitle = () => {
      const currentPetId = form.getValues("petId");
      const currentType = form.getValues("type");

      if (currentPetId && currentType) {
        const selectedPet = pets.find((pet) => pet.id === Number(currentPetId));
        if (selectedPet) {
          const capitalizedType =
            currentType.charAt(0).toUpperCase() + currentType.slice(1);
          const title = `${capitalizedType} - ${selectedPet.name}`;
          form.setValue("title", title, { shouldValidate: true });
        }
      }
    };

    // Initial update
    updateTitle();

    // Set up the watch for future changes
    const subscription = form.watch((value, { name }) => {
      if (name === "petId" || name === "type") {
        updateTitle();
      }
    });

    return () => subscription.unsubscribe();
  }, [form, pets]);

  // Auto-select practitioner when list or user changes and field empty
  useEffect(() => {
    const current = form.getValues("practitionerId");
    if (current) return;
    if (staff && staff.length === 1) {
      form.setValue("practitionerId", staff[0].id.toString(), {
        shouldValidate: true,
      });
      return;
    }
    if (user && hasRole(user as any, "CLIENT")) {
      form.setValue("practitionerId", user.id.toString(), {
        shouldValidate: true,
      });
      return;
    }
    if (user?.id && staff && staff.some((s: any) => s.id === user.id)) {
      form.setValue("practitionerId", user.id.toString(), {
        shouldValidate: true,
      });
    }
  }, [staff, user, form]);

  const isLoading = isLoadingAppointments || isLoadingPets || isLoadingStaff;

  return (
    <RequirePermission resource={"appointments" as any} action={"READ" as any}>
      <div className="h-full">
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Appointments</h1>

              {/* Network Status & Sync Indicator */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Badge variant="outline" className="gap-1.5">
                    <Wifi className="h-3 w-3 text-green-600" />
                    <span className="text-xs">Online</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5">
                    <WifiOff className="h-3 w-3 text-orange-600" />
                    <span className="text-xs">Offline Mode</span>
                  </Badge>
                )}

                {!isOnline && pendingCount > 0 && (
                  <Badge variant="secondary" className="gap-1.5">
                    <span className="text-xs">{pendingCount} pending sync</span>
                  </Badge>
                )}

                {!isOnline && errorCount > 0 && (
                  <Badge variant="destructive" className="gap-1.5">
                    <span className="text-xs">{errorCount} sync errors</span>
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Manual Sync Button (only show when offline with pending changes) */}
              {!isOnline && pendingCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncNow()}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </Button>
              )}

              <PermissionButton
                resource={"appointments" as any}
                action={"CREATE" as any}
                className="inline-flex items-center"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                <span onClick={() => setIsDialogOpen(true)}>
                  New Appointment
                </span>
              </PermissionButton>
            </div>
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
                        (user &&
                        (hasRole(user as any, "CLIENT") ||
                          isPracticeAdministrator(user as any) ||
                          isAdmin(user as any))
                          ? (user.role as
                              | "CLIENT"
                              | "PRACTICE_ADMINISTRATOR"
                              | "ADMINISTRATOR")
                          : "CLIENT") as
                          | "CLIENT"
                          | "PRACTICE_ADMINISTRATOR"
                          | "ADMINISTRATOR"
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
                        (user &&
                        (hasRole(user as any, "CLIENT") ||
                          isPracticeAdministrator(user as any) ||
                          isAdmin(user as any))
                          ? (user.role as
                              | "CLIENT"
                              | "PRACTICE_ADMINISTRATOR"
                              | "ADMINISTRATOR")
                          : "CLIENT") as
                          | "CLIENT"
                          | "PRACTICE_ADMINISTRATOR"
                          | "ADMINISTRATOR"
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
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 pt-4"
                >
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
                          <FormControl>
                            <SimpleCustomFieldSelect
                              name="type"
                              groupKey="types"
                              categoryName="Appointments"
                              createIfNotExists
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select appointment type"
                              fallbackOptions={[
                                {
                                  value: "virtual",
                                  label: "Virtual (Telemedicine)",
                                },
                                { value: "in-person", label: "In-Person" },
                                { value: "surgery", label: "Surgery" },
                                { value: "dental", label: "Dental" },
                                { value: "vaccination", label: "Vaccination" },
                                { value: "checkup", label: "Checkup" },
                                { value: "wellness", label: "Wellness" },
                                { value: "emergency", label: "Emergency" },
                              ]}
                            />
                          </FormControl>
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
                              value={
                                field.value
                                  ? new Date(field.value)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              onChange={(e) => {
                                field.onChange(
                                  e.target.value
                                    ? new Date(e.target.value)
                                    : null
                                );
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
                                  ? [
                                      {
                                        value: "loading",
                                        label: "Loading pets...",
                                      },
                                    ]
                                  : pets && pets.length > 0
                                  ? pets.map((pet) => ({
                                      value: pet.id.toString(),
                                      label: `${pet.name} (${pet.species}${
                                        pet.breed ? ` - ${pet.breed}` : ""
                                      })`,
                                    }))
                                  : [
                                      {
                                        value: "none",
                                        label: "No pets available",
                                      },
                                    ]
                              }
                              value={field.value}
                              onSelect={field.onChange}
                              placeholder="Search and select pet..."
                              emptyText="No pets found."
                              disabled={
                                isLoadingPets || !pets || pets.length === 0
                              }
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
                              user && hasRole(user as any, "CLIENT")
                                ? [
                                    {
                                      value: user.id.toString(),
                                      label: "Default Practitioner",
                                    },
                                  ]
                                : isLoadingStaff
                                ? [
                                    {
                                      value: "loading",
                                      label: "Loading staff...",
                                    },
                                  ]
                                : staff && staff.length > 0
                                ? staff.map((s) => ({
                                    value: s.id.toString(),
                                    label: `${s.name}${
                                      s.email ? ` (${s.email})` : ""
                                    }`,
                                  }))
                                : user?.id
                                ? [
                                    {
                                      value: user.id.toString(),
                                      label: user.name || "Current User",
                                    },
                                  ]
                                : [
                                    {
                                      value: "none",
                                      label: "No practitioners available",
                                    },
                                  ]
                            }
                            value={field.value?.toString()}
                            onSelect={(val) => {
                              const cleaned =
                                val === "none" || val === "loading" ? "" : val;
                              field.onChange(cleaned);
                              // Immediately re-validate to clear error if selection is valid
                              setTimeout(
                                () => form.trigger("practitionerId"),
                                0
                              );
                            }}
                            placeholder="Search and select practitioner..."
                            emptyText="No practitioners found."
                            disabled={
                              isLoadingStaff ||
                              (hasRole(user as any, "CLIENT") && !user?.id)
                            }
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
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          {" "}
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Creating...
                        </>
                      ) : (
                        "Create Appointment"
                      )}
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
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>

              <Button
                size="sm"
                className="flex items-center"
                onClick={() => setIsDialogOpen(true)}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </div>

            {sortedAppointments && sortedAppointments.length > 0 ? (
              <div className="space-y-3">
                {sortedAppointments.map((appointment: Appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    {...({ appointment } as any)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <div className="rounded-full bg-slate-100 p-3 mb-3">
                    <CalendarPlus className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">
                    No appointments for this day
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 mb-4 text-center">
                    There are no appointments scheduled for this date.
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    Schedule Appointment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </RequirePermission>
  );
}
