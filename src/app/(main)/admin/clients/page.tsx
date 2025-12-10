"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { compressImage, validateImageFile } from "@/lib/image-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { type User, type Pet } from "@/db/schema";
import { isPracticeAdministrator, isAdmin, hasRole } from "@/lib/rbac-helpers";
import { getPetAvatarColors, formatDate } from "@/lib/utils";
import { SimpleCustomFieldSelect } from "@/components/form/simple-custom-field-select";
import {
  Loader2,
  Search,
  UserPlus,
  PlusCircle,
  User as UserIcon,
  Edit,
  Trash,
  Camera,
  X,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ArrowUpRight,
  WifiOff,
} from "lucide-react";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTenantInfo } from "@/hooks/use-tenant-info";
import { getPetImageUrlClient } from "@/lib/tenant-file-utils";
import { apiRequest } from "@/lib/queryClient";
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

// Map for species-dependent breed lists
const breedsBySpecies = breedsList;

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

// (removed duplicate breedsBySpecies declaration)

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

// Client form schema

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  practiceId: z.string({ message: "Practice is required" }),
  role: z.string().default("CLIENT"),
});

const updateClientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  // Accept empty string for password on edit; transform empty -> undefined so API doesn't attempt to set it
  password: z
    .string()
    .optional()
    .transform((e) => {
      if (e === undefined || e === null) return undefined;
      if (typeof e === "string" && e.trim() === "") return undefined;
      return e;
    }),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  practiceId: z.string({ message: "Practice is required" }),
  role: z.string().default("CLIENT"),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;
