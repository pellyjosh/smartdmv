"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import {
  isPracticeAdministrator,
  isVeterinarian,
  isAdmin,
} from "@/lib/rbac-helpers";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Define the schema for adding vaccinations - simplified to match backend
const VaccinationFormSchema = z.object({
  petId: z.number({
    required_error: "Pet is required",
  }),
  vaccineTypeId: z.number().optional(),
  vaccineName: z.string().min(1, "Vaccine name is required"),
  manufacturer: z.string().optional(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  administeringVetId: z.number().optional(),
  administrationDate: z.date({
    required_error: "Administration date is required",
  }),
  expirationDate: z.date().optional(),
  administrationSite: z.string().optional(),
  route: z
    .enum(["subcutaneous", "intramuscular", "intranasal", "oral", "topical"])
    .optional(),
  dose: z.string().optional(),
  nextDueDate: z.date().optional(),
  notes: z.string().optional(),
  reactions: z.string().optional(),
  status: z
    .enum(["completed", "scheduled", "missed", "cancelled"])
    .default("completed"),
});

type VaccinationFormValues = z.infer<typeof VaccinationFormSchema>;

const AddVaccinationPage = () => {
  const { user, userPracticeId, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [selectedVaccineType, setSelectedVaccineType] = useState<any>(null);

  const petId = searchParams.get("petId");

  // Authorization check
  useEffect(() => {
    if (!isUserLoading && user) {
      // Allow practice admins, super admins, veterinarians and administrators to add vaccinations
      const canAddVaccinations =
        isPracticeAdministrator(user as any) ||
        isVeterinarian(user as any) ||
        isAdmin(user as any);
      if (!canAddVaccinations) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to add vaccination records",
          variant: "destructive",
        });
        router.push("/admin/vaccinations");
      }
    }
  }, [user, isUserLoading, router, toast]);

  // Set up form
  const form = useForm<VaccinationFormValues>({
    resolver: zodResolver(VaccinationFormSchema),
    defaultValues: {
      petId: petId ? parseInt(petId) : undefined,
      vaccineName: "",
      administrationDate: new Date(),
      status: "completed",
      // Set current user as administering vet if they are a veterinarian
      administeringVetId:
        user && isVeterinarian(user as any) ? Number(user.id) : undefined,
    },
  });

  const { setValue, getValues } = form;

  // Fetch pets, vaccine types, and vets
  const { data: pets, isLoading: isLoadingPets } = useQuery({
    queryKey: ["pets", userPracticeId],
    queryFn: async () => {
      const response = await fetch(`/api/pets?practiceId=${userPracticeId}`);
      if (!response.ok) throw new Error("Failed to fetch pets");
      return response.json();
    },
    enabled: !!userPracticeId,
  });

  const { data: vaccineTypes, isLoading: isLoadingVaccineTypes } = useQuery({
    queryKey: ["vaccineTypes", userPracticeId],
    queryFn: async () => {
      const response = await fetch(
        `/api/vaccinations/types?practiceId=${userPracticeId}&isActive=true`
      );
      if (!response.ok) throw new Error("Failed to fetch vaccine types");
      return response.json();
    },
    enabled: !!userPracticeId,
  });

  const { data: vets, isLoading: isLoadingVets } = useQuery({
    queryKey: ["vets", userPracticeId],
    queryFn: async () => {
      const response = await fetch(
        `/api/users/vets?practiceId=${userPracticeId}`
      );
      if (!response.ok) throw new Error("Failed to fetch veterinarians");
      return response.json();
    },
    enabled: !!userPracticeId,
  });

  // Create vaccination mutation
  const createVaccinationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create vaccination");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vaccination record has been created successfully",
      });
      router.push(petId ? `/pets/${petId}` : "/admin/vaccinations");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to create vaccination record. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: VaccinationFormValues) => {
    if (!user || !userPracticeId) {
      toast({
        title: "Error",
        description: "User or practice not found.",
        variant: "destructive",
      });
      return;
    }

    // Add backend required fields and remove frontend-only fields
    const backendData = {
      petId: data.petId,
      vaccineTypeId: data.vaccineTypeId,
      vaccineName: data.vaccineName,
      manufacturer: data.manufacturer,
      lotNumber: data.lotNumber,
      serialNumber: data.serialNumber,
      administeringVetId: data.administeringVetId,
      administrationDate:
        data.administrationDate instanceof Date
          ? data.administrationDate.toISOString()
          : data.administrationDate,
      expirationDate:
        data.expirationDate instanceof Date
          ? data.expirationDate.toISOString()
          : data.expirationDate,
      administrationSite: data.administrationSite,
      route: data.route,
      dose: data.dose,
      nextDueDate:
        data.nextDueDate instanceof Date
          ? data.nextDueDate.toISOString()
          : data.nextDueDate,
      notes: data.notes,
      reactions: data.reactions,
      status: data.status,
    };

    createVaccinationMutation.mutate(backendData);
  };

  // Effect to update form values when a vaccine type is selected
  useEffect(() => {
    if (selectedVaccineType) {
      setValue("vaccineName", selectedVaccineType.name);
      setValue("manufacturer", selectedVaccineType.manufacturer || "");

      if (selectedVaccineType.durationOfImmunity) {
        const administrationDate = getValues("administrationDate");
        if (administrationDate) {
          let expirationDate = new Date(administrationDate);
          const durationStr =
            selectedVaccineType.durationOfImmunity.toLowerCase();

          if (durationStr.includes("year")) {
            const years = parseInt(durationStr.match(/\d+/)?.[0] || "1");
            expirationDate.setFullYear(expirationDate.getFullYear() + years);
          } else if (durationStr.includes("month")) {
            const months = parseInt(durationStr.match(/\d+/)?.[0] || "1");
            expirationDate.setMonth(expirationDate.getMonth() + months);
          }
          setValue("expirationDate", expirationDate);
          setValue("nextDueDate", new Date(expirationDate));
        }
      }
    }
  }, [selectedVaccineType, setValue, getValues]);

  // Effect to update selectedPet when petId changes
  useEffect(() => {
    if (petId && pets) {
      const pet = pets.find((p: any) => p.id === parseInt(petId));
      if (pet) {
        setSelectedPet(pet);
        setValue("petId", pet.id);
      }
    }
  }, [petId, pets, setValue]);

  // Effect to set current user as administering vet if they are a veterinarian
  useEffect(() => {
    if (
      user &&
      isVeterinarian(user as any) &&
      !form.getValues("administeringVetId")
    ) {
      setValue("administeringVetId", Number(user.id));
    }
  }, [user, setValue, form]);

  // Filter vaccine types by the selected pet's species and active status
  const filteredVaccineTypes = vaccineTypes?.filter(
    (vt: any) =>
      (!selectedPet ||
        vt.species.toLowerCase() === selectedPet.species.toLowerCase()) &&
      vt.isActive === true
  );

  if (
    isUserLoading ||
    isLoadingPets ||
    isLoadingVaccineTypes ||
    isLoadingVets
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() =>
              router.push(petId ? `/pets/${petId}` : "/admin/vaccinations")
            }
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div>
            <h1 className="text-3xl font-bold">Add Vaccination Record</h1>
            <p className="text-muted-foreground">
              Create a new vaccination record for a pet
            </p>
          </div>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Vaccination Details</CardTitle>
            <CardDescription>
              Enter the details of the vaccination administered to the pet.
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log("Form validation errors:", errors);
                toast({
                  title: "Form Validation Error",
                  description:
                    "Please check all required fields are filled correctly.",
                  variant: "destructive",
                });
              })}
            >
              <CardContent className="space-y-6">
                {/* Pet Selection */}
                <FormField
                  control={form.control}
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet *</FormLabel>
                      <Select
                        disabled={!!petId}
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          const pet = pets.find(
                            (p: any) => p.id === parseInt(value)
                          );
                          setSelectedPet(pet);
                        }}
                        defaultValue={field.value?.toString()}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pets?.map((pet: any) => (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vaccine Type */}
                  <FormField
                    control={form.control}
                    name="vaccineTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vaccine Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (value) {
                              field.onChange(parseInt(value));
                              const vaccineType = vaccineTypes.find(
                                (vt: any) => vt.id === parseInt(value)
                              );
                              setSelectedVaccineType(vaccineType);
                            } else {
                              field.onChange(undefined);
                              setSelectedVaccineType(null);
                            }
                          }}
                          defaultValue={field.value?.toString()}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a vaccine type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!selectedPet && (
                              <p className="text-xs text-muted-foreground p-2">
                                Select a pet first to see available vaccines
                              </p>
                            )}
                            {selectedPet && !filteredVaccineTypes?.length && (
                              <p className="text-xs text-muted-foreground p-2">
                                No vaccine types found for {selectedPet.species}
                              </p>
                            )}
                            {filteredVaccineTypes?.map((vaccineType: any) => (
                              <SelectItem
                                key={vaccineType.id}
                                value={vaccineType.id.toString()}
                              >
                                {vaccineType.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Optional: Select from pre-defined vaccine types or
                          enter manually below
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Vaccine Name */}
                  <FormField
                    control={form.control}
                    name="vaccineName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vaccine Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., Rabies Vaccine"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Vaccine Category */}
                  <FormField
                    control={form.control}
                    name="vaccineType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vaccine Category *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="core">Core</SelectItem>
                            <SelectItem value="non_core">Non-Core</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Core vaccines are recommended for all animals
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Manufacturer */}
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Manufacturer name"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Lot Number */}
                  <FormField
                    control={form.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lot Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Lot #"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Serial Number */}
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Serial #"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Administering Veterinarian */}
                  <FormField
                    control={form.control}
                    name="administeringVetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Administering Veterinarian</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value ? parseInt(value) : undefined)
                          }
                          defaultValue={field.value?.toString()}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select veterinarian" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vets?.map((vet: any) => (
                              <SelectItem
                                key={vet.id}
                                value={vet.id.toString()}
                              >
                                {vet.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Administration Date */}
                  <FormField
                    control={form.control}
                    name="administrationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Administration Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={"w-full pl-3 text-left font-normal"}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expiration Date */}
                  <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiration Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={"w-full pl-3 text-left font-normal"}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          When this vaccination's protection expires
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Next Due Date */}
                  <FormField
                    control={form.control}
                    name="nextDueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Next Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={"w-full pl-3 text-left font-normal"}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          When the next dose should be administered
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Administration Site */}
                  <FormField
                    control={form.control}
                    name="administrationSite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Administration Site</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., Right hind leg"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Administration Route */}
                  <FormField
                    control={form.control}
                    name="route"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Administration Route</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select route" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="subcutaneous">
                              Subcutaneous
                            </SelectItem>
                            <SelectItem value="intramuscular">
                              Intramuscular
                            </SelectItem>
                            <SelectItem value="intranasal">
                              Intranasal
                            </SelectItem>
                            <SelectItem value="oral">Oral</SelectItem>
                            <SelectItem value="topical">Topical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dose */}
                  <FormField
                    control={form.control}
                    name="dose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dose</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., 1 mL"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="missed">Missed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this vaccination"
                          className="min-h-24"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reactions */}
                <FormField
                  control={form.control}
                  name="reactions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adverse Reactions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any adverse reactions noted after administration"
                          className="min-h-24"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      petId ? `/pets/${petId}` : "/admin/vaccinations"
                    )
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createVaccinationMutation.isPending}
                >
                  {createVaccinationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Vaccination Record
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </>
  );
};

export default AddVaccinationPage;
