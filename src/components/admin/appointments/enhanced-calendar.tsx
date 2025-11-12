import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "./date-picker";
import { Appointment, Pet } from "@/db/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  Video,
  MapPin,
  AlertCircle,
  Plus,
  PawPrint,
} from "lucide-react";
import { getPetAvatarColors } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineAppointments } from "@/hooks/offline/appointments/use-offline-appointments";
// import { useCustomFields } from "@/hooks/use-custom-fields";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
// import { insertAppointmentSchema } from "@shared/schema";
// import { SimpleCustomFieldSelect } from "@/components/form/simple-custom-field-select";

// Debug component for custom fields
// Debug component removed

interface EnhancedCalendarProps {
  practiceId: string | undefined;
  userRole: "CLIENT" | "PRACTICE_ADMINISTRATOR" | "ADMINISTRATOR";
  userId: string;
}

export function EnhancedCalendar({
  practiceId,
  userRole,
  userId,
}: EnhancedCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [quickScheduleOpen, setQuickScheduleOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<Appointment | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();

  // Offline appointments hook for offline support
  const { createAppointment: createOfflineAppointment } =
    useOfflineAppointments();

  // Format date for API query
  const formattedDate = selectedDate.toISOString().split("T")[0];

  // Query for appointments on selected date
  // Only refetch and retry when online
  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ["/api/appointments/by-date", formattedDate, practiceId],
    queryFn: async () => {
      // Include practiceId and optional client filtering parameters
      const queryParams = new URLSearchParams();
      if (practiceId) {
        queryParams.append("practiceId", practiceId);
      }

      // Here we could add clientId filtering if needed
      // if (clientId) queryParams.append('clientId', clientId.toString());
      const res = await fetch(
        `/api/appointments/by-date/${formattedDate}?${queryParams.toString()}`,
        {
          credentials: "include",
          // Prevent browser caching
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const data = await res.json();
      console.log(`Fetched ${data.length} appointments for ${formattedDate}`);
      return data;
    },
    // Only auto-refresh when online
    refetchInterval: isOnline ? 5000 : false,
    refetchOnWindowFocus: isOnline,
    // Disable retries when offline to prevent continuous 503 errors
    retry: isOnline ? 3 : false,
    // Don't throw errors in render, handle gracefully
    throwOnError: false,
  });

  // Debug: fetch and log appointments for September 2025 (for troubleshooting calendar dots)
  // This runs only in non-production environments.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    (async () => {
      try {
        const year = 2025;
        const month = 9; // September (1-based for readability)
        // We'll fetch appointments for each day in September 2025 and aggregate
        const septStart = new Date(year, 8, 1).toISOString().split("T")[0];
        const septEnd = new Date(year, 8, 30).toISOString().split("T")[0];

        // If there is an API endpoint for range, use it; otherwise fetch day-by-day.
        // Try range endpoint first
        try {
          const res = await fetch(
            `/api/appointments?start=${septStart}&end=${septEnd}&practiceId=${
              practiceId || ""
            }`,
            { credentials: "include" }
          );
          if (res.ok) {
            const data = await res.json();
            const byDate: Record<string, any[]> = {};
            data.forEach((a: any) => {
              const d = new Date(a.date).toISOString().split("T")[0];
              byDate[d] = byDate[d] || [];
              byDate[d].push(a);
            });
            // eslint-disable-next-line no-console
            console.log(
              "[enhanced-calendar] September 2025 appointments (range):",
              byDate
            );
            return;
          }
        } catch (e) {
          // ignore and fallback to per-day
        }

        // Fallback: fetch each day
        const byDate: Record<string, any[]> = {};
        for (let d = 1; d <= 30; d++) {
          const dateStr = new Date(year, 8, d).toISOString().split("T")[0];
          try {
            const res = await fetch(
              `/api/appointments/by-date/${dateStr}?practiceId=${
                practiceId || ""
              }`,
              { credentials: "include" }
            );
            if (!res.ok) continue;
            const data = await res.json();
            if (data && data.length > 0) byDate[dateStr] = data;
          } catch (e) {
            // ignore individual day failures
          }
        }
        // eslint-disable-next-line no-console
        console.log(
          "[enhanced-calendar] September 2025 appointments (per-day):",
          byDate
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[enhanced-calendar] Error fetching September 2025 appointments:",
          err
        );
      }
    })();
  }, [practiceId]);

  // Compute and fetch appointments for the currently selected month and expose
  // a Set of ISO date strings so the DatePicker can mark days correctly.
  const [datesWithAppointments, setDatesWithAppointments] = useState<
    Set<string>
  >(new Set());
  // Track the visible month inside the DatePicker. Initialize to selectedDate's month.
  const [visibleMonth, setVisibleMonth] = useState<{
    year: number;
    month: number;
  }>({
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth(),
  });

  useEffect(() => {
    // Don't fetch when offline to prevent 503 errors
    if (!isOnline) {
      setDatesWithAppointments(new Set());
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const year = visibleMonth.year;
        const month = visibleMonth.month; // 0-based
        const start = new Date(year, month, 1).toISOString().split("T")[0];
        const end = new Date(year, month + 1, 0).toISOString().split("T")[0];

        // Use only the range endpoint for real-time month data.
        try {
          const res = await fetch(
            `/api/appointments?start=${start}&end=${end}&practiceId=${
              practiceId || ""
            }`,
            { credentials: "include" }
          );
          if (res.ok) {
            const data = await res.json();
            const set = new Set<string>();
            data.forEach((a: any) =>
              set.add(new Date(a.date).toISOString().split("T")[0])
            );
            if (mounted) setDatesWithAppointments(set);
          } else {
            // If the range endpoint returns non-OK, clear set — we should not guess.
            if (mounted) setDatesWithAppointments(new Set());
          }
        } catch (e) {
          // On error, clear the set and log. This enforces realtime-only behavior.
          if (mounted) setDatesWithAppointments(new Set());
          // eslint-disable-next-line no-console
          console.error(
            "[enhanced-calendar] Error fetching month appointments (range):",
            e
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[enhanced-calendar] Error fetching month appointments:",
          err
        );
      }
    })();

    return () => {
      mounted = false;
    };
  }, [visibleMonth, practiceId, isOnline]);

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/appointments/${id}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch appointments
      queryClient.invalidateQueries({
        queryKey: ["/api/appointments/by-date"],
      });
      refetchAppointments();

      toast({
        title: "Appointment cancelled",
        description: "The appointment has been successfully cancelled.",
      });
    },
    onError: (error: Error) => {
      console.error("Error cancelling appointment:", error);
      toast({
        title: "Failed to cancel appointment",
        description:
          error.message ||
          "An error occurred while cancelling the appointment.",
        variant: "destructive",
      });
    },
  });

  // Reschedule appointment mutation for updating appointment time
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Appointment>;
    }) => {
      try {
        console.log("Rescheduling appointment:", id, "with data:", data);

        // Simplify the data we're sending - just the date and updated timestamps
        const simpleData = {
          date: data.date,
        };

        console.log("Simplified payload:", simpleData);

        // apiRequest already handles JSON parsing, so we don't need to call .json() on the response
        // When using apiRequest, we receive the parsed JSON directly
        return await apiRequest("PATCH", `/api/appointments/${id}`, simpleData);
      } catch (error) {
        console.error("Error in reschedule mutation:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Track the date we've rescheduled to for refetching and toast messages
      const newDateISOString = variables.data.date;
      const newDate = new Date(newDateISOString);
      const formattedNewDate = newDate.toLocaleDateString();
      const formattedNewTime = newDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      console.log(
        `Appointment successfully rescheduled to ${formattedNewDate} at ${formattedNewTime}`
      );

      // Show success toast with the new date/time
      toast({
        title: "Appointment rescheduled",
        description: `Appointment successfully moved to ${formattedNewDate} at ${formattedNewTime}`,
      });

      // Clear the reschedule dialog
      setRescheduleAppointment(null);

      // More aggressive cache invalidation to ensure all appointment data is refreshed
      queryClient.invalidateQueries({
        queryKey: ["/api/appointments/by-date"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });

      // Explicitly refetch the appointments for the current date AND the new date
      // Current date
      queryClient.fetchQuery({
        queryKey: ["/api/appointments/by-date", formattedDate, practiceId],
        queryFn: async () => {
          const queryParams = new URLSearchParams();
          queryParams.append("practiceId", practiceId.toString());

          const res = await fetch(
            `/api/appointments/by-date/${formattedDate}?${queryParams.toString()}`,
            {
              credentials: "include",
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            }
          );
          if (!res.ok) throw new Error("Failed to fetch appointments");
          return res.json();
        },
      });
      // Fetch the new date's appointments as well
      const newDateObj = new Date(variables.data.date);
      const newDateFormatted = newDateObj.toISOString().split("T")[0];

      if (newDateFormatted !== formattedDate) {
        console.log(
          `Also fetching appointments for the new date: ${newDateFormatted}`
        );
        queryClient.fetchQuery({
          queryKey: ["/api/appointments/by-date", newDateFormatted, practiceId],
          queryFn: async () => {
            const queryParams = new URLSearchParams();
            queryParams.append("practiceId", practiceId.toString());

            const res = await fetch(
              `/api/appointments/by-date/${newDateFormatted}?${queryParams.toString()}`,
              {
                credentials: "include",
                headers: {
                  "Cache-Control": "no-cache",
                  Pragma: "no-cache",
                },
              }
            );
            if (!res.ok)
              throw new Error("Failed to fetch appointments for new date");
            return res.json();
          },
        });
      }
    },
    onError: (error: Error) => {
      console.error("Error rescheduling appointment:", error);
      toast({
        title: "Failed to reschedule appointment",
        description:
          error.message ||
          "An error occurred while rescheduling the appointment.",
        variant: "destructive",
      });
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

  // Create appointment schema with validation
  // We use a custom schema since we're splitting date and time in the UI
  // but the API expects a single date field
  const appointmentSchema = z.object({
    title: z
      .string()
      .min(3, { message: "Title must be at least 3 characters" }),
    type: z.string().min(1, { message: "Please select appointment type" }),
    date: z.string().min(1, "Appointment date is required"),
    time: z.string().min(1, "Appointment time is required"),
    duration: z.coerce
      .number()
      .min(15, { message: "Duration must be at least 15 minutes" }),
    petId: z.string().min(1, { message: "Please select a pet" }),
    practitionerId: z.string({ message: "Please select a practitioner" }),
    practiceId: z.string(),
    notes: z.string().optional(),
    status: z
      .enum(["completed", "approved", "rejected", "pending"])
      .default("pending"),
  });

  // Form for quick scheduling
  const form = useForm<z.infer<typeof appointmentSchema> & { time: string }>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      type: "in-person",
      date: selectedDate.toISOString().split("T")[0],
      time: "09:00",
      duration: 30,
      petId: "",
      practitionerId: userId,
      practiceId: practiceId || "",
      notes: "",
      status: "pending",
    },
  });

  // Update the default date value when selectedDate changes
  useEffect(() => {
    form.setValue("date", selectedDate.toISOString().split("T")[0]);
  }, [selectedDate, form]);

  // Update form when a pet is selected for quick scheduling
  useEffect(() => {
    if (selectedPet) {
      form.setValue("petId", String(selectedPet.id));
      form.setValue("title", `Checkup - ${selectedPet.name}`);
    }
  }, [selectedPet, form]);

  // Always ensure practitionerId and practiceId are set
  useEffect(() => {
    if (userId) {
      form.setValue("practitionerId", userId);
      console.log("Setting practitionerId to:", userId);
    }
    if (practiceId) {
      form.setValue("practiceId", practiceId);
      console.log("Setting practiceId to:", practiceId);
    }
  }, [userId, practiceId, form]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (
      data: z.infer<typeof appointmentSchema> & { time: string }
    ) => {
      try {
        console.log("Form data:", data);

        // Combine date and time into ISO string
        const dateTime = new Date(`${data.date}T${data.time}`);

        // Create a new object without the time field
        const { time, ...appointmentData } = data;

        // Ensure all required fields are included
        const finalAppointmentData = {
          ...appointmentData,
          date: dateTime.toISOString(),
          petId: parseInt(appointmentData.petId, 10),
          practitionerId: appointmentData.practitionerId || userId, // Default to current user if not set
          status: appointmentData.status || "scheduled",
          // Ensure the type field is a simple string instead of a complex object
          type:
            typeof appointmentData.type === "object"
              ? (appointmentData.type as any).value ||
                appointmentData.type.toString()
              : appointmentData.type,
        };

        console.log("Sending appointment data:", finalAppointmentData);

        // When offline, use offline storage instead of API
        if (!isOnline) {
          console.log("[Calendar] Offline mode - saving to IndexedDB");
          const offlineAppointmentData = {
            title: finalAppointmentData.title,
            description: finalAppointmentData.notes || null,
            date: dateTime.toISOString(), // Full ISO string for date
            durationMinutes: finalAppointmentData.duration?.toString() || "30",
            status: finalAppointmentData.status || ("pending" as const),
            petId: finalAppointmentData.petId?.toString() || null,
            clientId: finalAppointmentData.petId?.toString() || null, // TODO: Get actual client ID from pet
            staffId: null, // Will be set when synced to server
            practitionerId:
              finalAppointmentData.practitionerId?.toString() || null,
            practiceId: practiceId?.toString(),
            type: finalAppointmentData.type,
            source: "internal" as const,
            notes: finalAppointmentData.notes || null,
            // Telemedicine fields (if applicable)
            roomId: null,
            telemedicineStartedAt: null,
            telemedicineEndedAt: null,
          };

          return await createOfflineAppointment(offlineAppointmentData);
        }

        // Online mode - use API
        try {
          const response = await apiRequest(
            "POST",
            "/api/appointments",
            finalAppointmentData
          );
          return response;
        } catch (apiError) {
          console.error("API request failed:", apiError);
          // Try to parse error message if it's JSON
          try {
            const errorMessage = (apiError as any).message || "";
            if (errorMessage.includes(":")) {
              const parts = errorMessage.split(":");
              throw new Error(parts[1]?.trim() || errorMessage);
            }
            throw apiError;
          } catch (parseError) {
            throw apiError;
          }
        }
      } catch (error) {
        console.error("Error creating appointment:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Only refetch when online
      if (isOnline) {
        // More aggressive cache invalidation to ensure all appointment data is refreshed
        queryClient.invalidateQueries({
          queryKey: ["/api/appointments/by-date"],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });

        // Explicitly refetch the appointments for the current date to ensure UI updates
        queryClient.fetchQuery({
          queryKey: ["/api/appointments/by-date", formattedDate, practiceId],
          queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (practiceId) {
              queryParams.append("practiceId", practiceId.toString());
            }

            const res = await fetch(
              `/api/appointments/by-date/${formattedDate}?${queryParams.toString()}`,
              {
                credentials: "include",
                headers: {
                  "Cache-Control": "no-cache",
                  Pragma: "no-cache",
                },
              }
            );
            if (!res.ok) throw new Error("Failed to fetch appointments");
            return res.json();
          },
        });
      }

      setQuickScheduleOpen(false);
      toast({
        title: isOnline ? "Appointment scheduled" : "Appointment saved offline",
        description: isOnline
          ? "The appointment has been successfully created."
          : "The appointment has been saved locally and will sync when you're back online.",
      });
      form.reset();
      setSelectedPet(null);
    },
    onError: (error: Error) => {
      console.error("Appointment creation error:", error);

      let errorMessage = error.message;
      try {
        // Try to parse the error response if it's JSON
        const errorData = JSON.parse(errorMessage);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Not JSON, use the original message
      }

      toast({
        title: "Failed to schedule appointment",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (
    data: z.infer<typeof appointmentSchema> & { time: string }
  ) => {
    // Make sure practitionerId is set
    const formData = {
      ...data,
      practitionerId: data.practitionerId || userId,
      practiceId: practiceId,
    };

    // Detailed logging for troubleshooting
    console.log("Submitting appointment with data:", formData);
    console.log("Form validation state:", form.formState.isValid);
    console.log("Form errors:", form.formState.errors);

    try {
      createAppointmentMutation.mutate(formData);
    } catch (error) {
      console.error("Error in mutation call:", error);
      toast({
        title: "Error scheduling appointment",
        description: "Failed to submit appointment data",
        variant: "destructive",
      });
    }
  };

  // Group appointments by time slot
  const appointmentsByTime: Record<string, Appointment[]> = {};
  appointments.forEach((appointment: Appointment) => {
    const time = new Date(appointment.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!appointmentsByTime[time]) {
      appointmentsByTime[time] = [];
    }
    appointmentsByTime[time].push(appointment);
  });

  // Sort time slots
  const sortedTimeSlots = Object.keys(appointmentsByTime).sort();

  // Handle pet avatar click to open quick scheduling
  const handlePetAvatarClick = (pet: Pet) => {
    setSelectedPet(pet);
    setQuickScheduleOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Calendar picker */}
      <div className="bg-white p-4 rounded-lg shadow-sm md:col-span-1">
        <DatePicker
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          datesWithAppointments={datesWithAppointments}
        />

        <div className="mt-6">
          <h3 className="font-medium text-lg mb-3">Pets</h3>
          <div className="flex flex-wrap gap-2">
            {pets.map((pet: Pet) => (
              <div
                key={pet.id}
                className="cursor-pointer"
                onClick={() => handlePetAvatarClick(pet)}
              >
                <Avatar className="h-12 w-12 border-2 border-transparent hover:border-primary-500 transition-all">
                  {pet.photoPath ? (
                    <AvatarImage src={pet.photoPath} alt={pet.name} />
                  ) : (
                    <AvatarFallback
                      className={`${getPetAvatarColors(pet.name).bg} ${
                        getPetAvatarColors(pet.name).text
                      }`}
                    >
                      {pet.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <p className="text-xs text-center mt-1">{pet.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments for selected date */}
      <div className="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xl">
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>

          {/* New Appointment Dialog */}
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
                <DialogDescription>
                  Create a new appointment for the selected date.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {/* Pet Selection */}
                  <FormField
                    control={form.control}
                    name="petId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={(value: string) => {
                            field.onChange(value);
                            const pet = pets.find(
                              (p: Pet) => String(p.id) === value
                            );
                            if (pet) {
                              setSelectedPet(pet);
                              form.setValue("title", `Checkup - ${pet.name}`);
                            }
                          }}
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
                                      <AvatarImage
                                        src={pet.photoPath}
                                        alt={pet.name}
                                      />
                                    ) : (
                                      <AvatarFallback
                                        className={`${
                                          getPetAvatarColors(pet.name).bg
                                        } ${
                                          getPetAvatarColors(pet.name).text
                                        } text-xs`}
                                      >
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

                  {/* Appointment Type Field - with fallback if custom fields don't work */}
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
                              <SelectValue placeholder="Select appointment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="virtual">
                              Virtual (Telemedicine)
                            </SelectItem>
                            <SelectItem value="in-person">In-Person</SelectItem>
                            <SelectItem value="surgery">Surgery</SelectItem>
                            <SelectItem value="dental">Dental</SelectItem>
                            <SelectItem value="vaccination">
                              Vaccination
                            </SelectItem>
                            <SelectItem value="checkup">Checkup</SelectItem>
                            <SelectItem value="wellness">Wellness</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hidden field for practitionerId */}
                  <FormField
                    control={form.control}
                    name="practitionerId"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
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
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
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
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
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
                            placeholder="Add any notes about the appointment"
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
                      onClick={() => {
                        setQuickScheduleOpen(false);
                        setSelectedPet(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAppointmentMutation.isPending}
                    >
                      {createAppointmentMutation.isPending
                        ? "Scheduling..."
                        : "Schedule Appointment"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingAppointments ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : sortedTimeSlots.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Calendar className="h-10 w-10 mx-auto opacity-30 mb-2" />
            <p>No appointments scheduled for this date.</p>
            <p className="text-sm mt-1">
              Click on a pet or the "New Appointment" button to schedule.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTimeSlots.map((timeSlot) => (
              <div
                key={timeSlot}
                className="border-l-2 border-primary-500 pl-3"
              >
                <div className="text-sm font-medium text-slate-700 mb-2">
                  <Clock className="inline-block h-4 w-4 mr-1 mb-1" />
                  {timeSlot}
                </div>
                <div className="space-y-3">
                  {appointmentsByTime[timeSlot].map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      pets={pets}
                      onDelete={(id) => deleteAppointmentMutation.mutate(id)}
                      onReschedule={(appointment) =>
                        setRescheduleAppointment(appointment)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Dialog */}
      <Dialog
        open={!!rescheduleAppointment}
        onOpenChange={(open) => !open && setRescheduleAppointment(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              {rescheduleAppointment
                ? `Reschedule appointment: ${rescheduleAppointment.title}`
                : "Update appointment time"}
            </DialogDescription>
          </DialogHeader>

          {rescheduleAppointment && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    New Date
                  </label>
                  <Input
                    type="date"
                    defaultValue={
                      new Date(rescheduleAppointment.date)
                        .toISOString()
                        .split("T")[0]
                    }
                    id="reschedule-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    New Time
                  </label>
                  <Input
                    type="time"
                    defaultValue={new Date(rescheduleAppointment.date)
                      .toTimeString()
                      .slice(0, 5)}
                    id="reschedule-time"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleAppointment(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={rescheduleAppointmentMutation.isPending}
                  onClick={() => {
                    // Get the new date and time values
                    const dateInput = document.getElementById(
                      "reschedule-date"
                    ) as HTMLInputElement;
                    const timeInput = document.getElementById(
                      "reschedule-time"
                    ) as HTMLInputElement;

                    if (!dateInput || !timeInput) {
                      return;
                    }

                    const newDate = dateInput.value;
                    const newTime = timeInput.value;

                    if (!newDate || !newTime) {
                      toast({
                        title: "Missing information",
                        description: "Please select both date and time",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Combine date and time
                    const dateTime = new Date(`${newDate}T${newTime}`);

                    // Validate the date is valid
                    if (isNaN(dateTime.getTime())) {
                      toast({
                        title: "Invalid date/time",
                        description:
                          "The date and time combination is not valid",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Submit the update with improved logging
                    console.log(
                      "Rescheduling appointment to:",
                      dateTime.toISOString()
                    );

                    // Create a simpler update payload with just the necessary fields
                    const updateData = {
                      date: dateTime.toISOString(),
                      // We'll let the server set updatedAt automatically
                    };

                    console.log("Sending update with data:", updateData);

                    try {
                      rescheduleAppointmentMutation.mutate({
                        id: rescheduleAppointment.id,
                        data: updateData,
                      });
                    } catch (error) {
                      console.error("Failed to reschedule:", error);
                      toast({
                        title: "Reschedule failed",
                        description:
                          "There was an error trying to reschedule the appointment",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {rescheduleAppointmentMutation.isPending
                    ? "Rescheduling..."
                    : "Reschedule"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Schedule Dialog */}
      <Dialog open={quickScheduleOpen} onOpenChange={setQuickScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Schedule Appointment</DialogTitle>
            <DialogDescription>
              {selectedPet
                ? `Schedule an appointment for ${selectedPet.name}`
                : "Schedule a new appointment"}
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
                      value={field.value || ""}
                      onValueChange={(value: string) => {
                        field.onChange(value);
                        const pet = pets.find(
                          (p: Pet) => String(p.id) === value
                        );
                        if (pet) {
                          setSelectedPet(pet);
                          form.setValue("title", `Checkup - ${pet.name}`);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a pet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pets.map((pet: Pet) => (
                          <SelectItem key={pet.id} value={String(pet.id)}>
                            <div>
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

              {/* Appointment Type Field - with fallback if custom fields don't work */}
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
                          <SelectValue placeholder="Select appointment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="virtual">
                          Virtual (Telemedicine)
                        </SelectItem>
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

              {/* Hidden field for practitionerId */}
              <FormField
                control={form.control}
                name="practitionerId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
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
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
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
                        placeholder="Add any notes about the appointment"
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
                  onClick={() => {
                    setQuickScheduleOpen(false);
                    setSelectedPet(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                >
                  {createAppointmentMutation.isPending
                    ? "Scheduling..."
                    : "Schedule Appointment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Appointment Card component for the calendar
interface AppointmentCardProps {
  appointment: Appointment;
  pets: Pet[];
  onDelete?: (id: number) => void;
  onReschedule?: (appointment: Appointment) => void;
}

function AppointmentCard({
  appointment,
  pets,
  onDelete,
  onReschedule,
}: AppointmentCardProps) {
  // Find the pet for this appointment
  const pet = pets.find((p) => p.id === appointment.petId);

  // Format time
  const appointmentTime = new Date(appointment.date);

  // State for cancel confirmation dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Determine status styles
  const getStatusColor = () => {
    switch (appointment.status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return appointment.type === "virtual"
          ? "bg-primary-100 text-primary-800"
          : "bg-amber-100 text-amber-800";
    }
  };

  // Only show action buttons if the appointment is not cancelled or completed
  const canModify = appointment.status === "scheduled";

  return (
    <div
      className={`p-3 bg-white rounded-md border ${
        appointment.status === "cancelled"
          ? "border-red-200"
          : appointment.status === "completed"
          ? "border-green-200"
          : appointment.type === "virtual"
          ? "border-primary-200"
          : "border-amber-200"
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-1">
          <Avatar className="h-8 w-8">
            {pet?.photoPath ? (
              <AvatarImage
                src={
                  pet.photoPath.startsWith("/")
                    ? pet.photoPath
                    : `/${pet.photoPath}`
                }
                alt={pet.name}
              />
            ) : (
              <AvatarFallback
                className={
                  appointment.status === "cancelled"
                    ? "bg-red-100 text-red-800"
                    : appointment.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : appointment.type === "virtual"
                    ? "bg-primary-100 text-primary-800"
                    : "bg-amber-100 text-amber-800"
                }
              >
                {pet ? pet.name.substring(0, 2).toUpperCase() : "??"}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`font-medium ${
                  appointment.status === "cancelled"
                    ? "line-through text-slate-500"
                    : "text-slate-900"
                }`}
              >
                {appointment.title}
              </p>
              <p className="text-sm text-slate-600">
                {pet ? pet.name : `Pet ID: ${appointment.petId}`}
                <span className="mx-1">•</span>
                <span className="inline-flex items-center">
                  {appointment.type === "virtual" ? (
                    <Video className="h-3 w-3 mr-1" />
                  ) : (
                    <MapPin className="h-3 w-3 mr-1" />
                  )}
                  {appointment.type === "virtual"
                    ? "Telemedicine"
                    : "In-Person"}
                </span>
              </p>
            </div>
            <Badge className={getStatusColor()}>
              {appointment.status === "cancelled"
                ? "Cancelled"
                : appointment.status === "completed"
                ? "Completed"
                : "Scheduled"}
            </Badge>
          </div>

          {appointment.notes && (
            <p className="text-xs text-slate-500 mt-1 italic">
              {appointment.notes}
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-2 flex gap-2">
            {appointment.type === "virtual" &&
              appointment.status === "scheduled" && (
                <Button size="sm" variant="outline">
                  <Video className="h-3 w-3 mr-1" />
                  Join Call
                </Button>
              )}

            {canModify && onReschedule && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReschedule(appointment)}
              >
                <Clock className="h-3 w-3 mr-1" />
                Reschedule
              </Button>
            )}

            {canModify && onDelete && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => setShowCancelDialog(true)}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Appointment Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment:{" "}
              <span className="font-medium">{appointment.title}</span>?
              <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>
                    {appointmentTime.toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>
                    {appointmentTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {pet && (
                  <div className="flex items-center gap-2 mt-1">
                    <PawPrint className="h-4 w-4 text-slate-400" />
                    <span>
                      {pet.name} ({pet.species})
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-red-600 text-sm">
                This action cannot be undone. The client will be notified of
                this cancellation.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onDelete(appointment.id)}
            >
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
