"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { compressImage, validateImageFile } from "@/lib/image-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  UserCircle,
  PlusCircle,
  Loader2,
  Camera,
  X,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { useTenantInfo } from "@/hooks/use-tenant-info";
import { getPetAvatarColors } from "@/lib/utils";
import { SimpleCustomFieldSelect } from "@/components/form/simple-custom-field-select";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { queryClient } from "@/lib/queryClient";
import {
  useOfflineClients,
  type Client,
} from "@/hooks/offline/clients_pets/use-offline-clients";
import { useOfflinePets } from "@/hooks/offline/clients_pets/use-offline-pets";
import { useNetworkStatus } from "@/hooks/use-network-status";

// Predefined lists for dropdowns
const speciesList = [
  { value: "Dog", label: "Dog" },
  { value: "Cat", label: "Cat" },
  { value: "Bird", label: "Bird" },
  { value: "Rabbit", label: "Rabbit" },
  { value: "Hamster", label: "Hamster" },
  { value: "Guinea Pig", label: "Guinea Pig" },
  { value: "Ferret", label: "Ferret" },
  { value: "Reptile", label: "Reptile" },
  { value: "Fish", label: "Fish" },
  { value: "Other", label: "Other" },
];

const breedsList: Record<string, { value: string; label: string }[]> = {
  Dog: [
    { value: "Mixed Breed", label: "Mixed Breed" },
    { value: "Labrador Retriever", label: "Labrador Retriever" },
    { value: "German Shepherd", label: "German Shepherd" },
    { value: "Golden Retriever", label: "Golden Retriever" },
    { value: "Beagle", label: "Beagle" },
    { value: "Poodle", label: "Poodle" },
    { value: "Rottweiler", label: "Rottweiler" },
    { value: "Yorkshire Terrier", label: "Yorkshire Terrier" },
    { value: "Dachshund", label: "Dachshund" },
  ],
  Cat: [
    { value: "Domestic Shorthair", label: "Domestic Shorthair" },
    { value: "Domestic Longhair", label: "Domestic Longhair" },
    { value: "Siamese", label: "Siamese" },
    { value: "Persian", label: "Persian" },
    { value: "Maine Coon", label: "Maine Coon" },
    { value: "Ragdoll", label: "Ragdoll" },
  ],
};

const genderList = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Male (Neutered)", label: "Male (Neutered)" },
  { value: "Female (Spayed)", label: "Female (Spayed)" },
  { value: "Unknown", label: "Unknown" },
];

const colorList = [
  { value: "Black", label: "Black" },
  { value: "White", label: "White" },
  { value: "Brown", label: "Brown" },
  { value: "Gray", label: "Gray" },
  { value: "Tan", label: "Tan" },
  { value: "Golden", label: "Golden" },
  { value: "Cream", label: "Cream" },
  { value: "Orange", label: "Orange" },
  { value: "Red", label: "Red" },
  { value: "Blue", label: "Blue" },
  { value: "Black & White", label: "Black & White" },
  { value: "Brown & White", label: "Brown & White" },
  { value: "Calico", label: "Calico" },
  { value: "Tabby", label: "Tabby" },
  { value: "Brindle", label: "Brindle" },
  { value: "Spotted", label: "Spotted" },
  { value: "Merle", label: "Merle" },
  { value: "Tricolor", label: "Tricolor" },
  { value: "Other", label: "Other" },
];

// Client form schema
const clientEditFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" }),
  phone: z.string().optional(),
  smsOptOut: z.boolean().default(false),
  // Address fields
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  // Emergency contact fields
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
});

type ClientEditFormValues = z.infer<typeof clientEditFormSchema>;

// Pet form schema
const petFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  species: z.string().min(2, { message: "Species is required" }),
  breed: z.string().optional(),
  dateOfBirth: z.string().optional(),
  weight: z.string().optional(),
  allergies: z.string().optional(),
  color: z.string().optional(),
  gender: z.string().optional(),
  microchipNumber: z.string().optional(),
  pet_type: z.string().optional(), // For Pet Information custom field
  ownerId: z.string({ message: "Owner is required" }),
  practiceId: z.string({ message: "Practice is required" }),
  // photoPath is handled separately via file upload
});

