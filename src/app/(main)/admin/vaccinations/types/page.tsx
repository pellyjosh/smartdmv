'use client'
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Search, Edit, Trash2, AlertCircle, ArrowLeft } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";

// Define the schema for adding/editing vaccine types
const VaccineTypeFormSchema = z.object({
  name: z.string().min(1, "Vaccine name is required"),
  type: z.enum(["core", "non-core", "optional"], {
    required_error: "Please select a vaccine type",
  }),
  species: z.string().min(1, "Species is required"),
  manufacturer: z.string().optional(),
  description: z.string().optional(),
  diseasesProtected: z.string().optional(),
  recommendedSchedule: z.string().optional(),
  durationOfImmunity: z.string().optional(),
  sideEffects: z.string().optional(),
  contraindications: z.string().optional(),
  isActive: z.boolean().default(true),
});

type VaccineTypeFormValues = z.infer<typeof VaccineTypeFormSchema>;

const VaccineTypesPage = () => {
  const { userPracticeId } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingVaccineType, setEditingVaccineType] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [vaccineTypeToDelete, setVaccineTypeToDelete] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all"); // "all", "core", "non-core", "optional"

  // Default form values
  const defaultValues: Partial<VaccineTypeFormValues> = {
    name: "",
    type: "core",
    species: "",
    manufacturer: "",
    description: "",
    diseasesProtected: "",
    recommendedSchedule: "",
    durationOfImmunity: "",
    sideEffects: "",
    contraindications: "",
    isActive: true,
  };

  // Set up form for adding/editing vaccine types
  const form = useForm<VaccineTypeFormValues>({
    resolver: zodResolver(VaccineTypeFormSchema),
    defaultValues,
  });

  // Fetch vaccine types
  const { data: vaccineTypes, isLoading: isLoadingVaccineTypes, error } = useQuery({
    queryKey: ["/api/vaccinations/types", userPracticeId],
    queryFn: async () => {
      const response = await fetch(`/api/vaccinations/types?practiceId=${userPracticeId}`);
      if (!response.ok) throw new Error("Failed to fetch vaccine types");
      return response.json();
    },
    enabled: !!userPracticeId,
  });

  // Create new vaccine type mutation
  const createVaccineTypeMutation = useMutation({
    mutationFn: async (data: VaccineTypeFormValues) => {
      const response = await fetch("/api/vaccinations/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create vaccine type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vaccinations/types", userPracticeId] });
      toast({
        title: "Success",
        description: "Vaccine type has been created successfully",
      });
      setIsAddDialogOpen(false);
      form.reset(defaultValues);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create vaccine type. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update vaccine type mutation
  const updateVaccineTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<VaccineTypeFormValues> }) => {
      const response = await fetch(`/api/vaccinations/types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update vaccine type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vaccinations/types", userPracticeId] });
      toast({
        title: "Success",
        description: "Vaccine type has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingVaccineType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update vaccine type. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete vaccine type mutation
  const deleteVaccineTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/vaccinations/types/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete vaccine type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vaccinations/types", userPracticeId] });
      toast({
        title: "Success",
        description: "Vaccine type has been deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setVaccineTypeToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete vaccine type. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission for adding new vaccine type
  const onSubmit = (data: VaccineTypeFormValues) => {
    // Transform the form data before sending to API
    const transformedData = {
      ...data,
      // Keep diseasesProtected as string - the API expects a string
      diseasesProtected: data.diseasesProtected || "",
    };
    createVaccineTypeMutation.mutate(transformedData);
  };

  // Handle form submission for editing vaccine type
  const onSubmitEdit = (data: VaccineTypeFormValues) => {
    if (editingVaccineType) {
      // Transform the form data before sending to API
      const transformedData = {
        ...data,
        // Keep diseasesProtected as string - the API expects a string
        diseasesProtected: data.diseasesProtected || "",
      };
      updateVaccineTypeMutation.mutate({
        id: editingVaccineType.id,
        data: transformedData,
      });
    }
  };

  // Open edit dialog and set form values
  const handleEditVaccineType = (vaccineType: any): void => {
    setEditingVaccineType(vaccineType);
    
    // Convert array of diseases to comma-separated string for the form
    // Handle both string and array formats for diseasesProtected
    let diseasesProtectedString = "";
    if (vaccineType.diseasesProtected) {
      if (Array.isArray(vaccineType.diseasesProtected)) {
        diseasesProtectedString = vaccineType.diseasesProtected.join(", ");
      } else {
        diseasesProtectedString = String(vaccineType.diseasesProtected);
      }
    }
      
    form.reset({
      ...vaccineType,
      diseasesProtected: diseasesProtectedString,
    });
    
    setIsEditDialogOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteVaccineType = (vaccineType: any): void => {
    setVaccineTypeToDelete(vaccineType);
    setIsDeleteDialogOpen(true);
  };

  // Filter vaccine types based on search term and tab
  const filteredVaccineTypes = error 
    ? []
    : vaccineTypes?.filter((vaccineType: any) => {
      // Apply tab filter
      if (activeTab !== "all" && vaccineType.type !== activeTab) {
        return false;
      }
      
      // Apply search term filter
      const searchLower = searchTerm.toLowerCase();
      return searchTerm === "" || 
             vaccineType.name.toLowerCase().includes(searchLower) ||
             vaccineType.species.toLowerCase().includes(searchLower) ||
             vaccineType.manufacturer?.toLowerCase().includes(searchLower) ||
             vaccineType.description?.toLowerCase().includes(searchLower);
    });

  // Error handling with useEffect to prevent infinite re-renders
  const [errorToastShown, setErrorToastShown] = useState(false);
  
  useEffect(() => {
    if (error && !errorToastShown) {
      toast({
        title: "Error",
        description: "Failed to load vaccine types. Please try again later.",
        variant: "destructive",
      });
      setErrorToastShown(true);
    }
  }, [error, errorToastShown, toast]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'core':
        return 'bg-blue-100 text-blue-800';
      case 'non-core':
        return 'bg-purple-100 text-purple-800';
      case 'optional':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Vaccine Types</h1>
            <p className="text-muted-foreground">
              Manage vaccine types for your veterinary practice
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/vaccinations">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Vaccinations
              </Button>
            </Link>
            <Button onClick={() => {
              form.reset(defaultValues);
              setIsAddDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" /> 
              Add Vaccine Type
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vaccine Types</CardTitle>
            <CardDescription>
              Manage the types of vaccines available for use in your practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              defaultValue="all" 
              className="w-full mb-6"
              onValueChange={setActiveTab}
              value={activeTab}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Types</TabsTrigger>
                <TabsTrigger value="core">Core</TabsTrigger>
                <TabsTrigger value="non-core">Non-Core</TabsTrigger>
                <TabsTrigger value="optional">Optional</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-1/2 mb-6">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search vaccine types..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isLoadingVaccineTypes ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !filteredVaccineTypes?.length ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center p-4">
                <h3 className="text-lg font-medium">No vaccine types found</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {activeTab === "all" 
                    ? "No vaccine types found. Add some vaccine types to get started."
                    : `No ${activeTab.replace('-', ' ')} vaccine types found.`}
                </p>
                <Button onClick={() => {
                  form.reset(defaultValues);
                  setIsAddDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Vaccine Type
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Species</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Duration of Immunity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVaccineTypes.map((vaccineType: any) => (
                      <TableRow key={vaccineType.id}>
                        <TableCell>
                          <div className="font-medium">{vaccineType.name}</div>
                          {vaccineType.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {vaccineType.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(vaccineType.type)}`}>
                            {vaccineType.type === 'non-core' ? 'Non-Core' : 
                             vaccineType.type === 'core' ? 'Core' : 'Optional'}
                          </span>
                        </TableCell>
                        <TableCell>{vaccineType.species}</TableCell>
                        <TableCell>{vaccineType.manufacturer || "—"}</TableCell>
                        <TableCell>{vaccineType.durationOfImmunity || "—"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            vaccineType.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {vaccineType.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditVaccineType(vaccineType)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteVaccineType(vaccineType)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Vaccine Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Vaccine Type</DialogTitle>
            <DialogDescription>
              Create a new vaccine type for your practice. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Rabies Vaccine" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="core">Core</SelectItem>
                          <SelectItem value="non-core">Non-Core</SelectItem>
                          <SelectItem value="optional">Optional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Core vaccines are recommended for all animals of that species.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Species *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select species" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Dog">Dog</SelectItem>
                          <SelectItem value="Cat">Cat</SelectItem>
                          <SelectItem value="Bird">Bird</SelectItem>
                          <SelectItem value="Reptile">Reptile</SelectItem>
                          <SelectItem value="Small Mammal">Small Mammal</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input placeholder="Manufacturer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the vaccine"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diseasesProtected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diseases Protected Against</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Separate diseases with commas"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter disease names separated by commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="recommendedSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommended Schedule</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., Initial: 8 weeks, Booster: 12 weeks"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="durationOfImmunity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration of Immunity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1 year, 3 years" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sideEffects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potential Side Effects</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Common side effects"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contraindications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraindications</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="When not to administer"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Inactive vaccines won't appear in selection dropdowns
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createVaccineTypeMutation.isPending}>
                  {createVaccineTypeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Vaccine Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Vaccine Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vaccine Type</DialogTitle>
            <DialogDescription>
              Update the details of this vaccine type. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Rabies Vaccine" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="core">Core</SelectItem>
                          <SelectItem value="non-core">Non-Core</SelectItem>
                          <SelectItem value="optional">Optional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Core vaccines are recommended for all animals of that species.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Species *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select species" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Dog">Dog</SelectItem>
                          <SelectItem value="Cat">Cat</SelectItem>
                          <SelectItem value="Bird">Bird</SelectItem>
                          <SelectItem value="Reptile">Reptile</SelectItem>
                          <SelectItem value="Small Mammal">Small Mammal</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input placeholder="Manufacturer name" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the vaccine"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diseasesProtected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diseases Protected Against</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Separate diseases with commas"
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter disease names separated by commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="recommendedSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommended Schedule</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., Initial: 8 weeks, Booster: 12 weeks"
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="durationOfImmunity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration of Immunity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1 year, 3 years" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sideEffects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potential Side Effects</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Common side effects"
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contraindications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraindications</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="When not to administer"
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Inactive vaccines won't appear in selection dropdowns
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateVaccineTypeMutation.isPending}>
                  {updateVaccineTypeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Vaccine Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Vaccine Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this vaccine type? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {vaccineTypeToDelete && (
            <div className="py-4">
              <div className="flex items-center space-x-2 text-amber-600 mb-4">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Warning: This will also affect all vaccination records using this type.</p>
              </div>
              
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {vaccineTypeToDelete.name}</p>
                <p><span className="font-medium">Type:</span> {vaccineTypeToDelete.type === 'non-core' ? 'Non-Core' : vaccineTypeToDelete.type === 'core' ? 'Core' : 'Optional'}</p>
                <p><span className="font-medium">Species:</span> {vaccineTypeToDelete.species}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => vaccineTypeToDelete && deleteVaccineTypeMutation.mutate(vaccineTypeToDelete.id)}
              disabled={deleteVaccineTypeMutation.isPending}
            >
              {deleteVaccineTypeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VaccineTypesPage;
