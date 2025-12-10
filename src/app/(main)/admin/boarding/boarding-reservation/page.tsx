"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Calendar, PawPrint, Trash, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineStorage } from "@/hooks/offline/use-offline-storage";
import { useOfflineKennels } from "@/hooks/offline/boarding/use-offline-kennels";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { usePracticeId } from "@/hooks/use-practice-id";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient";
import { Combobox } from "@/components/ui/combobox";

// Form schema
const baseFormSchema = z.object({
  petId: z.string().min(1, "Pet is required"),
  practiceId: z.string().min(1, "Practice ID is required"),
  kennelId: z.string().min(1, "Kennel is required"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  specialInstructions: z.string().optional(),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(10, "Valid phone number is required"),
  dailyRate: z
    .string()
    .min(1, "Daily rate is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  hasMedications: z.boolean().default(false),
  hasFeedingInstructions: z.boolean().default(false),
  hasSpecialRequirements: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormSchemaType = z.infer<typeof baseFormSchema>;

const formSchema = baseFormSchema.refine(
  (data: FormSchemaType) => {
    return (
      data.startDate instanceof Date &&
      data.endDate instanceof Date &&
      data.startDate < data.endDate
    );
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

interface Pet {
  id: number;
  name: string;
  ownerId: number;
  ownerName: string;
  species: string;
  breed: string | null;
  owner: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

interface Kennel {
  id: number;
  name: string;
  type: string;
  size: string;
  isActive: boolean;
}

export default function BoardingReservationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const practiceId = usePracticeId();
  const { user } = useUser();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);

  // Offline hooks
  const { kennels: offlineKennels, isLoading: offlineKennelsLoading } =
    useOfflineKennels();

  // Check if editing an existing reservation (from URL params)
  const reservationId = searchParams.get("id");

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur", // Validate on blur to show errors immediately
    reValidateMode: "onChange", // Re-validate on change after first validation
    defaultValues: {
      practiceId: "", // This will be updated when practiceId is available
      specialInstructions: "",
      hasMedications: false,
      hasFeedingInstructions: false,
      hasSpecialRequirements: false,
      notes: "",
      dailyRate: "45.00",
    },
  });

  // Update form practice ID when available
  useEffect(() => {
    if (practiceId) {
      form.setValue("practiceId", practiceId);
    }
  }, [practiceId, form]);

  // Check if editing an existing reservation
  useEffect(() => {
    if (reservationId) {
      setIsEditMode(true);
    }
  }, [reservationId]);

  // Fetch available pets
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["/api/pets", practiceId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pets?practiceId=${practiceId}`);
      return await res.json();
    },
    enabled: !!practiceId,
  });

  // Fetch available kennels
  const { data: kennels, isLoading: kennelsLoading } = useQuery({
    queryKey: ["/api/boarding/kennels", practiceId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/boarding/kennels?practiceId=${practiceId}&available=true`
      );
      return await res.json();
    },
    enabled: !!practiceId,
  });

  const { data: currency } = useQuery<{
    code: string;
    name: string;
    symbol: string;
    decimals: string;
  }>({
    queryKey: ["/api/practices", practiceId, "currency"],
    queryFn: async () => {
      if (!practiceId) throw new Error("Practice ID is required");
      const res = await fetch(`/api/practices/${practiceId}/currency`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch currency");
      return res.json();
    },
    enabled: !!practiceId,
    staleTime: 300_000,
  });
  const currencySymbol = currency?.symbol;

  // Use API data when online, offline data when offline
  const displayKennels = isOnline
    ? kennels || []
    : offlineKennels.filter((k) => k.isActive);

  // Combined loading states
  const combinedKennelsLoading = isOnline
    ? kennelsLoading
    : offlineKennelsLoading;
  const { data: boardingStay, isLoading: boardingStayLoading } = useQuery({
    queryKey: ["/api/boarding/stays", reservationId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/boarding/stays/${reservationId}`
      );
      return await res.json();
    },
    enabled: isEditMode && !!reservationId,
  });

  // Update form with existing data when editing
  useEffect(() => {
    if (isEditMode && boardingStay) {
      form.reset({
        petId: String(boardingStay.petId),
        practiceId: boardingStay.practiceId,
        kennelId: String(boardingStay.kennelId),
        startDate: new Date(boardingStay.startDate),
        endDate: new Date(boardingStay.endDate),
        specialInstructions: boardingStay.specialInstructions || "",
        emergencyContactName: boardingStay.emergencyContactName || "",
        emergencyContactPhone: boardingStay.emergencyContactPhone || "",
        dailyRate: boardingStay.dailyRate || "",
        hasMedications: boardingStay.hasMedications || false,
        hasFeedingInstructions: boardingStay.hasFeedingInstructions || false,
        hasSpecialRequirements: boardingStay.hasSpecialRequirements || false,
        notes: boardingStay.notes || "",
      });
    }
  }, [isEditMode, boardingStay, form]);

  // Create boarding stay mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const payload = {
        ...data,
        practiceId: data.practiceId,
        petId: data.petId, // Keep as string since our schema uses text UUIDs
        kennelId: data.kennelId, // Keep as string since our schema uses text UUIDs
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        status: "scheduled",
        createdById: user?.id,
      };

      console.log("Creating boarding stay with payload:", payload);

      const res = await apiRequest("POST", "/api/boarding/stays", payload);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Boarding stay created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays"] });
      toast({
        title: "Success",
        description: "Boarding reservation created successfully",
      });

      if (practiceId && isOnline && data?.pet?.owner?.id && data?.pet?.id) {
        try {
          const checkIn = new Date(data.checkInDate);
          const plannedOut = new Date(data.plannedCheckOutDate);
          const msPerDay = 1000 * 60 * 60 * 24;
          const nights = Math.max(
            1,
            Math.ceil((plannedOut.getTime() - checkIn.getTime()) / msPerDay)
          );
          const rate = parseFloat(String(data.dailyRate || "0"));
          const subtotal = (rate * nights).toFixed(2);

          const invoicePayload = {
            clientId: Number(data.pet.owner.id),
            petId: Number(data.pet.id),
            date: new Date().toISOString(),
            dueDate: plannedOut.toISOString(),
            notes: `Boarding stay scheduled for ${data.pet.name}`,
            items: [
              {
                description: "Boarding stay",
                quantity: nights,
                subtotal,
                taxable: true,
              },
            ],
          };

          apiRequest(
            "POST",
            `/api/practices/${practiceId}/invoices`,
            invoicePayload
          )
            .then(async (res) => {
              if (res.ok) {
                const createdInvoice = await res.json();
                toast({
                  title: "Invoice Created",
                  description: `Invoice #${createdInvoice.invoiceNumber} has been created for this stay`,
                });
                queryClient.invalidateQueries({
                  queryKey: ["/api/practices", practiceId, "invoices"],
                });
              } else {
                try {
                  const err = await res.json();
                  toast({
                    title: "Invoice Error",
                    description: err?.error || "Failed to create invoice",
                    variant: "destructive",
                  });
                } catch {
                  toast({
                    title: "Invoice Error",
                    description: "Failed to create invoice",
                    variant: "destructive",
                  });
                }
              }
            })
            .catch(() => {
              toast({
                title: "Invoice Error",
                description: "Failed to create invoice",
                variant: "destructive",
              });
            });
        } catch {
          // ignore invoice creation errors here
        }
      }

      router.push(`/admin/boarding/boarding-stay/${data.id}`);
    },
    onError: (error: Error) => {
      console.error("Error creating boarding stay:", error);
      toast({
        title: "Error",
        description: `Failed to create boarding reservation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update boarding stay mutation
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Server expects PUT for updating a boarding stay
      const res = await apiRequest(
        "PUT",
        `/api/boarding/stays/${reservationId}`,
        {
          ...data,
          petId: data.petId,
          kennelId: data.kennelId,
        }
      );
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays"] });
      toast({
        title: "Success",
        description: "Boarding reservation updated successfully",
      });
      router.push(`/admin/boarding/boarding-stay/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update boarding reservation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete boarding stay mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "DELETE",
        `/api/boarding/stays/${reservationId}`
      );
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays"] });
      toast({
        title: "Success",
        description: "Boarding reservation deleted successfully",
      });
      router.push("/admin/boarding");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete boarding reservation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Use API data directly - no mock data needed
  const displayPets = pets || [];
  // displayKennels is already defined above with offline support

  // Submit form handler
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log("Form submitted with data:", data);
    console.log("Form validation errors:", form.formState.errors);
    console.log("Is form valid:", form.formState.isValid);
    console.log("User ID for createdById:", user?.id);

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    // Manually trigger validation to show all errors
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Delete confirmation handler
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this boarding reservation?")) {
      deleteMutation.mutate();
    }
  };

  // Loading state
  const isLoading =
    petsLoading ||
    combinedKennelsLoading ||
    (isEditMode && boardingStayLoading);
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // Check if form can be submitted (all required data is available)
  const canSubmit =
    !isLoading &&
    !isMutating &&
    practiceId &&
    user?.id &&
    displayPets.length > 0 &&
    displayKennels.length > 0;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Debug information
  console.log("Form submission readiness check:", {
    isLoading,
    isMutating,
    practiceId,
    userId: user?.id,
    petsCount: displayPets.length,
    kennelsCount: displayKennels.length,
    canSubmit,
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Link href="/admin/boarding">
          <Button variant="ghost" size="sm" className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {isEditMode
              ? "Edit Boarding Reservation"
              : "New Boarding Reservation"}
            {!isOnline && (
              <Badge variant="secondary" className="gap-1.5">
                <WifiOff className="h-3 w-3" />
                Offline Mode
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? "Update the details of an existing reservation"
              : "Book a new boarding stay for a pet"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                <PawPrint className="h-5 w-5 inline-block mr-2" />
                Pet & Stay Information
              </CardTitle>
              <CardDescription>
                Basic information about the pet and their stay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet</FormLabel>
                      <FormControl>
                        <Combobox
                          options={
                            petsLoading
                              ? [
                                  {
                                    value: "loading",
                                    label: "Loading pets...",
                                  },
                                ]
                              : displayPets.length > 0
                              ? displayPets.map((pet: Pet) => ({
                                  value: String(pet.id),
                                  label: `${pet.name} (${
                                    pet.ownerName ||
                                    pet.owner?.name ||
                                    "Unknown"
                                  }) - ${pet.species}${
                                    pet.breed ? `, ${pet.breed}` : ""
                                  }`,
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
                          placeholder="Select a pet"
                          emptyText="No pets found."
                          className={
                            form.formState.errors.petId ? "border-red-500" : ""
                          }
                          disabled={
                            isMutating ||
                            petsLoading ||
                            displayPets.length === 0
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Select the pet for this boarding stay
                      </FormDescription>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kennelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kennel</FormLabel>
                      <FormControl>
                        <Combobox
                          options={
                            combinedKennelsLoading
                              ? [
                                  {
                                    value: "loading",
                                    label: "Loading kennels...",
                                  },
                                ]
                              : displayKennels.length > 0
                              ? displayKennels.map((kennel: Kennel) => ({
                                  value: String(kennel.id),
                                  label: `${kennel.name} - ${kennel.type} (${kennel.size})`,
                                }))
                              : [
                                  {
                                    value: "none",
                                    label: "No kennels available",
                                  },
                                ]
                          }
                          value={field.value}
                          onSelect={field.onChange}
                          placeholder="Select a kennel"
                          emptyText="No kennels found."
                          className={
                            form.formState.errors.kennelId
                              ? "border-red-500"
                              : ""
                          }
                          disabled={
                            isMutating ||
                            combinedKennelsLoading ||
                            displayKennels.length === 0
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Select an available kennel
                      </FormDescription>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`${
                                !field.value ? "text-muted-foreground" : ""
                              } ${
                                form.formState.errors.startDate
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isMutating}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "PP")
                                : "Select date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the boarding stay will begin
                      </FormDescription>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`${
                                !field.value ? "text-muted-foreground" : ""
                              } ${
                                form.formState.errors.endDate
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isMutating}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "PP")
                                : "Select date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the boarding stay will end
                      </FormDescription>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="dailyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{`Daily Rate (${currencySymbol})`}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0.00"
                          {...field}
                          disabled={isMutating}
                          className={
                            form.formState.errors.dailyRate
                              ? "border-red-500"
                              : ""
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Daily cost for the boarding stay
                      </FormDescription>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Emergency Contact</CardTitle>
              <CardDescription>
                Contact information in case of emergency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contact name"
                          {...field}
                          disabled={isMutating}
                          className={
                            form.formState.errors.emergencyContactName
                              ? "border-red-500"
                              : ""
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contact phone number"
                          {...field}
                          disabled={isMutating}
                          className={
                            form.formState.errors.emergencyContactPhone
                              ? "border-red-500"
                              : ""
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-red-600 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Additional Information</CardTitle>
              <CardDescription>
                Special instructions and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any special instructions for this boarding stay"
                        {...field}
                        disabled={isMutating}
                        className={
                          form.formState.errors.specialInstructions
                            ? "border-red-500"
                            : ""
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Any specific requirements for caring for this pet
                    </FormDescription>
                    <FormMessage className="text-red-600 text-sm mt-1" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="hasMedications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel>Medications</FormLabel>
                        <FormDescription>
                          Pet requires medications
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isMutating}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasFeedingInstructions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel>Feeding Instructions</FormLabel>
                        <FormDescription>
                          Special feeding required
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isMutating}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSpecialRequirements"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel>Special Requirements</FormLabel>
                        <FormDescription>Other special needs</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isMutating}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional notes"
                        {...field}
                        disabled={isMutating}
                        className={
                          form.formState.errors.notes ? "border-red-500" : ""
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Internal notes about this boarding stay
                    </FormDescription>
                    <FormMessage className="text-red-600 text-sm mt-1" />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              {isEditMode ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isMutating}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Reservation
                  </Button>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/boarding/boarding-stay/${reservationId}`}
                    >
                      <Button variant="outline" disabled={isMutating}>
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={!canSubmit}>
                      {isMutating ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/admin/boarding">
                    <Button variant="outline" disabled={isMutating}>
                      Cancel
                    </Button>
                  </Link>
                  <div className="flex flex-col items-end gap-2">
                    {!canSubmit && (
                      <div className="text-sm text-muted-foreground">
                        {!practiceId && "Practice not selected"}
                        {!user?.id && "User not authenticated"}
                        {displayPets.length === 0 && "No pets available"}
                        {displayKennels.length === 0 && "No kennels available"}
                      </div>
                    )}
                    <Button type="submit" disabled={!canSubmit}>
                      {isMutating ? "Creating..." : "Create Reservation"}
                    </Button>
                  </div>
                </>
              )}
            </CardFooter>
          </Card>

          {form.formState.errors.root && (
            <div className="text-red-500 text-sm mb-4 p-3 border border-red-200 rounded-md bg-red-50">
              {form.formState.errors.root.message}
            </div>
          )}

          {/* Show validation errors for debugging */}
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="text-red-500 text-sm mb-4 p-3 border border-red-200 rounded-md bg-red-50">
              <p className="font-semibold">Form validation errors:</p>
              <ul className="list-disc list-inside mt-2">
                {Object.entries(form.formState.errors).map(([field, error]) => (
                  <li key={field}>
                    {field}: {error?.message || "Invalid value"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
