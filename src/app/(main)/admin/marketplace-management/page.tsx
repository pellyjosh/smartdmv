'use client';
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X, Edit, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AddonCategory } from "@/db/schema";

// Schema for add-on form validation
const addonFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters"),
  fullDescription: z.string().min(30, "Full description must be at least 30 characters"),
  category: z.string().min(1, "Category is required"),
  price: z.string().min(1, "Price is required"),
  // New field for pricing tiers with monthly and yearly billing cycles
  pricing_tiers: z.object({
    STANDARD: z.object({
      monthlyPrice: z.string().min(1, "Monthly price is required"),
      yearlyPrice: z.string().min(1, "Yearly price is required"),
      billingCycle: z.enum(["monthly", "yearly"]).default("monthly")
    }),
    PREMIUM: z.object({
      monthlyPrice: z.string().min(0, "Monthly price is required"),
      yearlyPrice: z.string().min(0, "Yearly price is required"),
      billingCycle: z.enum(["monthly", "yearly"]).default("monthly")
    }).optional(),
    ENTERPRISE: z.object({
      monthlyPrice: z.string().min(0, "Monthly price is required"),
      yearlyPrice: z.string().min(0, "Yearly price is required"),
      billingCycle: z.enum(["monthly", "yearly"]).default("monthly")
    }).optional()
  }).optional(),
  features: z.array(z.string()).min(1, "At least one feature is required"),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  coverImage: z.string().optional(),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().default("1.0.0"),
  requiresSetup: z.boolean().default(false),
  setupInstructions: z.string().optional(),
});

type AddonFormValues = z.infer<typeof addonFormSchema>;

const MarketplaceManagementPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<any>(null);
  const [newFeature, setNewFeature] = useState("");
  const [newTag, setNewTag] = useState("");

  // Set up form with default values
  const form = useForm<AddonFormValues>({
    resolver: zodResolver(addonFormSchema),
    defaultValues: {
      name: "",
      shortDescription: "",
      fullDescription: "",
      category: AddonCategory.CLIENT_PORTAL,
      price: "0.00", // Keeping legacy price field for backward compatibility
      pricing_tiers: {
        STANDARD: {
          monthlyPrice: "0.00",
          yearlyPrice: "0.00",
          billingCycle: "monthly"
        }
      },
      features: [],
      isActive: true,
      isFeatured: false,
      isPopular: false,
      coverImage: "",
      icon: "",
      tags: [],
      version: "1.0.0",
      requiresSetup: false,
      setupInstructions: "",
    },
  });

  // Fetch all add-ons
  const { data: addons, isLoading: addonsLoading } = useQuery({
    queryKey: ["/api/marketplace/addons"],
    refetchOnWindowFocus: false,
  });

  // Create add-on mutation
  const createAddonMutation = useMutation({
    mutationFn: async (data: AddonFormValues) => {
      const response = await apiRequest("POST", "/api/marketplace/addons", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Add-on created successfully",
      });
      setIsAddDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/addons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create add-on: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Update add-on mutation
  const updateAddonMutation = useMutation({
    mutationFn: async (data: AddonFormValues & { id: number }) => {
      const { id, ...addonData } = data;
      const response = await apiRequest("PUT", `/api/marketplace/addons/${id}`, addonData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Add-on updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedAddon(null);
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/addons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update add-on: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Delete add-on mutation
  const deleteAddonMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/marketplace/addons/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Add-on deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedAddon(null);
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/addons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete add-on: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle add-on's featured status
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: number; isFeatured: boolean }) => {
      const response = await apiRequest("PATCH", `/api/marketplace/addons/${id}/feature`, { isFeatured });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/addons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update add-on: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission for creating a new add-on
  const onSubmit = (data: AddonFormValues) => {
    createAddonMutation.mutate(data);
  };

  // Handle form submission for updating an add-on
  const onEditSubmit = (data: AddonFormValues) => {
    if (!selectedAddon) return;
    updateAddonMutation.mutate({ ...data, id: selectedAddon.id });
  };

  // Open the edit dialog and populate form with selected add-on data
  const handleEditClick = (addon: any) => {
    setSelectedAddon(addon);
    
    // Get pricing tiers or create default if they don't exist
    const pricing_tiers = addon.pricing_tiers || {
      STANDARD: {
        monthlyPrice: addon.price || "0.00",
        yearlyPrice: (parseFloat(addon.price || "0.00") * 10).toFixed(2), // Yearly price as 10x monthly (slight discount)
        billingCycle: "monthly"
      }
    };
    
    // Reset form with addon values
    form.reset({
      name: addon.name,
      shortDescription: addon.shortDescription,
      fullDescription: addon.fullDescription || "",
      category: addon.category,
      price: addon.price || "0.00", // Keep for backward compatibility
      pricing_tiers,
      features: addon.features || [],
      isActive: addon.isActive || true,
      isFeatured: addon.isFeatured || false,
      isPopular: addon.isPopular || false,
      coverImage: addon.coverImage || "",
      icon: addon.icon || "",
      tags: addon.tags || [],
      version: addon.version || "1.0.0",
      requiresSetup: addon.requiresSetup || false,
      setupInstructions: addon.setupInstructions || "",
    });
    setIsEditDialogOpen(true);
  };

  // Open the delete confirmation dialog
  const handleDeleteClick = (addon: any) => {
    setSelectedAddon(addon);
    setIsDeleteDialogOpen(true);
  };

  // Confirm deletion of an add-on
  const confirmDelete = () => {
    if (!selectedAddon) return;
    deleteAddonMutation.mutate(selectedAddon.id);
  };

  // Add a new feature to the features array
  const addFeature = () => {
    if (!newFeature) return;
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", [...currentFeatures, newFeature]);
    setNewFeature("");
  };

  // Remove a feature from the features array
  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue(
      "features",
      currentFeatures.filter((_, i) => i !== index)
    );
  };

  // Add a new tag to the tags array
  const addTag = () => {
    if (!newTag) return;
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", [...currentTags, newTag]);
    setNewTag("");
  };

  // Remove a tag from the tags array
  const removeTag = (index: number) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((_, i) => i !== index)
    );
  };

  // Toggle an add-on's featured status
  const toggleFeatured = (addon: any) => {
    toggleFeaturedMutation.mutate({
      id: addon.id,
      isFeatured: !addon.isFeatured,
    });
  };

  // Filter add-ons based on the active tab
  const filteredAddons = (Array.isArray(addons) ? addons : []).filter((addon: any) => {
    if (activeTab === "all") return true;
    if (activeTab === "featured") return addon.isFeatured;
    if (activeTab === "active") return addon.isActive;
    if (activeTab === "inactive") return !addon.isActive;
    return addon.category === activeTab;
  });

  // Display a loading spinner while fetching data
  if (addonsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Helper function to get category label
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case AddonCategory.CLIENT_PORTAL:
        return "Client Portal";
      case AddonCategory.AI:
        return "AI";
      case AddonCategory.ADMINISTRATIVE:
        return "Admin";
      case AddonCategory.COMMUNICATION:
        return "Communication";
      case AddonCategory.FINANCIAL:
        return "Financial";
      default:
        return category;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Marketplace Management</h1>
          <p className="text-muted-foreground mt-1">Manage add-ons in the SmartDVM Marketplace</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Add-on
        </Button>
      </div>

      {/* Tabs for filtering add-ons */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Add-ons</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value={AddonCategory.CLIENT_PORTAL}>Client Portal</TabsTrigger>
          <TabsTrigger value={AddonCategory.AI}>AI</TabsTrigger>
          <TabsTrigger value={AddonCategory.ADMINISTRATIVE}>Administrative</TabsTrigger>
          <TabsTrigger value={AddonCategory.COMMUNICATION}>Communication</TabsTrigger>
          <TabsTrigger value={AddonCategory.FINANCIAL}>Financial</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAddons?.length > 0 ? (
              filteredAddons.map((addon: any) => (
                <Card key={addon.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center">
                        {addon.name}
                        {addon.isPopular && (
                          <Badge variant="secondary" className="ml-2">
                            Popular
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={addon.isFeatured ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleFeatured(addon)}
                          title={addon.isFeatured ? "Remove from featured" : "Add to featured"}
                        >
                          <Star
                            className={`h-4 w-4 ${addon.isFeatured ? "fill-primary-foreground" : ""}`}
                          />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditClick(addon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteClick(addon)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-2">
                      <Badge variant="outline">{getCategoryLabel(addon.category)}</Badge>
                      <Badge
                        variant={addon.isActive ? "default" : "destructive"}
                        className="ml-2"
                      >
                        {addon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{addon.shortDescription}</p>
                    {addon.features && addon.features.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold mb-1">Key Features</h4>
                        <ul className="text-sm list-disc list-inside">
                          {addon.features.slice(0, 3).map((feature: string, i: number) => (
                            <li key={i}>{feature}</li>
                          ))}
                          {addon.features.length > 3 && <li>...and {addon.features.length - 3} more</li>}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-sm">{addon.version || "1.0.0"}</div>
                    <div className="text-sm font-semibold">
                      {addon.price ? `$${addon.price}/month` : "Free"}
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-3 py-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No add-ons found</h3>
                <p className="text-muted-foreground mt-1">
                  No add-ons found in this category. Add a new add-on to get started.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add New Add-on Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Add-on</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Add-on name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description (shown in cards)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description of the add-on"
                        rows={4}
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={AddonCategory.CLIENT_PORTAL}>Client Portal</SelectItem>
                          <SelectItem value={AddonCategory.AI}>AI</SelectItem>
                          <SelectItem value={AddonCategory.ADMINISTRATIVE}>Administrative</SelectItem>
                          <SelectItem value={AddonCategory.COMMUNICATION}>Communication</SelectItem>
                          <SelectItem value={AddonCategory.FINANCIAL}>Financial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legacy price field - hidden but kept for backward compatibility */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Pricing Tiers */}
              <div className="border rounded-lg p-4 mt-2 mb-4">
                <h3 className="text-lg font-medium mb-3">Pricing Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricing_tiers.STANDARD.monthlyPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Price</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Also update the legacy price field
                              form.setValue("price", e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Price per month (USD)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pricing_tiers.STANDARD.yearlyPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yearly Price</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Price per year (USD)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormDescription>URL to the add-on's cover image</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/icon.svg" {...field} />
                    </FormControl>
                    <FormDescription>URL to the add-on's icon</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Features</FormLabel>
                <div className="flex mt-2 mb-2">
                  <Input
                    placeholder="Add a feature"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    className="mr-2"
                  />
                  <Button type="button" onClick={addFeature}>
                    Add
                  </Button>
                </div>
                <ul className="space-y-2 mt-2">
                  {form.watch("features")?.map((feature, index) => (
                    <li key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span>{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <FormMessage>{form.formState.errors.features?.message}</FormMessage>
              </div>

              <div>
                <FormLabel>Tags</FormLabel>
                <div className="flex mt-2 mb-2">
                  <Input
                    placeholder="Add a tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="mr-2"
                  />
                  <Button type="button" onClick={addTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("tags")?.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => removeTag(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Show in marketplace</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>Show in featured section</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPopular"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Popular</FormLabel>
                        <FormDescription>Mark as popular</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="requiresSetup"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Requires Setup</FormLabel>
                      <FormDescription>
                        Does this add-on require additional setup after installation?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("requiresSetup") && (
                <FormField
                  control={form.control}
                  name="setupInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setup Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Instructions for setting up the add-on after installation"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAddonMutation.isPending}>
                  {createAddonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Add-on
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Add-on Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Add-on</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Add-on name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description (shown in cards)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description of the add-on"
                        rows={4}
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={AddonCategory.CLIENT_PORTAL}>Client Portal</SelectItem>
                          <SelectItem value={AddonCategory.AI}>AI</SelectItem>
                          <SelectItem value={AddonCategory.ADMINISTRATIVE}>Administrative</SelectItem>
                          <SelectItem value={AddonCategory.COMMUNICATION}>Communication</SelectItem>
                          <SelectItem value={AddonCategory.FINANCIAL}>Financial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legacy price field - hidden but kept for backward compatibility */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Pricing Tiers */}
              <div className="border rounded-lg p-4 mt-2 mb-4">
                <h3 className="text-lg font-medium mb-3">Pricing Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricing_tiers.STANDARD.monthlyPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Price</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Also update the legacy price field
                              form.setValue("price", e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Price per month (USD)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pricing_tiers.STANDARD.yearlyPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yearly Price</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Price per year (USD)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormDescription>URL to the add-on's cover image</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/icon.svg" {...field} />
                    </FormControl>
                    <FormDescription>URL to the add-on's icon</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Features</FormLabel>
                <div className="flex mt-2 mb-2">
                  <Input
                    placeholder="Add a feature"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    className="mr-2"
                  />
                  <Button type="button" onClick={addFeature}>
                    Add
                  </Button>
                </div>
                <ul className="space-y-2 mt-2">
                  {form.watch("features")?.map((feature, index) => (
                    <li key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span>{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <FormMessage>{form.formState.errors.features?.message}</FormMessage>
              </div>

              <div>
                <FormLabel>Tags</FormLabel>
                <div className="flex mt-2 mb-2">
                  <Input
                    placeholder="Add a tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="mr-2"
                  />
                  <Button type="button" onClick={addTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("tags")?.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => removeTag(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Show in marketplace</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>Show in featured section</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPopular"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Popular</FormLabel>
                        <FormDescription>Mark as popular</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="requiresSetup"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Requires Setup</FormLabel>
                      <FormDescription>
                        Does this add-on require additional setup after installation?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("requiresSetup") && (
                <FormField
                  control={form.control}
                  name="setupInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setup Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Instructions for setting up the add-on after installation"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAddonMutation.isPending}>
                  {updateAddonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Add-on
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the add-on "{selectedAddon?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteAddonMutation.isPending}>
              {deleteAddonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator className="my-8" />

      {/* Stats Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Array.isArray(addons) ? addons.length : 0}</div>
            <p className="text-muted-foreground">Add-ons in the marketplace</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Featured Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(Array.isArray(addons) ? addons.filter((addon: any) => addon.isFeatured).length : 0)}
            </div>
            <p className="text-muted-foreground">Add-ons featured in the marketplace</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(Array.isArray(addons) ? addons.filter((addon: any) => addon.isActive).length : 0)}
            </div>
            <p className="text-muted-foreground">Add-ons active in the marketplace</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketplaceManagementPage;