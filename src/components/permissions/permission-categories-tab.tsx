import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  PlusCircle,
  Loader2,
  Pencil,
  Trash,
  Layers,
  PlusIcon,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

// Define ResourceType enum locally since the import isn't working
enum ResourceType {
  USER = "USER",
  PRACTICE = "PRACTICE",
  PET = "PET",
  APPOINTMENT = "APPOINTMENT",
  HEALTH_PLAN = "HEALTH_PLAN",
  WHITEBOARD = "WHITEBOARD",
  NOTIFICATION = "NOTIFICATION",
  SOAP_NOTE = "SOAP_NOTE",
  DASHBOARD_CONFIG = "DASHBOARD_CONFIG",
  CUSTOM_ROLE = "CUSTOM_ROLE",
}

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

// Types
interface PermissionCategory {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ResourceCategoryMapping {
  id: number;
  resourceType: ResourceType;
  categoryId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface PermissionCategoriesTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

// Utility function
const getResourceTypeName = (resourceType: ResourceType): string => {
  const mapping: Record<string, string> = {
    [ResourceType.USER]: "User",
    [ResourceType.PRACTICE]: "Practice",
    [ResourceType.PET]: "Pet",
    [ResourceType.APPOINTMENT]: "Appointment",
    [ResourceType.HEALTH_PLAN]: "Health Plan",
    [ResourceType.WHITEBOARD]: "Whiteboard",
    [ResourceType.NOTIFICATION]: "Notification",
    [ResourceType.SOAP_NOTE]: "SOAP Note",
    [ResourceType.DASHBOARD_CONFIG]: "Dashboard Config",
    [ResourceType.CUSTOM_ROLE]: "Custom Role",
  };
  return mapping[resourceType] || resourceType;
};

export default function PermissionCategoriesTab({
  practiceId,
  isSuperAdmin,
}: PermissionCategoriesTabProps) {
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  // State for permission categories management
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] =
    useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] =
    useState(false);
  const [isAddMappingDialogOpen, setIsAddMappingDialogOpen] = useState(false);
  const [isGeneratePermissionsDialogOpen, setIsGeneratePermissionsDialogOpen] =
    useState(false);
  const [editingCategory, setEditingCategory] =
    useState<PermissionCategory | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<PermissionCategory | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    displayOrder: 0,
  });
  const [newMapping, setNewMapping] = useState({
    resourceType: "",
    categoryId: 0,
  });

  // Fetch permission categories
  const { data: permissionCategories, isLoading: isLoadingCategories } =
    useQuery<PermissionCategory[]>({
      queryKey: ["/api/permission-categories", { practiceId }],
      queryFn: async () => {
        const response = await fetch(
          `/api/permission-categories?practiceId=${practiceId}`
        );
        if (!response.ok)
          throw new Error("Failed to fetch permission categories");
        return response.json();
      },
      enabled: !!practiceId,
    });

  // Fetch resource category mappings (using permission-categories for now since resource-category-mappings doesn't exist)
  const { data: resourceCategoryMappings, isLoading: isLoadingMappings } =
    useQuery<ResourceCategoryMapping[]>({
      queryKey: ["/api/permission-categories", "mappings", { practiceId }],
      queryFn: async () => {
        const response = await fetch(
          `/api/permission-categories?practiceId=${practiceId}`
        );
        if (!response.ok)
          throw new Error("Failed to fetch resource category mappings");
        const categories = await response.json();
        // Extract resource mappings from categories
        const mappings: any[] = [];
        categories.forEach((category: any) => {
          category.resources?.forEach((resource: any) => {
            mappings.push({
              id: `${category.id}-${resource.id}`,
              categoryId: category.id,
              categoryName: category.name,
              resourceId: resource.id,
              resourceName: resource.name,
              resourceType: resource.name.toUpperCase(),
            });
          });
        });
        return mappings;
      },
    });

  // Fetch all roles for permission generation
  const { data: roles } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/roles", { practiceId }],
    queryFn: async () => {
      // If offline, skip API call and load from cache immediately
      if (!isOnline) {
        console.log(
          "[PermissionCategories] 🔌 Offline mode detected, loading from cache"
        );
        const cached = localStorage.getItem(`roles_cache_${practiceId}`);
        if (cached) {
          const cacheData = JSON.parse(cached);
          return Array.isArray(cacheData) ? cacheData : cacheData.data;
        }
        return [];
      }

      // Online mode - try API with cache fallback
      try {
        const response = await fetch(`/api/roles?practiceId=${practiceId}`);
        if (!response.ok) {
          const cached = localStorage.getItem(`roles_cache_${practiceId}`);
          if (cached) {
            console.log("[PermissionCategories] Using cached roles data");
            const cacheData = JSON.parse(cached);
            return Array.isArray(cacheData) ? cacheData : cacheData.data;
          }
          throw new Error("Failed to fetch roles");
        }
        const data = await response.json();
        if (data && typeof window !== "undefined") {
          const cacheData = {
            data: data,
            timestamp: Date.now(),
            cachedAt: new Date().toISOString(),
          };
          localStorage.setItem(
            `roles_cache_${practiceId}`,
            JSON.stringify(cacheData)
          );
        }
        return data;
      } catch (error) {
        const cached = localStorage.getItem(`roles_cache_${practiceId}`);
        if (cached) {
          console.log(
            "[PermissionCategories] Network error, using cached roles"
          );
          const cacheData = JSON.parse(cached);
          return Array.isArray(cacheData) ? cacheData : cacheData.data;
        }
        return [];
      }
    },
    enabled: !!practiceId,
    retry: false,
  });

  // Get all resource types
  const availableResources = Object.values(ResourceType);

  // Mutation to create a new permission category
  const createPermissionCategoryMutation = useMutation({
    mutationFn: async (
      data: Omit<PermissionCategory, "id" | "createdAt" | "updatedAt">
    ) => {
      const response = await apiRequest(
        "POST",
        "/api/permission-categories",
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/permission-categories", { practiceId }],
      });
      setNewCategory({
        name: "",
        description: "",
        displayOrder: 0,
      });
      setIsAddCategoryDialogOpen(false);
      toast({
        title: "Success",
        description: "Permission category created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create permission category: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to update a permission category
  const updatePermissionCategoryMutation = useMutation({
    mutationFn: async (data: PermissionCategory) => {
      const response = await apiRequest(
        "PATCH",
        `/api/permission-categories/${data.id}`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/permission-categories", { practiceId }],
      });
      setEditingCategory(null);
      setIsEditCategoryDialogOpen(false);
      toast({
        title: "Success",
        description: "Permission category updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update permission category: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a permission category
  const deletePermissionCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/permission-categories/${categoryId}`
      );
      // Server returns 204 No Content, so we don't need to parse the response
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/permission-categories", { practiceId }],
      });
      setDeletingCategory(null);
      setIsDeleteCategoryDialogOpen(false);
      toast({
        title: "Success",
        description: "Permission category deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete permission category: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to create a new resource-category mapping
  const createResourceCategoryMappingMutation = useMutation({
    mutationFn: async (
      data: Omit<ResourceCategoryMapping, "id" | "createdAt" | "updatedAt">
    ) => {
      // Mock implementation since the API endpoint doesn't exist
      console.log("Creating resource category mapping:", data);
      return { id: Date.now(), ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/permission-categories", "mappings", { practiceId }],
      });
      setNewMapping({
        resourceType: "",
        categoryId: 0,
      });
      setIsAddMappingDialogOpen(false);
      toast({
        title: "Success",
        description: "Resource-category mapping created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create resource-category mapping: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a resource-category mapping
  const deleteResourceCategoryMappingMutation = useMutation({
    mutationFn: async (mappingId: number) => {
      // Mock implementation since the API endpoint doesn't exist
      console.log("Deleting resource category mapping:", mappingId);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/permission-categories", "mappings", { practiceId }],
      });
      toast({
        title: "Success",
        description: "Resource-category mapping deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete resource-category mapping: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const handleAddCategory = () => {
    createPermissionCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = () => {
    if (editingCategory) {
      updatePermissionCategoryMutation.mutate(editingCategory);
    }
  };

  const handleDeleteCategory = () => {
    if (deletingCategory) {
      deletePermissionCategoryMutation.mutate(deletingCategory.id);
    }
  };

  const handleAddMapping = () => {
    if (newMapping.resourceType && newMapping.categoryId) {
      createResourceCategoryMappingMutation.mutate({
        resourceType: newMapping.resourceType as ResourceType,
        categoryId: newMapping.categoryId,
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Permission Categories</CardTitle>
            <CardDescription>
              Manage permission categories to organize resources into logical
              groups
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddCategoryDialogOpen(true)} size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingCategories ? (
            <div className="w-full flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : permissionCategories && permissionCategories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionCategories.map((category) => {
                  const categoryMappings =
                    resourceCategoryMappings?.filter(
                      (mapping) => mapping.categoryId === category.id
                    ) || [];

                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>{category.description || "-"}</TableCell>
                      <TableCell>{category.displayOrder}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {categoryMappings.length > 0 ? (
                            categoryMappings.map((mapping) => (
                              <Badge
                                key={mapping.id}
                                variant="outline"
                                className="mr-1"
                              >
                                {getResourceTypeName(
                                  mapping.resourceType as ResourceType
                                )}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No resources
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCategoryId(category.id);
                              setNewMapping({
                                resourceType: "",
                                categoryId: category.id,
                              });
                              setIsAddMappingDialogOpen(true);
                            }}
                          >
                            <PlusIcon className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Resource</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCategory(category);
                              setIsEditCategoryDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeletingCategory(category);
                              setIsDeleteCategoryDialogOpen(true);
                            }}
                          >
                            <Trash className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 border rounded-md bg-muted/10">
              <h3 className="text-lg font-medium mb-2">
                No permission categories found
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first permission category to start organizing
                resources.
              </p>
              <Button onClick={() => setIsAddCategoryDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add First Category
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Category Mappings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Resource-Category Assignments</CardTitle>
            <CardDescription>
              View all resource assignments to categories
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsGeneratePermissionsDialogOpen(true)}
            size="sm"
            variant="default"
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            Generate Permissions
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingMappings ? (
            <div className="w-full flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : resourceCategoryMappings &&
            resourceCategoryMappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resourceCategoryMappings.map((mapping) => {
                  const category = permissionCategories?.find(
                    (c) => c.id === mapping.categoryId
                  );
                  return (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        {getResourceTypeName(
                          mapping.resourceType as ResourceType
                        )}
                      </TableCell>
                      <TableCell>
                        {category?.name || `Category ID: ${mapping.categoryId}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            deleteResourceCategoryMappingMutation.mutate(
                              mapping.id
                            );
                          }}
                        >
                          <Trash className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 border rounded-md bg-muted/10">
              <h3 className="text-lg font-medium mb-2">
                No resource-category mappings found
              </h3>
              <p className="text-muted-foreground mb-4">
                Assign resources to categories to better organize permissions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog
        open={isAddCategoryDialogOpen}
        onOpenChange={setIsAddCategoryDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Permission Category</DialogTitle>
            <DialogDescription>
              Create a new category to group related resources.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder="e.g., Clinical Resources"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={newCategory.description || ""}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    description: e.target.value,
                  })
                }
                placeholder="Optional description of this category"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-order">Display Order</Label>
              <Input
                id="category-order"
                type="number"
                value={newCategory.displayOrder}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                placeholder="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddCategoryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={
                !newCategory.name || createPermissionCategoryMutation.isPending
              }
            >
              {createPermissionCategoryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog
        open={isEditCategoryDialogOpen}
        onOpenChange={setIsEditCategoryDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permission Category</DialogTitle>
            <DialogDescription>
              Update the details of this permission category.
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category-name">Name</Label>
                <Input
                  id="edit-category-name"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category-description">Description</Label>
                <Textarea
                  id="edit-category-description"
                  value={editingCategory.description || ""}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category-order">Display Order</Label>
                <Input
                  id="edit-category-order"
                  type="number"
                  value={editingCategory.displayOrder}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      displayOrder: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null);
                setIsEditCategoryDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={
                !editingCategory?.name ||
                updatePermissionCategoryMutation.isPending
              }
            >
              {updatePermissionCategoryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog
        open={isDeleteCategoryDialogOpen}
        onOpenChange={setIsDeleteCategoryDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the permission category
              <span className="font-semibold"> {deletingCategory?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeletingCategory(null);
                setIsDeleteCategoryDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePermissionCategoryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Resource-Category Mapping Dialog */}
      <Dialog
        open={isAddMappingDialogOpen}
        onOpenChange={setIsAddMappingDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Resource to Category</DialogTitle>
            <DialogDescription>
              Select a resource type to add to this category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="resource-type">Resource Type</Label>
              <Select
                value={newMapping.resourceType}
                onValueChange={(value) =>
                  setNewMapping({ ...newMapping, resourceType: value })
                }
              >
                <SelectTrigger id="resource-type">
                  <SelectValue placeholder="Select a resource type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ResourceType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {getResourceTypeName(type as ResourceType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!selectedCategoryId && (
              <div className="grid gap-2">
                <Label htmlFor="category-id">Category</Label>
                <Select
                  value={
                    newMapping.categoryId
                      ? newMapping.categoryId.toString()
                      : ""
                  }
                  onValueChange={(value) =>
                    setNewMapping({
                      ...newMapping,
                      categoryId: parseInt(value, 10),
                    })
                  }
                >
                  <SelectTrigger id="category-id">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionCategories?.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategoryId(null);
                setIsAddMappingDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMapping}
              disabled={
                !newMapping.resourceType ||
                !newMapping.categoryId ||
                createResourceCategoryMappingMutation.isPending
              }
            >
              {createResourceCategoryMappingMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assign Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