type PetFormValues = z.infer<typeof petFormSchema>;

// Combobox component for searchable dropdown
function ComboboxSelect({
  options,
  value,
  onValueChange,
  placeholder,
  className,
  emptyMessage = "No option found.",
}: {
  options: { value: string; label: string }[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder || "Select option..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder?.toLowerCase() || "options"}...`}
          />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Network status - use ref to always get current value
  const { isOnline } = useNetworkStatus();
  const isOnlineRef = useRef(isOnline);

  // Keep ref in sync with state
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Offline hooks
  const { updateClient: updateOfflineClient, refresh: refreshOfflineClients } =
    useOfflineClients();

  const { refresh: refreshOfflinePets } = useOfflinePets();

  // Fetch client data
  const {
    data: client,
    isLoading: isClientLoading,
    isError: isClientError,
  } = useQuery({
    queryKey: ["/api/users", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${clientId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch client data");
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch client's pets
  const {
    data: pets,
    isLoading: isPetsLoading,
    isError: isPetsError,
  } = useQuery({
    queryKey: ["/api/pets/owner", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/pets?clientId=${clientId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pets data");
      return res.json();
    },
    enabled: !!clientId,
  });

  // Edit client form
  const form = useForm<ClientEditFormValues>({
    resolver: zodResolver(clientEditFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      phone: "",
      smsOptOut: false,
      // Address fields
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      // Emergency contact fields
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
    },
  });

  // Update form values when client data is loaded
  useEffect(() => {
    if (client) {
      // Debug: log the client object received from GET /api/users/:id
      try {
        console.log("[ClientDetail] client loaded:", client);
      } catch (e) {
        console.log("[ClientDetail] client loaded - (stringify failed)", e);
      }
      form.reset({
        name: client.name,
        email: client.email,
        username: client.username || "",
        phone: client.phone || "",
        smsOptOut: client.smsOptOut || false,
        // Address fields
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zipCode: client.zipCode || "",
        country: client.country || "",
        // Emergency contact fields
        emergencyContactName: client.emergencyContactName || "",
        emergencyContactPhone: client.emergencyContactPhone || "",
        emergencyContactRelationship: client.emergencyContactRelationship || "",
      });
    }
  }, [client, form]);

  useEffect(() => {
    if (client && isEditDialogOpen) {
      // Debug: log the client before resetting the edit form (when dialog opens)
      try {
        console.log("[ClientDetail] edit dialog opened - client:", client);
      } catch (e) {
        console.log("[ClientDetail] edit dialog opened - stringify failed", e);
      }
      form.reset({
        name: client.name,
        email: client.email,
        username: client.username || "",
        phone: client.phone || "",
        smsOptOut: client.smsOptOut || false,
        // Address fields
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zipCode: client.zipCode || "",
        country: client.country || "",
        // Emergency contact fields
        emergencyContactName: client.emergencyContactName || "",
        emergencyContactPhone: client.emergencyContactPhone || "",
        emergencyContactRelationship: client.emergencyContactRelationship || "",
      });
    }
  }, [isEditDialogOpen, client, form]);

  // Update client mutation
  const updateClientMutation = useMutation({
    // CRITICAL: Set networkMode to 'always' to execute mutation even when offline
    // Without this, React Query pauses mutations when it detects offline status
    networkMode: "always",
    mutationFn: async (data: ClientEditFormValues) => {
      // Debug: log the outgoing request body
      try {
        console.log("[ClientDetail] update mutation - sending body:", data);
        console.log("[ClientDetail] isOnlineRef.current:", isOnlineRef.current);
        console.log("[ClientDetail] navigator.onLine:", navigator.onLine);
      } catch (e) {
        console.log("[ClientDetail] update mutation - stringify failed", e);
      }

      // CRITICAL: Use ref to get CURRENT network status at execution time
      // Check both the ref and navigator.onLine for accuracy
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      // If offline, use offline-first approach
      if (!currentNetworkStatus) {
        console.log("[ClientDetail] 🔌 OFFLINE - Using offline update");
        const result = await updateOfflineClient(clientId, data as any);
        // Manually refresh to ensure UI updates
        await refreshOfflineClients();
        return result;
      }

      // If online, use API with timeout
      console.log("[ClientDetail] 🌐 ONLINE - Using API update");

      // Create fetch with timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const res = await fetch(`/api/users/${clientId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("Failed to update client");
        const json = await res.json();
        try {
          console.log(
            "[ClientDetail] update mutation - server response:",
            json
          );
        } catch (e) {
          console.log(
            "[ClientDetail] update mutation - response stringify failed",
            e
          );
        }
        return json;
      } catch (error: any) {
        clearTimeout(timeoutId);

        // If fetch was aborted or network error, try offline update as fallback
        if (error.name === "AbortError" || error.message.includes("fetch")) {
          console.log(
            "[ClientDetail] ⚠️ Fetch failed/timeout - Falling back to offline update"
          );
          const result = await updateOfflineClient(clientId, data as any);
          await refreshOfflineClients();
          return result;
        }
        throw error;
      }
    },
    onSuccess: async () => {
      // CRITICAL: Check network status before attempting to fetch fresh data
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      // Only fetch fresh data when online
      if (currentNetworkStatus) {
        try {
          // Invalidate caches and fetch the latest user row
          queryClient.invalidateQueries({ queryKey: ["/api/users/clients"] });
          const fresh = await fetch(`/api/users/${clientId}`, {
            credentials: "include",
          });
          if (fresh.ok) {
            const freshJson = await fresh.json();
            try {
              console.log(
                "[ClientDetail] onSuccess - fresh user after update:",
                freshJson
              );
            } catch {}
            // Prime the react-query cache with the fresh value
            queryClient.setQueryData(["/api/users", clientId], freshJson);
          } else {
            console.warn(
              "[ClientDetail] onSuccess - failed to fetch fresh user after update"
            );
          }
        } catch (e) {
          console.warn(
            "[ClientDetail] onSuccess - error fetching fresh user:",
            e
          );
        }

        toast({
          title: "Client updated",
          description: "Client information has been successfully updated.",
        });
      }

      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update client: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // SMS opt-out mutation
  const updateSmsOptOutMutation = useMutation({
    // CRITICAL: Set networkMode to 'always' to execute mutation even when offline
    networkMode: "always",
    mutationFn: async (optOut: boolean) => {
      // Check current network status
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      // If offline, use offline-first approach
      if (!currentNetworkStatus) {
        const result = await updateOfflineClient(clientId, {
          smsOptOut: optOut,
        } as any);
        await refreshOfflineClients();
        return result;
      }

      // If online, use API
      const res = await fetch(`/api/clients/${clientId}/sms-preference`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ smsOptOut: optOut }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update SMS preferences");
      return res.json();
    },
    onSuccess: () => {
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;
      if (currentNetworkStatus) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", clientId] });

        toast({
          title: "SMS preferences updated",
          description: `SMS notifications ${
            client?.smsOptOut ? "enabled" : "disabled"
          } for this client.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update SMS preferences: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ClientEditFormValues) => {
    // Debug: log the data we are about to send to the server
    try {
      console.log("[ClientDetail] onSubmit - data to update:", data);
    } catch (e) {
      console.log("[ClientDetail] onSubmit - stringify failed", e);
    }
    updateClientMutation.mutate(data);
  };

  // Handle SMS opt-out toggle
  const handleSmsOptOutToggle = (checked: boolean) => {
    if (client) {
      updateSmsOptOutMutation.mutate(!checked);
    }
  };

  // Loading state
  if (isClientLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" asChild>
            <Link href="/admin/clients">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-5 w-full max-w-md" />
                  <Skeleton className="h-5 w-full max-w-sm" />
                  <Skeleton className="h-5 w-full max-w-xs" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isClientError || !client) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" asChild>
            <Link href="/admin/clients">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Failed to load client information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              There was an error loading the client details. Please try again or
              contact support.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/admin/clients">Return to Clients</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button and Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/clients">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/clients?addPet=${clientId}`}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Pet
            </Link>
          </Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Client
          </Button>
        </div>
      </div>

      {/* Client Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Detailed information about {client.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-xl">
                {client.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-3 flex-1">
              <div>
                <h3 className="text-xl font-semibold flex items-center">
                  <UserCircle className="mr-2 h-5 w-5" /> {client.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Username: {client.username}
                </p>
              </div>

              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                <span>{client.email}</span>
              </div>

              {client.phone && (
                <div className="flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  <span>{client.phone}</span>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="sms-notifications"
                  checked={!client.smsOptOut}
                  onCheckedChange={handleSmsOptOutToggle}
                  disabled={updateSmsOptOutMutation.isPending}
                />
                <Label htmlFor="sms-notifications">
                  SMS Notifications {client.smsOptOut ? "Disabled" : "Enabled"}
                </Label>
              </div>

              {/* Display address information if available */}
              {(client.address ||
                client.city ||
                client.state ||
                client.zipCode ||
                client.country) && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-1">Address</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {client.address && <p>{client.address}</p>}
                    {(client.city || client.state || client.zipCode) && (
                      <p>
                        {client.city && `${client.city}`}
                        {client.city && client.state && ", "}
                        {client.state && `${client.state}`}
                        {(client.city || client.state) && client.zipCode && " "}
                        {client.zipCode && `${client.zipCode}`}
                      </p>
                    )}
                    {client.country && <p>{client.country}</p>}
                  </div>
                </div>
              )}

              {/* Display emergency contact if available */}
              {(client.emergencyContactName ||
                client.emergencyContactPhone) && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-1">
                    Emergency Contact
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {client.emergencyContactName && (
                      <p>{client.emergencyContactName}</p>
                    )}
                    {client.emergencyContactPhone && (
                      <p>Phone: {client.emergencyContactPhone}</p>
                    )}
                    {client.emergencyContactRelationship && (
                      <p>Relationship: {client.emergencyContactRelationship}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pets Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pets</CardTitle>
          <CardDescription>Pets owned by this client</CardDescription>
        </CardHeader>
        <CardContent>
          {isPetsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : isPetsError ? (
            <p>Failed to load pets information.</p>
          ) : pets && pets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pets.map((pet: any) => (
                <Card key={pet.id} className="overflow-hidden">
                  <div className="flex">
                    <div className="w-1/3 bg-muted flex items-center justify-center">
                      {pet.photoPath ? (
                        <img
                          src={pet.photoPath}
                          alt={pet.name}
                          className="h-32 w-full object-cover"
                        />
                      ) : (
                        <div className="h-32 w-full flex items-center justify-center bg-muted text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="w-2/3 p-4">
                      <h4 className="font-semibold">{pet.name}</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        <p>
                          {pet.species} {pet.breed ? `- ${pet.breed}` : ""}
                        </p>
                        {pet.gender && <p>Gender: {pet.gender}</p>}
                        {pet.color && <p>Color: {pet.color}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        asChild
                      >
                        <Link
                          href={`/admin/clients/${clientId}/pets/${pet.id}`}
                        >
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                No pets found for Client ID: {clientId}
              </p>
              <Button className="mt-4" asChild>
                <Link href={`/admin/clients?addPet=${clientId}`}>
                  Add a Pet
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
        {pets && pets.length > 0 && (
          <CardFooter>
            <Button asChild>
              <Link href={`/admin/clients?addPet=${clientId}`}>
                Add New Pet
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information. This will not change their password.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 pt-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(123) 456-7890" {...field} />
                    </FormControl>
                    <FormDescription>
                      Used for appointment reminders and notifications.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smsOptOut"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        SMS Notifications
                      </FormLabel>
                      <FormDescription>
                        Allow sending SMS notifications to this client.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!field.value}
                        onCheckedChange={(checked) => field.onChange(!checked)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Address Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Anytown" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input placeholder="CA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip/Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="USA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyContactRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <FormControl>
                            <Input placeholder="Spouse" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
