"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ChevronLeft, Calendar, PawPrint, Plus, Trash } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { usePracticeId } from "@/hooks/use-practice-id";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";

// Form schema
const formSchema = z
  .object({
    petId: z.string().min(1, "Pet is required"),
    practiceId: z.number(),
    kennelId: z.string().min(1, "Kennel is required"),
    startDate: z.date({ required_error: "Start date is required" }),
    endDate: z.date({ required_error: "End date is required" }),
    specialInstructions: z.string().optional(),
    emergencyContactName: z
      .string()
      .min(1, "Emergency contact name is required"),
    emergencyContactPhone: z.string().min(10, "Valid phone number is required"),
    dailyRate: z
      .string()
      .min(1, "Daily rate is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
    hasMedications: z.boolean().default(false),
    hasFeedingInstructions: z.boolean().default(false),
    hasSpecialRequirements: z.boolean().default(false),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      return (data as any).startDate < (data as any).endDate;
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
}

interface Kennel {
  id: number;
  name: string;
  type: string;
  size: string;
  isActive: boolean;
}

export default function BoardingReservationPage() {
  const params = useParams();
  const router = useRouter();
  const practiceId = usePracticeId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);

  // Helper: safely convert various values to Date or null
  const toDate = (v: any): Date | null => {
    if (!v && v !== 0) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      practiceId: practiceId || 0,
      specialInstructions: "",
      hasMedications: false,
      hasFeedingInstructions: false,
      hasSpecialRequirements: false,
      notes: "",
    },
  });

  // Check if editing an existing reservation
  useEffect(() => {
    if (params?.id) {
      setIsEditMode(true);
    }
  }, [params]);

  // Fetch available pets
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["/api/pets", practiceId],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await apiRequest("GET", `/api/pets?practiceId=${practiceId}`);
      return res.ok ? await res.json() : [];
    },
    enabled: !!practiceId,
  });

  // Fetch available kennels (server implements /api/boarding/kennels with query params)
  const { data: kennels, isLoading: kennelsLoading } = useQuery({
    queryKey: ["/api/boarding/kennels", practiceId],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await apiRequest(
        "GET",
        `/api/boarding/kennels?practiceId=${practiceId}&available=true`
      );
      return res.ok ? await res.json() : [];
    },
    enabled: !!practiceId,
  });

  // Fetch specific boarding stay if in edit mode
  const { data: boardingStay, isLoading: boardingStayLoading } = useQuery({
    queryKey: ["/api/boarding/stays", params?.id],
    queryFn: async () => {
      if (!params?.id) return null;
      const res = await apiRequest("GET", `/api/boarding/stays/${params.id}`);
      return res.ok ? await res.json() : null;
    },
    enabled: isEditMode && !!params?.id,
  });

  // Update form with existing data when editing
  useEffect(() => {
    if (isEditMode && boardingStay) {
      // Normalize possible start/end fields from API
      const startRaw =
        (boardingStay as any)?.startDate ??
        (boardingStay as any)?.checkInDate ??
        (boardingStay as any)?.check_in_date ??
        null;
      const endRaw =
        (boardingStay as any)?.endDate ??
        (boardingStay as any)?.plannedCheckOutDate ??
        (boardingStay as any)?.planned_check_out_date ??
        (boardingStay as any)?.actualCheckOutDate ??
        (boardingStay as any)?.checkOutDate ??
        null;

      form.reset({
        petId: String(boardingStay.petId),
        practiceId: boardingStay.practiceId,
        kennelId: String(boardingStay.kennelId),
        startDate: startRaw ? new Date(startRaw) : null,
        endDate: endRaw ? new Date(endRaw) : null,
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
      // Coerce and validate values to the API-expected types
      const practiceIdNum = Number(data.practiceId);
      const petIdNum = parseInt(String(data.petId));
      const kennelIdNum = parseInt(String(data.kennelId));
      if (!petIdNum || isNaN(petIdNum)) {
        throw new Error("Invalid pet selected");
      }
      if (!kennelIdNum || isNaN(kennelIdNum)) {
        throw new Error("Invalid kennel selected");
      }
      const startIso = toDate(data.startDate)?.toISOString() ?? null;
      const endIso = toDate(data.endDate)?.toISOString() ?? null;
      if (!startIso || !endIso) {
        throw new Error("Invalid start or end date");
      }

      const payload: any = {
        practiceId: practiceIdNum,
        petId: petIdNum,
        kennelId: kennelIdNum,
        startDate: startIso,
        endDate: endIso,
        specialInstructions: data.specialInstructions,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        dailyRate: data.dailyRate,
        hasMedications: data.hasMedications,
        hasFeedingInstructions: data.hasFeedingInstructions,
        hasSpecialRequirements: data.hasSpecialRequirements,
        notes: data.notes,
      };

      const res = await apiRequest("POST", "/api/boarding/stays", payload);
      if (!res.ok) {
        // try to extract JSON message, fallback to text
        let errText = "Failed to create boarding stay";
        try {
          const j = await res.json();
          errText = j?.message || JSON.stringify(j);
        } catch {
          errText = await res.text();
        }
        throw new Error(errText || "Unknown error");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays"] });
      toast({
        title: "Success",
        description: "Boarding reservation created successfully",
      });
      router.push(`/admin/boarding/boarding-stay/${data.id}`);
    },
    onError: (error: Error) => {
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
      const practiceIdNum = Number(data.practiceId);
      const petIdNum = parseInt(String(data.petId));
      const kennelIdNum = parseInt(String(data.kennelId));
      if (!petIdNum || isNaN(petIdNum)) {
        throw new Error("Invalid pet selected");
      }
      if (!kennelIdNum || isNaN(kennelIdNum)) {
        throw new Error("Invalid kennel selected");
      }
      const startIso = toDate(data.startDate)?.toISOString() ?? null;
      const endIso = toDate(data.endDate)?.toISOString() ?? null;
      if (!startIso || !endIso) {
        throw new Error("Invalid start or end date");
      }

      const payload: any = {
        practiceId: practiceIdNum,
        petId: petIdNum,
        kennelId: kennelIdNum,
        startDate: startIso,
        endDate: endIso,
        specialInstructions: data.specialInstructions,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        dailyRate: data.dailyRate,
        hasMedications: data.hasMedications,
        hasFeedingInstructions: data.hasFeedingInstructions,
        hasSpecialRequirements: data.hasSpecialRequirements,
        notes: data.notes,
      };

      const stayId = String(params?.id || "");
      // Server update route expects PUT for updating a stay
      const res = await apiRequest(
        "PUT",
        `/api/boarding/stays/${stayId}`,
        payload
      );
      if (!res.ok) {
        let errText = "Failed to update boarding stay";
        try {
          const j = await res.json();
          errText = j?.message || JSON.stringify(j);
        } catch {
          errText = await res.text();
        }
        throw new Error(errText || "Unknown error");
      }
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
      const stayId = String(params?.id || "");
      const res = await apiRequest("DELETE", `/api/boarding/stays/${stayId}`);
      if (!res.ok) {
        let errText = "Failed to delete boarding stay";
        try {
          const j = await res.json();
          errText = j?.message || JSON.stringify(j);
        } catch {
          errText = await res.text();
        }
        throw new Error(errText || "Unknown error");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays"] });
      toast({
        title: "Success",
        description: "Boarding reservation deleted successfully",
      });
      router.push(`/admin/boarding`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete boarding reservation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mock data for pets and kennels until API is connected
  const mockPets: Pet[] = [
    {
      id: 1,
      name: "Buddy",
      ownerId: 1,
      ownerName: "John Doe",
      species: "Dog",
      breed: "Labrador",
    },
    {
      id: 2,
      name: "Max",
      ownerId: 2,
      ownerName: "Sarah Smith",
      species: "Dog",
      breed: "German Shepherd",
    },
    {
      id: 3,
      name: "Charlie",
      ownerId: 3,
      ownerName: "Emily Johnson",
      species: "Dog",
      breed: "Golden Retriever",
    },
    {
      id: 4,
      name: "Luna",
      ownerId: 4,
      ownerName: "Mark Wilson",
      species: "Cat",
      breed: "Siamese",
    },
  ];

  const mockKennels: Kennel[] = [
    {
      id: 1,
      name: "Kennel A1",
      type: "standard",
      size: "medium",
      isActive: true,
    },
    { id: 2, name: "Kennel B2", type: "deluxe", size: "large", isActive: true },
    {
      id: 3,
      name: "Kennel C3",
      type: "premium",
      size: "large",
      isActive: true,
    },
    {
      id: 4,
      name: "Kennel D4",
      type: "cats_only",
      size: "small",
      isActive: true,
    },
    {
      id: 5,
      name: "Kennel E5",
      type: "isolation",
      size: "medium",
      isActive: true,
    },
  ];

  // Use mock data until API is connected
  const displayPets: Pet[] = (pets as Pet[] | undefined) || mockPets;
  const displayKennels: Kennel[] =
    (kennels as Kennel[] | undefined) || mockKennels;

  // Submit form handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // client-side validation/coercion to provide immediate feedback
    const petIdNum = parseInt(String(data.petId));
    const kennelIdNum = parseInt(String(data.kennelId));
    const start = toDate(data.startDate);
    const end = toDate(data.endDate);

    let hasError = false;
    if (!petIdNum || isNaN(petIdNum)) {
      form.setError("petId", {
        type: "manual",
        message: "Please select a pet",
      });
      hasError = true;
    }
    if (!kennelIdNum || isNaN(kennelIdNum)) {
      form.setError("kennelId", {
        type: "manual",
        message: "Please select a kennel",
      });
      hasError = true;
    }
    if (!start) {
      form.setError("startDate", {
        type: "manual",
        message: "Invalid start date",
      });
      hasError = true;
    }
    if (!end) {
      form.setError("endDate", { type: "manual", message: "Invalid end date" });
      hasError = true;
    }
    if (start && end && start >= end) {
      form.setError("endDate", {
        type: "manual",
        message: "End date must be after start date",
      });
      hasError = true;
    }

    if (hasError) return;

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
    petsLoading || kennelsLoading || (isEditMode && boardingStayLoading);
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode
              ? "Edit Boarding Reservation"
              : "New Boarding Reservation"}
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isMutating}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {displayPets.map((pet) => (
                            <SelectItem key={pet.id} value={String(pet.id)}>
                              {pet.name} ({pet.ownerName}) - {pet.species}
                              {pet.breed ? `, ${pet.breed}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the pet for this boarding stay
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kennelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kennel</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isMutating}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a kennel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {displayKennels.map((kennel) => (
                            <SelectItem
                              key={kennel.id}
                              value={String(kennel.id)}
                            >
                              {kennel.name} - {kennel.type} ({kennel.size})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select an available kennel
                      </FormDescription>
                      <FormMessage />
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
                              className={
                                !field.value ? "text-muted-foreground" : ""
                              }
                              disabled={isMutating}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {toDate(field.value)
                                ? format(toDate(field.value) as Date, "PP")
                                : "Select date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the boarding stay will begin
                      </FormDescription>
                      <FormMessage />
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
                              className={
                                !field.value ? "text-muted-foreground" : ""
                              }
                              disabled={isMutating}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {toDate(field.value)
                                ? format(toDate(field.value) as Date, "PP")
                                : "Select date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the boarding stay will end
                      </FormDescription>
                      <FormMessage />
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
                      <FormLabel>Daily Rate ($)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0.00"
                          {...field}
                          disabled={isMutating}
                        />
                      </FormControl>
                      <FormDescription>
                        Daily cost for the boarding stay
                      </FormDescription>
                      <FormMessage />
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
                        />
                      </FormControl>
                      <FormMessage />
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
                        />
                      </FormControl>
                      <FormMessage />
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
                      />
                    </FormControl>
                    <FormDescription>
                      Any specific requirements for caring for this pet
                    </FormDescription>
                    <FormMessage />
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
                      />
                    </FormControl>
                    <FormDescription>
                      Internal notes about this boarding stay
                    </FormDescription>
                    <FormMessage />
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
                      href={`/admin/boarding/boarding-stay/${String(
                        params?.id
                      )}`}
                    >
                      <Button variant="outline" disabled={isMutating}>
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={isMutating}>
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
                  <Button type="submit" disabled={isMutating}>
                    {isMutating ? "Creating..." : "Create Reservation"}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>

          {form.formState.errors.root && (
            <div className="text-red-500 text-sm">
              {form.formState.errors.root.message}
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