type UpdateClientFormValues = z.infer<typeof updateClientFormSchema>;

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

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddPetDialogOpen, setIsAddPetDialogOpen] = useState(false);
  const [isEditPetDialogOpen, setIsEditPetDialogOpen] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] =
    useState(false);
  const [isDeletePetDialogOpen, setIsDeletePetDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [selectedPetToDelete, setSelectedPetToDelete] = useState<Pet | null>(
    null
  );
  const [petPhoto, setPetPhoto] = useState<File | null>(null);
  const [editPetId, setEditPetId] = useState<number | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [selectedAddPetSpecies, setSelectedAddPetSpecies] =
    useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, userPracticeId } = useUser();
  const tenantInfo = useTenantInfo();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Network status
  const { isOnline } = useNetworkStatus();
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Offline hooks for clients and pets
  const {
    clients: offlineClients,
    createClient: createOfflineClient,
    updateClient: updateOfflineClient,
    deleteClient: deleteOfflineClient,
    refresh: refreshOfflineClients,
    isLoading: isLoadingOfflineClients,
  } = useOfflineClients();

  const {
    pets: offlinePets,
    createPet: createOfflinePet,
    updatePet: updateOfflinePet,
    deletePet: deleteOfflinePet,
    getPetsByOwner: getOfflinePetsByOwner,
    refresh: refreshOfflinePets,
    isLoading: isLoadingOfflinePets,
  } = useOfflinePets();

  // Use the custom fields hook to access field values from the database
  const {
    groups,
    getValuesByGroupKey,
    getGroupByKey,
    getValuesByGroupId,
    error: customFieldsError,
    isLoading: isCustomFieldsLoading,
  } = useCustomFields();

  // Ensure we have an array of groups when searching by name/key
  const groupsArray: any[] = Array.isArray(groups) ? (groups as any[]) : [];

  // Create accessor functions for custom field values
  const getSpeciesList = () => {
    try {
      // Try multiple possible group keys for species
      const possibleKeys = ["pet_species", "species", "animal_species"];

      for (const key of possibleKeys) {
        const speciesValues = getValuesByGroupKey(key);
        if (speciesValues && speciesValues.length > 0) {
          console.log(
            `Using custom field species values with key ${key}:`,
            speciesValues
          );
          return speciesValues.map((v) => ({ value: v.value, label: v.label }));
        }
      }

      // Try getting all groups to find the species group
      const speciesGroup = groupsArray.find(
        (g: any) =>
          g.name?.toLowerCase().includes("species") ||
          g.key?.toLowerCase().includes("species")
      );

      if (speciesGroup) {
        console.log("Found species group by name/key search:", speciesGroup);
        const values = getValuesByGroupId(speciesGroup.id);
        if (values && values.length > 0) {
          return values.map((v) => ({ value: v.value, label: v.label }));
        }
      }
    } catch (err) {
      console.error("Error getting custom species list:", err);
    }

    // Fall back to hardcoded species if custom fields fail
    console.log("Falling back to hardcoded species list");
    return speciesList;
  };

  const getBreedsList = (species: string) => {
    try {
      // Try different formats for breed key naming
      const possibleBreedKeys = [
        `pet_breed_${species.toLowerCase().replace(/\s+/g, "_")}`,
        `breed_${species.toLowerCase().replace(/\s+/g, "_")}`,
        `${species.toLowerCase().replace(/\s+/g, "_")}_breeds`,
        "pet_breed",
        "breeds",
      ];

      // Try each possible key
      for (const key of possibleBreedKeys) {
        const breedValues = getValuesByGroupKey(key);
        if (breedValues && breedValues.length > 0) {
          console.log(
            `Using custom field breed values with key ${key}:`,
            breedValues
          );
          return breedValues.map((v) => ({ value: v.value, label: v.label }));
        }
      }

      // Try getting all groups to find a breed group
      const breedGroup = groupsArray.find(
        (g: any) =>
          (g.name?.toLowerCase().includes("breed") ||
            g.key?.toLowerCase().includes("breed")) &&
          (g.name?.toLowerCase().includes(species.toLowerCase()) ||
            g.key?.toLowerCase().includes(species.toLowerCase()))
      );

      if (breedGroup) {
        console.log(
          `Found breed group for ${species} by name/key search:`,
          breedGroup
        );
        const values = getValuesByGroupId(breedGroup.id);
        if (values && values.length > 0) {
          return values.map((v) => ({ value: v.value, label: v.label }));
        }
      }

      // Look for any breed group if we can't find a species-specific one
      const anyBreedGroup = groupsArray.find(
        (g: any) =>
          g.name?.toLowerCase().includes("breed") ||
          g.key?.toLowerCase().includes("breed")
      );

      if (anyBreedGroup) {
        console.log(
          "Found general breed group by name/key search:",
          anyBreedGroup
        );
        const values = getValuesByGroupId(anyBreedGroup.id);
        if (values && values.length > 0) {
          return values.map((v) => ({ value: v.value, label: v.label }));
        }
      }
    } catch (err) {
      console.error(`Error getting breeds list for ${species}:`, err);
    }

    // Fall back to hardcoded breeds if custom fields fail
    console.log(`Falling back to hardcoded breeds for ${species}`);
    if (!species) {
      return [];
    }
    // Find the key in a case-insensitive way to handle potential inconsistencies from the combobox
    const speciesKey = Object.keys(breedsBySpecies).find(
      (key) => key.toLowerCase() === species.toLowerCase()
    );
    // Return the breeds for the found key, or an empty array if not found
    return speciesKey
      ? breedsBySpecies[speciesKey as keyof typeof breedsBySpecies]
      : [];
  };

  const getColorList = () => {
    try {
      // Try multiple possible keys
      const possibleKeys = [
        "pet_color",
        "color",
        "colors",
        "fur_color",
        "coat_color",
      ];

      for (const key of possibleKeys) {
        const colorValues = getValuesByGroupKey(key);
        if (colorValues && colorValues.length > 0) {
          console.log(
            `Using custom field color values with key ${key}:`,
            colorValues
          );
          return colorValues.map((v) => ({ value: v.value, label: v.label }));
        }
      }

      // Try getting all groups to find color group
      const colorGroup = groupsArray.find(
        (g: any) =>
          g.name?.toLowerCase().includes("color") ||
          g.key?.toLowerCase().includes("color")
      );

      if (colorGroup) {
        console.log("Found color group by name/key search:", colorGroup);
        const values = getValuesByGroupId(colorGroup.id);
        if (values && values.length > 0) {
          return values.map((v) => ({ value: v.value, label: v.label }));
        }
      }
    } catch (err) {
      console.error("Error getting custom color list:", err);
    }

    // Fall back to hardcoded colors if custom fields fail
    console.log("Falling back to hardcoded color list");
    return colorList;
  };

  const getGenderList = () => {
    try {
      // Try multiple possible keys
      const possibleKeys = ["pet_gender", "gender", "sex", "animal_gender"];

      for (const key of possibleKeys) {
        const genderValues = getValuesByGroupKey(key);
        if (genderValues && genderValues.length > 0) {
          console.log(
            `Using custom field gender values with key ${key}:`,
            genderValues
          );
          return genderValues.map((v) => ({ value: v.value, label: v.label }));
        }
      }

      // Try getting all groups to find gender group
      const genderGroup = groupsArray.find(
        (g: any) =>
          g.name?.toLowerCase().includes("gender") ||
          g.key?.toLowerCase().includes("gender") ||
          g.name?.toLowerCase().includes("sex") ||
          g.key?.toLowerCase().includes("sex")
      );

      if (genderGroup) {
        console.log("Found gender group by name/key search:", genderGroup);
        const values = getValuesByGroupId(genderGroup.id);
        if (values && values.length > 0) {
          return values.map((v) => ({ value: v.value, label: v.label }));
        }
      }
    } catch (err) {
      console.error("Error getting custom gender list:", err);
    }

    // Fall back to hardcoded genders if custom fields fail
    console.log("Falling back to hardcoded gender list");
    return genderList;
  };

  const getPetTypeList = () => {
    try {
      // Try multiple possible keys
      const possibleKeys = ["pet_type", "type", "animal_type", "pet_types"];

      for (const key of possibleKeys) {
        const petTypeValues = getValuesByGroupKey(key);
        if (petTypeValues && petTypeValues.length > 0) {
          console.log(
            `Using custom field pet type values with key ${key}:`,
            petTypeValues
          );
          return petTypeValues.map((v) => ({ value: v.value, label: v.label }));
        }
      }

      // Try getting all groups to find pet type group
      const petTypeGroup = groupsArray.find(
        (g: any) =>
          (g.name?.toLowerCase().includes("type") &&
            g.name?.toLowerCase().includes("pet")) ||
          (g.key?.toLowerCase().includes("type") &&
            g.key?.toLowerCase().includes("pet"))
      );

      if (petTypeGroup) {
        console.log("Found pet type group by name/key search:", petTypeGroup);
        const values = getValuesByGroupId(petTypeGroup.id);
        if (values && values.length > 0) {
          return values.map((v) => ({ value: v.value, label: v.label }));
        }
      }
    } catch (err) {
      console.error("Error getting custom pet type list:", err);
    }

    // Fall back to a minimal list
    console.log("Falling back to hardcoded pet type list");
    return [
      { value: "Domestic", label: "Domestic" },
      { value: "Exotic", label: "Exotic" },
      { value: "Farm", label: "Farm" },
      { value: "Wildlife", label: "Wildlife" },
      { value: "Other", label: "Other" },
    ];
  };

  // Fetch clients (users with CLIENT role)
  const {
    data: apiClients,
    isLoading: isClientsLoading,
    refetch: refetchClients,
  } = useQuery<User[]>({
    queryKey: ["/api/users/clients", userPracticeId],
    enabled:
      !!user &&
      !hasRole(user as any, "CLIENT") &&
      !!userPracticeId &&
      userPracticeId.toString().trim() !== "" &&
      isOnline, // Only fetch when online
    queryFn: async () => {
      if (!userPracticeId || userPracticeId.toString().trim() === "") {
        throw new Error("Practice ID is required");
      }
      const res = await fetch(
        `/api/auth/clients?practiceId=${userPracticeId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
  });

  // Fetch pets
  const {
    data: apiPets,
    isLoading: isPetsLoading,
    refetch: refetchPets,
  } = useQuery<Pet[]>({
    queryKey: ["/api/pets", userPracticeId], // Include userPracticeId in the query key
    enabled: !!user && !!userPracticeId && isOnline, // Only enable when online
    queryFn: async () => {
      // Define the query function
      const res = await fetch(`/api/pets?practiceId=${userPracticeId}`, {
        // Pass practiceId to the API
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pets");
      return res.json();
    },
  });

  // Use offline data when offline, API data when online
  const clients = isOnline ? apiClients : offlineClients;
  const pets = isOnline ? apiPets : offlinePets;
  const isLoadingClients = isOnline
    ? isClientsLoading
    : isLoadingOfflineClients;
  const isLoadingPets = isOnline ? isPetsLoading : isLoadingOfflinePets;

  // Filter clients by search query
  const filteredClients = clients?.filter((client) => {
    const name = client.name ?? "";
    const email = client.email ?? "";
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  // Client form
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      practiceId: String(userPracticeId || ""),
      role: "CLIENT", // All users created on the clients page are automatically assigned CLIENT role
    },
  });

  const updateClientForm = useForm<UpdateClientFormValues>({
    resolver: zodResolver(updateClientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: undefined,
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      practiceId: String(userPracticeId || ""),
      role: "CLIENT",
    },
  });

  // Create client mutation
  const createClientMutation = useMutation({
    networkMode: "always",
    mutationFn: async (data: ClientFormValues) => {
      // Check if offline using current network status
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      if (!currentNetworkStatus) {
        return await createOfflineClient(data as any);
      }

      // If online, call API directly
      const res = await apiRequest("POST", "/api/auth/register", data);
      return await res.json();
    },
    onSuccess: (newClient) => {
      console.log("[Clients] create onSuccess - newClient:", newClient);

      // Refresh data
      if (isOnline) {
        refetchClients();
      } else {
        refreshOfflineClients();
      }

      // Show success message - toast handled by hook for offline
      if (isOnline) {
        toast({
          title: "Client created",
          description: "The client has been successfully added.",
        });
      }

      // Close dialog and reset form
      setIsAddClientDialogOpen(false);
      clientForm.reset();

      // Select the newly created client
      if (newClient) {
        const hasAddressFields =
          Object.prototype.hasOwnProperty.call(newClient, "address") ||
          Object.prototype.hasOwnProperty.call(newClient, "phone");
        if (hasAddressFields) {
          setSelectedClient(newClient);
        } else if (newClient.id) {
          // Fetch full user record as a fallback
          apiRequest("GET", `/api/users/${newClient.id}`)
            .then((res) => res.json())
            .then((fullUser) => {
              // Debug: log the full user fetched after create
              try {
                console.log(
                  "[Clients] fetched full user after create:",
                  fullUser
                );
              } catch (e) {
                console.log(
                  "[Clients] fetched full user after create - failed to stringify",
                  e
                );
              }
              setSelectedClient(fullUser);
            })
            .catch((err) => {
              console.warn("Failed to fetch full user after create:", err);
              setSelectedClient(newClient);
            });
        } else {
          setSelectedClient(newClient);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    networkMode: "always",
    mutationFn: async (data: UpdateClientFormValues & { id: string }) => {
      const { id, password, ...clientData } = data as any;

      // Check if offline using current network status
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      if (!currentNetworkStatus) {
        const updates: any = { ...clientData };
        if (password && password.length > 0) {
          updates.password = password; // Password will be handled by the hook
        }
        const result = await updateOfflineClient(id, updates);
        // Manually refresh to ensure UI updates
        await refreshOfflineClients();
        return result;
      }

      // If online, use API
      const payload: any = { ...clientData };

      if (password && password.length > 0) {
        payload.password = password;
      }

      // Coerce practiceId to number if present
      if (payload.practiceId !== undefined) {
        payload.practiceId = Number(payload.practiceId);
      }

      const res = await apiRequest("PATCH", `/api/users/${id}`, payload);
      return await res.json();
    },
    onSuccess: (updatedClient) => {
      // Refresh appropriate data source (skip for offline since already refreshed in mutationFn)
      if (isOnline) {
        refetchClients();

        toast({
          title: "Client updated",
          description: "The client has been successfully updated.",
        });
      }

      setIsEditClientDialogOpen(false);

      // Reset the form with the updated client's data, but clear password field
      if (updatedClient) {
        updateClientForm.reset({
          name: updatedClient.name || "",
          email: updatedClient.email || "",
          password: undefined,
          phone: updatedClient.phone || "",
          address: updatedClient.address || "",
          city: updatedClient.city || "",
          state: updatedClient.state || "",
          zipCode: updatedClient.zipCode || "",
          country: updatedClient.country || "",
          emergencyContactName: updatedClient.emergencyContactName || "",
          emergencyContactPhone: updatedClient.emergencyContactPhone || "",
          emergencyContactRelationship:
            updatedClient.emergencyContactRelationship || "",
          practiceId: String(updatedClient.practiceId || userPracticeId || ""),
          role: updatedClient.role || "CLIENT",
        });
        setSelectedClient(updatedClient); // Update selected client in state
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    networkMode: "always",
    mutationFn: async (id: string) => {
      // Check if offline using current network status
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      if (!currentNetworkStatus) {
        await deleteOfflineClient(id);
        return id;
      }

      // If online, use API
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete client");
      }
      return id;
    },
    onSuccess: (deletedId) => {
      // Refresh appropriate data source
      if (isOnline) {
        refetchClients();
        refetchPets();
      } else {
        refreshOfflineClients();
        refreshOfflinePets();
      }

      // Only show toast if online (offline hook handles it)
      if (isOnline) {
        toast({
          title: "Client deleted",
          description: "The client has been successfully deleted.",
        });
      }

      // Close dialog
      setIsDeleteClientDialogOpen(false);

      // Clear selected client if it was the one deleted
      if (selectedClient && String(selectedClient.id) === String(deletedId)) {
        setSelectedClient(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pet form
  const petForm = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: "",
      species: "",
      breed: "",
      dateOfBirth: "",
      weight: "",
      allergies: "",
      color: "",
      gender: "",
      microchipNumber: "",
      ownerId: "0",
      practiceId: userPracticeId || "0",
    },
  });

  // Keep critical IDs in sync with selected client/practice for Add Pet
  const safeDateToInput = (val: any) => {
    try {
      if (!val) return "";
      // If it's already a string in YYYY-MM-DD, accept it
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
        return val.split("T")[0];
      const d = new Date(val);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    if (selectedClient) {
      petForm.setValue("ownerId", String(selectedClient.id));
    }
    if (userPracticeId) {
      petForm.setValue("practiceId", String(userPracticeId));
    }
  }, [selectedClient, userPracticeId]);

  // Handle URL parameters for navigation from client detail pages
  useEffect(() => {
    if (clients && clients.length > 0 && searchParams) {
      const addPet = searchParams.get("addPet");
      if (addPet) {
        // Find the client with the matching ID
        const clientToSelect = clients.find(
          (client: User | Client) => String(client.id) === String(addPet)
        );
        if (clientToSelect) {
          // Select the client and open the add pet dialog
          setSelectedClient(clientToSelect as User);
          setIsAddPetDialogOpen(true);

          // Clean up the URL by removing the parameter (optional)
          // This prevents the dialog from reopening if user refreshes
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("addPet");
          window.history.replaceState({}, "", newUrl.toString());
        }
      }
    }
  }, [clients, searchParams]);

  // Create pet mutation
  const createPetMutation = useMutation({
    networkMode: "always",
    mutationFn: async (data: PetFormValues) => {
      try {
        // Check if offline using current network status
        const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

        if (!currentNetworkStatus) {
          return await createOfflinePet(data as any, petPhoto);
        }

        // If online, upload photo first then create pet
        let photoPath: string | null = null;
        if (petPhoto) {
          const formData = new FormData();
          formData.append("photo", petPhoto);
          formData.append("practiceId", String(userPracticeId || "general"));
          formData.append("clientId", String(data.ownerId));
          formData.append("petId", "new");

          const uploadRes = await fetch("/api/pets/upload-photo", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          if (!uploadRes.ok) {
            const errText = await uploadRes.text().catch(() => "");
            throw new Error(errText || "Failed to upload pet photo");
          }
          const uploadData = await uploadRes.json();
          photoPath = uploadData.photoPath;
        }

        // Create the pet with the photo path
        const petData: any = { ...data };
        if (photoPath) {
          petData.photoPath = photoPath;
        }

        // Coerce numeric ids to numbers (API expects numbers)
        if (petData.ownerId !== undefined)
          petData.ownerId = Number(petData.ownerId);
        if (petData.practiceId !== undefined)
          petData.practiceId = Number(petData.practiceId);

        const res = await apiRequest("POST", "/api/pets", petData);
        return await res.json();
      } catch (error) {
        console.error("Error in create pet flow:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Refresh data
      if (isOnline) {
        refetchPets();
      } else {
        refreshOfflinePets();
      }

      // Show success message - toast handled by hook for offline
      if (isOnline) {
        toast({
          title: "Pet created",
          description: "The pet has been successfully added.",
        });
      }

      setIsAddPetDialogOpen(false);
      setPetPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      petForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create pet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update pet mutation
  const updatePetMutation = useMutation({
    networkMode: "always",
    mutationFn: async (data: PetFormValues & { id: number }) => {
      try {
        const { id, ...updateData } = data;

        // Check if offline using current network status
        const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

        if (!currentNetworkStatus) {
          const result = await updateOfflinePet(
            id,
            updateData as any,
            petPhoto
          );
          // Manually refresh to ensure UI updates
          await refreshOfflinePets();
          return result;
        }

        // If online, upload photo first then update pet
        let photoPath: string | undefined = undefined;
        if (petPhoto) {
          const formData = new FormData();
          formData.append("photo", petPhoto);
          formData.append("practiceId", String(userPracticeId || "general"));
          formData.append("clientId", String(data.ownerId));
          formData.append("petId", String(data.id));

          const uploadRes = await fetch("/api/pets/upload-photo", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          if (!uploadRes.ok) {
            const errText = await uploadRes.text().catch(() => "");
            throw new Error(errText || "Failed to upload pet photo");
          }
          const uploadData = await uploadRes.json();
          photoPath = uploadData.photoPath;
        }

        // Create the pet update data with the photo path
        const petData: any = { ...updateData };
        if (photoPath) petData.photoPath = photoPath;

        // Coerce numeric ids to numbers
        if (petData.ownerId !== undefined)
          petData.ownerId = Number(petData.ownerId);
        if (petData.practiceId !== undefined)
          petData.practiceId = Number(petData.practiceId);

        const res = await apiRequest("PATCH", `/api/pets/${id}`, petData);
        return await res.json();
      } catch (error) {
        console.error("Error in update pet flow:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Refresh appropriate data source (skip for offline since already refreshed in mutationFn)
      if (isOnline) {
        refetchPets();

        toast({
          title: "Pet updated",
          description: "The pet has been successfully updated.",
        });
      }

      setIsEditPetDialogOpen(false);
      setPetPhoto(null);
      setEditPetId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      petForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update pet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete pet mutation
  const deletePetMutation = useMutation({
    networkMode: "always",
    mutationFn: async (id: number) => {
      // Check if offline using current network status
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      if (!currentNetworkStatus) {
        await deleteOfflinePet(id);
        return {};
      }

      // If online, use API
      const res = await apiRequest("DELETE", `/api/pets/${id}`);
      return await res.json().catch(() => ({}));
    },
    onSuccess: () => {
      // Refresh appropriate data source
      if (isOnline) {
        refetchPets();
      } else {
        refreshOfflinePets();
      }

      // Only show toast if online (offline hook handles it)
      if (isOnline) {
        toast({
          title: "Pet deleted",
          description: "The pet has been removed.",
        });
      }

      setIsDeletePetDialogOpen(false);
      setSelectedPetToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete pet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle selecting a client
  const handleClientSelect = (client: User | Client) => {
    setSelectedClient(client as User);
    // Set owner ID in pet form
    petForm.setValue("ownerId", String(client.id));
    // Set practice ID in pet form if it exists
    if (userPracticeId) {
      petForm.setValue("practiceId", userPracticeId);
    }
  };

  const onClientFormSubmit = (
    data: ClientFormValues | UpdateClientFormValues
  ) => {
    // Adjust type to accept both
    // The selectedClient will already be populated if it's an edit action
    if (selectedClient && isEditClientDialogOpen) {
      // This is an update operation
      // Ensure you pass the correct ID to the mutation
      updateClientMutation.mutate({
        ...(data as UpdateClientFormValues), // Cast to UpdateClientFormValues for clarity
        id: String(selectedClient.id), // Pass the actual ID of the selected client as string
      });
    } else {
      // This is a create operation
      createClientMutation.mutate(data as ClientFormValues); // Cast to ClientFormValues
    }
  };

  // Open edit client dialog with the selected client's data
  const handleEditClient = () => {
    if (!selectedClient) return;

    // The client item in the list may be a lightweight representation (no
    // address/emergency fields). Fetch the full user record to ensure the
    // edit modal is populated with all persisted fields.
    const fetchFullUser = async () => {
      try {
        const res = await apiRequest("GET", `/api/users/${selectedClient.id}`);
        const fullUser = await res.json();
        // Update selected client state with the full row
        setSelectedClient(fullUser);

        updateClientForm.reset({
          name: fullUser.name || "",
          email: fullUser.email || "",
          // password: "", // Always clear password for security when opening edit form
          phone: fullUser.phone || "",
          address: fullUser.address || "",
          city: fullUser.city || "",
          state: fullUser.state || "",
          zipCode: fullUser.zipCode || "",
          country: fullUser.country || "",
          emergencyContactName: fullUser.emergencyContactName || "",
          emergencyContactPhone: fullUser.emergencyContactPhone || "",
          emergencyContactRelationship:
            fullUser.emergencyContactRelationship || "",
          practiceId: String(fullUser.practiceId || userPracticeId || ""),
          role: fullUser.role || "CLIENT",
        });
        setIsEditClientDialogOpen(true);
      } catch (err) {
        console.warn(
          "Failed to fetch full user for edit, falling back to lightweight data:",
          err
        );
        // Fallback to whatever data we have
        updateClientForm.reset({
          name: selectedClient.name || "",
          email: selectedClient.email || "",
          phone: selectedClient.phone || "",
          address: selectedClient.address || "",
          city: selectedClient.city || "",
          state: selectedClient.state || "",
          zipCode: selectedClient.zipCode || "",
          country: selectedClient.country || "",
          emergencyContactName: selectedClient.emergencyContactName || "",
          emergencyContactPhone: selectedClient.emergencyContactPhone || "",
          emergencyContactRelationship:
            selectedClient.emergencyContactRelationship || "",
          practiceId: String(selectedClient.practiceId || userPracticeId || ""),
          role: selectedClient.role || "CLIENT",
        });
        setIsEditClientDialogOpen(true);
      }
    };

    fetchFullUser();
  };

  // Handle pet form submission
  const onPetFormSubmit = (data: PetFormValues) => {
    if (editPetId) {
      // Update existing pet
      updatePetMutation.mutate({
        ...data,
        id: editPetId as number,
      });
    } else {
      // Create new pet
      createPetMutation.mutate(data);
    }
  };

  // Get client's pets
  const clientPets = pets?.filter(
    (pet) => selectedClient && pet.ownerId === selectedClient.id
  );

  // Determine if the user has permission to view this page
  const hasPermission = user && !hasRole(user as any, "CLIENT");

  if (!user) return null;

  if (!hasPermission) {
    return (
      <div className="h-full">
        <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to view this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                This page is only accessible to practice staff and
                administrators.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="h-full">
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
          Clients & Pets
          {!isOnline && (
            <Badge variant="secondary" className="gap-1.5">
              <WifiOff className="h-3 w-3" />
              Offline Mode
            </Badge>
          )}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Client List */}
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Clients</CardTitle>
                  <Dialog
                    open={isAddClientDialogOpen}
                    onOpenChange={setIsAddClientDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Client
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[900px]">
                      <DialogHeader>
                        <DialogTitle>Add New Client</DialogTitle>
                        <DialogDescription>
                          Add a new client to your practice. Clients created
                          here will automatically be assigned the CLIENT role.
                        </DialogDescription>
                      </DialogHeader>

                      <Form {...clientForm}>
                        <form
                          onSubmit={clientForm.handleSubmit(onClientFormSubmit)}
                          className="space-y-4 pt-4"
                        >
                          {/* Main form grid with two columns */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left column - Contact Details */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Contact Details
                              </h3>

                              <FormField
                                control={clientForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="John Smith"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={clientForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="email"
                                        placeholder="john@example.com"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={clientForm.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="(555) 123-4567"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={clientForm.control}
                                name="username"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="johnsmith"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={clientForm.control}
                                name="password"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="password"
                                        placeholder="********"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Emergency Contact */}
                              <div className="space-y-4 pt-2">
                                <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  Emergency Contact
                                </h3>

                                <FormField
                                  control={clientForm.control}
                                  name="emergencyContactName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Name</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Jane Smith"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={clientForm.control}
                                    name="emergencyContactPhone"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="(555) 987-6543"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={clientForm.control}
                                    name="emergencyContactRelationship"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Relationship</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Spouse"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Right column - Address Information */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Address Information
                              </h3>

                              <FormField
                                control={clientForm.control}
                                name="address"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Street Address</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="123 Main St"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={clientForm.control}
                                  name="city"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>City</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Anytown"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={clientForm.control}
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
                                  control={clientForm.control}
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
                                  control={clientForm.control}
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

                          <DialogFooter>
                            <Button
                              type="submit"
                              disabled={createClientMutation.isPending}
                            >
                              {createClientMutation.isPending
                                ? "Adding..."
                                : "Add Client"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pb-0 h-[calc(100vh-320px)] overflow-y-auto">
                {isLoadingClients ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                  </div>
                ) : filteredClients && filteredClients.length > 0 ? (
                  <div className="space-y-2">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className={`p-3 rounded-md hover:bg-slate-100 transition-colors ${
                          selectedClient?.id === client.id ? "bg-slate-100" : ""
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center cursor-pointer"
                            onClick={() => handleClientSelect(client)}
                          >
                            <span className="text-primary-700 font-semibold text-lg">
                              {(client.name || client.email)
                                ?.charAt(0)
                                ?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div
                            className="ml-3 flex-grow cursor-pointer"
                            onClick={() => handleClientSelect(client)}
                          >
                            <p className="font-medium text-slate-900">
                              {client.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {client.email}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="shrink-0"
                            >
                              <Link href={`/admin/clients/${client.id}`}>
                                View
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(client as User);
                                setIsDeleteClientDialogOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">
                      No clients found
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {searchQuery
                        ? "Try a different search term"
                        : "Add your first client to get started"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Client Details & Pets */}
          <div className="md:col-span-2">
            {selectedClient ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedClient.name}</CardTitle>
                      <CardDescription>{selectedClient.email}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditClient}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Dialog
                        open={isAddPetDialogOpen}
                        onOpenChange={setIsAddPetDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Pet
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[900px]">
                          <DialogHeader>
                            <DialogTitle>Add New Pet</DialogTitle>
                            <DialogDescription>
                              Add a new pet for {selectedClient.name}.
                            </DialogDescription>
                          </DialogHeader>

                          <Form {...petForm}>
                            <form
                              onSubmit={petForm.handleSubmit(onPetFormSubmit)}
                              className="space-y-4 pt-4"
                            >
                              {/* Main form grid with two columns */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left column - Basic Information */}
                                <div className="space-y-4">
                                  <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Basic Information
                                  </h3>

                                  <FormField
                                    control={petForm.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Pet Name</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Buddy"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={petForm.control}
                                    name="species"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Species</FormLabel>
                                        <FormControl>
                                          <ComboboxSelect
                                            options={getSpeciesList()}
                                            value={field.value}
                                            onValueChange={(value) => {
                                              field.onChange(value);
                                              setSelectedAddPetSpecies(value);
                                              // Clear breed when species changes
                                              petForm.setValue("breed", "");
                                            }}
                                            placeholder="Select species"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={petForm.control}
                                    name="breed"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Breed</FormLabel>
                                        <FormControl>
                                          <ComboboxSelect
                                            options={
                                              selectedAddPetSpecies
                                                ? getBreedsList(
                                                    selectedAddPetSpecies
                                                  )
                                                : []
                                            }
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Select breed"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={petForm.control}
                                    name="color"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Color</FormLabel>
                                        <FormControl>
                                          <ComboboxSelect
                                            options={getColorList()}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Select color"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={petForm.control}
                                    name="gender"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Gender</FormLabel>
                                        <FormControl>
                                          <ComboboxSelect
                                            options={getGenderList()}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Select gender"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Pet Photo Upload Field */}
                                  <FormItem className="space-y-4">
                                    <FormLabel>Pet Photo</FormLabel>
                                    <div className="flex flex-col items-start gap-4">
                                      {/* Photo Preview */}
                                      {petPhoto && (
                                        <div className="relative w-32 h-32 rounded-md overflow-hidden border border-border">
                                          <img
                                            src={URL.createObjectURL(petPhoto)}
                                            alt="Pet preview"
                                            className="w-full h-full object-cover"
                                          />
                                          <Button
                                            variant="destructive"
                                            size="icon"
                                            type="button"
                                            className="absolute top-1 right-1 w-6 h-6 rounded-full"
                                            onClick={() => {
                                              setPetPhoto(null);
                                              if (fileInputRef.current) {
                                                fileInputRef.current.value = "";
                                              }
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}

                                      {/* Upload Button */}
                                      {!petPhoto ? (
                                        <div className="grid w-full max-w-sm items-center gap-1.5">
                                          <Label
                                            htmlFor="pet-photo"
                                            className="sr-only"
                                          >
                                            Pet Photo
                                          </Label>
                                          <div
                                            className="border-2 border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() =>
                                              fileInputRef.current?.click()
                                            }
                                          >
                                            <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                                            <p className="text-sm font-medium text-center">
                                              Click to upload a photo
                                            </p>
                                            <p className="text-xs text-muted-foreground text-center mt-1">
                                              PNG, JPG or JPEG
                                            </p>
                                          </div>
                                          <Input
                                            id="pet-photo"
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={async (e) => {
                                              const file =
                                                e.target.files?.[0] || null;
                                              if (file) {
                                                // Validate file
                                                const validation =
                                                  validateImageFile(file, 5);
                                                if (!validation.valid) {
                                                  toast({
                                                    title: "Invalid file",
                                                    description:
                                                      validation.error,
                                                    variant: "destructive",
                                                  });
                                                  return;
                                                }

                                                try {
                                                  // Compress image
                                                  const compressedFile =
                                                    await compressImage(
                                                      file,
                                                      800,
                                                      600,
                                                      0.8
                                                    );
                                                  setPetPhoto(compressedFile);
                                                  toast({
                                                    title: "Photo selected",
                                                    description: `Original: ${(
                                                      file.size /
                                                      1024 /
                                                      1024
                                                    ).toFixed(
                                                      2
                                                    )}MB → Compressed: ${(
                                                      compressedFile.size /
                                                      1024 /
                                                      1024
                                                    ).toFixed(
                                                      2
                                                    )}MB (Ready for upload)`,
                                                  });
                                                } catch (error) {
                                                  console.error(
                                                    "Image compression failed:",
                                                    error
                                                  );
                                                  // Fall back to original file if compression fails
                                                  setPetPhoto(file);
                                                }
                                              }
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          type="button"
                                          className="mt-2"
                                          onClick={() => {
                                            fileInputRef.current?.click();
                                          }}
                                        >
                                          <Camera className="h-4 w-4 mr-2" />
                                          Change Photo
                                        </Button>
                                      )}
                                    </div>
                                    <FormDescription>
                                      Upload a photo of the pet (optional).
                                      Recommended: 800x600px or larger, max 5MB.
                                      Images will be automatically compressed.
                                    </FormDescription>
                                  </FormItem>
                                </div>

                                {/* Right column - Health Information */}
                                <div className="space-y-4">
                                  <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Health & Additional Information
                                  </h3>

                                  <FormField
                                    control={petForm.control}
                                    name="dateOfBirth"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Date of Birth</FormLabel>
                                        <FormControl>
                                          <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={petForm.control}
                                    name="weight"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Weight</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="32 kg"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={petForm.control}
                                    name="allergies"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Allergies</FormLabel>
                                        <FormControl>
                                          <Textarea
                                            placeholder="List any known allergies"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={petForm.control}
                                    name="microchipNumber"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Microchip Number</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Enter microchip ID"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Pet Type Custom Field */}
                                  <FormField
                                    control={petForm.control}
                                    name="pet_type"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Pet Type</FormLabel>
                                        <FormControl>
                                          <SimpleCustomFieldSelect
                                            name="pet_type"
                                            groupKey="pet_types"
                                            categoryName="Pet Information"
                                            value={field.value}
                                            onChange={field.onChange}
                                            createIfNotExists={true}
                                            fallbackOptions={getPetTypeList()}
                                          />
                                        </FormControl>
                                        <FormDescription>
                                          Select or create a pet type
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              <DialogFooter className="pt-4">
                                <Button
                                  type="submit"
                                  disabled={createPetMutation.isPending}
                                >
                                  {createPetMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Add Pet"
                                  )}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pets">
                    <TabsList className="mb-4">
                      <TabsTrigger value="pets">Pets</TabsTrigger>
                      <TabsTrigger value="appointments">
                        Appointments
                      </TabsTrigger>
                      <TabsTrigger value="medical-records">
                        Medical Records
                      </TabsTrigger>
                      <TabsTrigger value="health-plans">
                        Health Plans
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pets">
                      {isLoadingPets ? (
                        <div className="flex items-center justify-center h-40">
                          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                        </div>
                      ) : clientPets && clientPets.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {clientPets.map((pet) => (
                            <Card key={pet.id}>
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 border">
                                      {pet.photoPath ? (
                                        <AvatarImage
                                          src={
                                            getPetImageUrlClient(
                                              pet.photoPath,
                                              tenantInfo?.tenantId || "default",
                                              userPracticeId || "unknown",
                                              selectedClient?.id?.toString() ||
                                                "unknown"
                                            ) || ""
                                          }
                                          alt={pet.name}
                                        />
                                      ) : (
                                        <AvatarFallback
                                          className={`${
                                            getPetAvatarColors(pet.name).bg
                                          } ${
                                            getPetAvatarColors(pet.name).text
                                          }`}
                                        >
                                          {pet.name
                                            .substring(0, 2)
                                            .toUpperCase()}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <div>
                                      <CardTitle className="text-lg">
                                        {pet.name}
                                      </CardTitle>
                                      <CardDescription>
                                        {pet.pet_type ? (
                                          <>
                                            {pet.pet_type
                                              .split("_")
                                              .map(
                                                (word) =>
                                                  word.charAt(0).toUpperCase() +
                                                  word.slice(1)
                                              )
                                              .join(" ")}
                                            {pet.breed ? ` · ${pet.breed}` : ""}
                                          </>
                                        ) : (
                                          <>
                                            {pet.species}{" "}
                                            {pet.breed ? `· ${pet.breed}` : ""}
                                          </>
                                        )}
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        // Set the form default values
                                        petForm.reset({
                                          name: pet.name,
                                          species: pet.species || "",
                                          breed: pet.breed || "",
                                          dateOfBirth: safeDateToInput(
                                            pet.dateOfBirth
                                          ),
                                          weight: pet.weight || "",
                                          allergies: pet.allergies || "",
                                          color: pet.color || "",
                                          gender: pet.gender || "",
                                          microchipNumber:
                                            pet.microchipNumber || "",
                                          pet_type: pet.pet_type || "",
                                          ownerId: String(pet.ownerId),
                                          practiceId: String(pet.practiceId),
                                        });
                                        // Open the edit dialog
                                        setSelectedSpecies(pet.species || "");
                                        setEditPetId(Number(pet.id));
                                        setIsEditPetDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedPetToDelete(pet as Pet);
                                        setIsDeletePetDialogOpen(true);
                                      }}
                                      disabled={deletePetMutation.isPending}
                                    >
                                      {deletePetMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2 text-sm">
                                  {pet.dateOfBirth && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        Date of Birth:
                                      </span>
                                      <span className="font-medium">
                                        {(function () {
                                          try {
                                            const d = new Date(pet.dateOfBirth);
                                            return isNaN(d.getTime())
                                              ? ""
                                              : d.toLocaleDateString();
                                          } catch (e) {
                                            return "";
                                          }
                                        })()}
                                      </span>
                                    </div>
                                  )}
                                  {pet.weight && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        Weight:
                                      </span>
                                      <span className="font-medium">
                                        {pet.weight}
                                      </span>
                                    </div>
                                  )}
                                  {pet.allergies && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        Allergies:
                                      </span>
                                      <span className="font-medium">
                                        {pet.allergies}
                                      </span>
                                    </div>
                                  )}
                                  {pet.color && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        Color:
                                      </span>
                                      <span className="font-medium">
                                        {pet.color}
                                      </span>
                                    </div>
                                  )}
                                  {pet.gender && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        Gender:
                                      </span>
                                      <span className="font-medium">
                                        {pet.gender}
                                      </span>
                                    </div>
                                  )}
                                  {pet.microchipNumber && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        Microchip ID:
                                      </span>
                                      <span className="font-medium">
                                        {pet.microchipNumber}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                              <CardFooter className="pt-0">
                                <div className="flex space-x-2 w-full">
                                  <Link
                                    href={`/admin/soap-notes/pet/${pet.id}`}
                                  >
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 w-full"
                                    >
                                      View Records
                                    </Button>
                                  </Link>
                                  {/* <Link href={`/admin/patient-timeline?petId=${pet.id}`}>
                                    <Button variant="outline" size="sm" className="flex-1 w-full">
                                      Timeline
                                    </Button>
                                  </Link> */}
                                  <Link
                                    href={`/admin/appointments?view=schedule&petId=${pet.id}`}
                                  >
                                    <Button
                                      size="sm"
                                      className="flex-1 w-full"
                                      style={{ flex: 1 }}
                                    >
                                      Schedule Visit
                                    </Button>
                                  </Link>
                                </div>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="flex flex-col items-center justify-center py-10">
                            <div className="rounded-full bg-slate-100 p-3 mb-3">
                              <PlusCircle className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">
                              No pets found
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 mb-4 text-center">
                              This client doesn't have any pets registered yet.
                            </p>
                            <Button onClick={() => setIsAddPetDialogOpen(true)}>
                              Add Pet
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="appointments">
                      {selectedClient && (
                        <ClientAppointmentsList
                          clientId={String(selectedClient.id)}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="medical-records">
                      {clientPets && clientPets.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {clientPets.map((pet) => (
                            <Card key={pet.id}>
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border">
                                    {pet.photoPath ? (
                                      <AvatarImage
                                        src={
                                          getPetImageUrlClient(
                                            pet.photoPath,
                                            tenantInfo?.tenantId || "default",
                                            userPracticeId || "unknown",
                                            selectedClient?.id?.toString() ||
                                              "unknown"
                                          ) || ""
                                        }
                                        alt={pet.name}
                                      />
                                    ) : (
                                      <AvatarFallback
                                        className={`${
                                          getPetAvatarColors(pet.name).bg
                                        } ${getPetAvatarColors(pet.name).text}`}
                                      >
                                        {pet.name.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div>
                                    <CardTitle className="text-base">
                                      {pet.name}'s Medical Records
                                    </CardTitle>
                                    <CardDescription>
                                      {pet.pet_type ? (
                                        <>
                                          {pet.pet_type
                                            .split("_")
                                            .map(
                                              (word) =>
                                                word.charAt(0).toUpperCase() +
                                                word.slice(1)
                                            )
                                            .join(" ")}
                                          {pet.breed ? ` · ${pet.breed}` : ""}
                                        </>
                                      ) : (
                                        <>
                                          {pet.species}{" "}
                                          {pet.breed ? `· ${pet.breed}` : ""}
                                        </>
                                      )}
                                    </CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <span className="font-medium">
                                      SOAP Notes
                                    </span>
                                    <Link
                                      href={`/admin/pet-soap-notes/${pet.id}`}
                                    >
                                      <Button variant="outline" size="sm">
                                        View All
                                      </Button>
                                    </Link>
                                  </div>

                                  <div className="flex items-center justify-between border-b pb-2">
                                    <span className="font-medium">
                                      Lab Results
                                    </span>
                                    <Link
                                      href={`/admin/pet-lab-results/${pet.id}`}
                                    >
                                      <Button variant="outline" size="sm">
                                        View All
                                      </Button>
                                    </Link>
                                  </div>

                                  <div className="flex items-center justify-between border-b pb-2">
                                    <span className="font-medium">
                                      Prescriptions
                                    </span>
                                    <Link
                                      href={`/admin/pet-prescriptions/${pet.id}`}
                                    >
                                      <Button variant="outline" size="sm">
                                        View All
                                      </Button>
                                    </Link>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      Timeline View
                                    </span>
                                    <Link
                                      href={`/admin/patient-timeline?petId=${pet.id}`}
                                    >
                                      <Button size="sm">
                                        Complete History
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <h3 className="text-lg font-medium text-slate-900">
                              No Medical Records
                            </h3>
                            <p className="text-sm text-slate-500 mt-2">
                              There are no pets registered for this client. Add
                              a pet first to access medical records.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="health-plans">
                      <Card>
                        <CardContent className="py-8 text-center">
                          <h3 className="text-lg font-medium text-slate-900">
                            Health Plans Coming Soon
                          </h3>
                          <p className="text-sm text-slate-500 mt-2">
                            Health plan management for this client will be
                            available in a future update.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="rounded-full bg-slate-100 p-4 mb-4">
                    <UserIcon className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">
                    Select a client
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 text-center max-w-md">
                    Choose a client from the list to view their details, manage
                    their pets, appointments, and health plans.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Edit Pet Dialog */}
      <Dialog open={isEditPetDialogOpen} onOpenChange={setIsEditPetDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Edit Pet</DialogTitle>
            <DialogDescription>Edit pet information.</DialogDescription>
          </DialogHeader>

          <Form {...petForm}>
            <form
              onSubmit={petForm.handleSubmit(onPetFormSubmit)}
              className="space-y-4 pt-4"
            >
              {/* Main form grid with two columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column - Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Basic Information
                  </h3>

                  <FormField
                    control={petForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Buddy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={petForm.control}
                    name="species"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Species</FormLabel>
                        <FormControl>
                          <ComboboxSelect
                            options={getSpeciesList()}
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              // When species changes, update breeds list and reset breed
                              setSelectedSpecies(value);
                              petForm.setValue("breed", "");
                            }}
                            placeholder="Select species"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={petForm.control}
                    name="breed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Breed</FormLabel>
                        <FormControl>
                          <ComboboxSelect
                            options={
                              selectedSpecies
                                ? getBreedsList(selectedSpecies)
                                : []
                            }
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select breed"
                            emptyMessage={
                              selectedSpecies
                                ? "No breeds found."
                                : "Select a species first."
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={petForm.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <ComboboxSelect
                            options={getColorList()}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select color"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={petForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                          <ComboboxSelect
                            options={getGenderList()}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select gender"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pet Photo Upload Field */}
                  <FormItem>
                    <FormLabel>Pet Photo</FormLabel>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={async (e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            // Validate file
                            const validation = validateImageFile(file, 5);
                            if (!validation.valid) {
                              toast({
                                title: "Invalid file",
                                description: validation.error,
                                variant: "destructive",
                              });
                              return;
                            }

                            try {
                              // Compress image
                              const compressedFile = await compressImage(
                                file,
                                800,
                                600,
                                0.8
                              );
                              setPetPhoto(compressedFile);
                              toast({
                                title: "Photo selected",
                                description: `Original: ${(
                                  file.size /
                                  1024 /
                                  1024
                                ).toFixed(2)}MB → Compressed: ${(
                                  compressedFile.size /
                                  1024 /
                                  1024
                                ).toFixed(2)}MB (Ready for upload)`,
                              });
                            } catch (error) {
                              console.error("Image compression failed:", error);
                              // Fall back to original file if compression fails
                              setPetPhoto(file);
                            }
                          }
                        }}
                        className="flex-1"
                      />
                    </div>
                    <FormDescription>
                      Upload a photo of the pet (optional). Recommended:
                      800x600px or larger, max 5MB. Images will be automatically
                      compressed to optimize storage.
                    </FormDescription>
                  </FormItem>
                </div>

                {/* Right column - Health Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Health & Additional Information
                  </h3>

                  <FormField
                    control={petForm.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={petForm.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input placeholder="32 kg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={petForm.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allergies</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="List any known allergies"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={petForm.control}
                    name="microchipNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Microchip Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter microchip ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={petForm.control}
                    name="pet_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet Type</FormLabel>
                        <SimpleCustomFieldSelect
                          name="pet_type"
                          groupKey="pet_types"
                          categoryName="Pet Information"
                          placeholder="Select pet type..."
                          required={false}
                          onChange={field.onChange}
                          value={field.value}
                          createIfNotExists={true}
                          fallbackOptions={getPetTypeList()}
                        />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditPetDialogOpen(false);
                    setEditPetId(null);
                    setPetPhoto(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                    petForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePetMutation.isPending}>
                  {updatePetMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Pet"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Delete Pet Confirmation Dialog */}
      <Dialog
        open={isDeletePetDialogOpen}
        onOpenChange={setIsDeletePetDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Pet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pet? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedPetToDelete && (
              <div className="flex items-center p-3 border rounded-md">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-semibold">
                    {selectedPetToDelete.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-slate-900">
                    {selectedPetToDelete.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedPetToDelete.species}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeletePetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPetToDelete) {
                  deletePetMutation.mutate(Number(selectedPetToDelete.id));
                }
              }}
              disabled={deletePetMutation.isPending}
            >
              {deletePetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Pet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog
        open={isEditClientDialogOpen}
        onOpenChange={setIsEditClientDialogOpen}
      >
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information.</DialogDescription>
          </DialogHeader>

          <Form {...updateClientForm}>
            <form
              onSubmit={updateClientForm.handleSubmit(onClientFormSubmit)}
              className="space-y-4 pt-4"
            >
              {/* Main form grid with two columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column - Contact Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Contact Details
                  </h3>

                  <FormField
                    control={updateClientForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={updateClientForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={updateClientForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* <FormField
                    control={updateClientForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johnsmith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> */}

                  <div className="space-y-2">
                    <FormLabel>Username</FormLabel>
                    <Input
                      readOnly
                      disabled
                      value={selectedClient?.username || ""}
                    />
                  </div>

                  <FormField
                    control={updateClientForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormDescription>
                          Leave blank to keep the current password
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="New password (optional)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Emergency Contact */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Emergency Contact
                    </h3>

                    <FormField
                      control={updateClientForm.control}
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
                        control={updateClientForm.control}
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
                        control={updateClientForm.control}
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

                {/* Right column - Address Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Address Information
                  </h3>

                  <FormField
                    control={updateClientForm.control}
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
                      control={updateClientForm.control}
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
                      control={updateClientForm.control}
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
                      control={updateClientForm.control}
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
                      control={updateClientForm.control}
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

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditClientDialogOpen(false);
                    updateClientForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Client"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Delete Client Confirmation Dialog */}
      <Dialog
        open={isDeleteClientDialogOpen}
        onOpenChange={setIsDeleteClientDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedClient && (
              <div className="flex items-center p-3 border rounded-md">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-semibold">
                    {(selectedClient.name || selectedClient.email)
                      ?.charAt(0)
                      ?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-slate-900">
                    {selectedClient.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedClient.email}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteClientDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedClient) {
                  deleteClientMutation.mutate(String(selectedClient.id));
                }
              }}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Client"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Client Appointments List Component
interface ClientAppointmentsListProps {
  clientId: string | number;
}

function ClientAppointmentsList({ clientId }: ClientAppointmentsListProps) {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const tenantInfo = useTenantInfo();
  const queryClient = useQueryClient();

  const {
    data: appointments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/appointments/client", clientId],
    queryFn: async () => {
      const id = String(clientId);
      const response = await fetch(`/api/appointments?clientId=${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch client appointments");
      }

      return response.json();
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading appointments...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            Error Loading Appointments
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: ["/api/appointments/client", clientId],
              });
              toast({
                title: "Refreshing appointments",
                description: "Attempting to reload client appointments",
              });
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <h3 className="text-lg font-medium text-slate-900">
            No Appointments Found
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            This client has no upcoming or past appointments.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/appointments">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Appointment
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Client Appointments</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/appointments?view=schedule">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule New
              </Link>
            </Button>
          </div>
          <CardDescription>
            Showing {appointments.length} appointment
            {appointments.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments.map((appointment: any) => (
              <Card key={appointment.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  {/* Status indicator */}
                  <div
                    className={cn(
                      "w-full sm:w-2 flex-shrink-0",
                      appointment.status === "completed"
                        ? "bg-green-500"
                        : appointment.status === "cancelled"
                        ? "bg-red-500"
                        : appointment.status === "no-show"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    )}
                  />

                  <div className="flex-grow p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between mb-3">
                      <div>
                        <h4 className="text-base font-medium">
                          {appointment.title}
                        </h4>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Calendar className="mr-1 h-4 w-4" />
                          {formatDate(new Date(appointment.date))}
                          <Clock className="ml-2 mr-1 h-4 w-4" />
                          {new Date(appointment.date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {appointment.duration && (
                            <span className="ml-2">
                              {appointment.duration} min
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 sm:mt-0 flex items-center">
                        <Badge
                          variant={
                            appointment.status === "completed"
                              ? "secondary"
                              : appointment.status === "cancelled"
                              ? "destructive"
                              : appointment.status === "no-show"
                              ? "secondary"
                              : "default"
                          }
                          className="ml-2"
                        >
                          {appointment.status === "completed"
                            ? "Completed"
                            : appointment.status === "cancelled"
                            ? "Cancelled"
                            : appointment.status === "no-show"
                            ? "No-show"
                            : "Scheduled"}
                        </Badge>
                      </div>
                    </div>

                    {appointment.pet && (
                      <div className="flex items-center mb-3">
                        <Avatar className="h-6 w-6 mr-2">
                          {appointment.pet.photoPath ? (
                            <AvatarImage
                              src={
                                getPetImageUrlClient(
                                  appointment.pet.photoPath,
                                  tenantInfo?.tenantId || "default",
                                  userPracticeId || "unknown",
                                  appointment.clientId?.toString() ||
                                    appointment.pet.clientId?.toString() ||
                                    "unknown"
                                ) || ""
                              }
                              alt={appointment.pet.name}
                            />
                          ) : (
                            <AvatarFallback
                              className={cn(
                                getPetAvatarColors(appointment.pet.name).bg,
                                getPetAvatarColors(appointment.pet.name).text
                              )}
                            >
                              {appointment.pet.name
                                .substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-sm">
                          {appointment.pet.name}
                          {appointment.pet.species
                            ? `, ${appointment.pet.species}`
                            : ""}
                          {appointment.pet.breed
                            ? ` (${appointment.pet.breed})`
                            : ""}
                        </span>
                      </div>
                    )}

                    {appointment.notes && (
                      <div className="text-sm text-muted-foreground mt-2 border-t pt-2">
                        <p className="line-clamp-2">{appointment.notes}</p>
                      </div>
                    )}

                    <div className="flex justify-end mt-3">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/appointments`}>
                          View Details
                          <ArrowUpRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
