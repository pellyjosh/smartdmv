"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Heart,
  Activity,
  AlertCircle,
  PawPrint,
  Stethoscope,
  FileText,
  Video,
  Download,
  ExternalLink,
  Star,
  Users,
  Calendar,
  Filter,
} from "lucide-react";

// Resource categories and types
const resourceCategories = [
  { value: "wellness", label: "Wellness & Prevention", icon: Heart },
  { value: "nutrition", label: "Nutrition", icon: Activity },
  { value: "emergency", label: "Emergency", icon: AlertCircle },
  { value: "behavior", label: "Behavior", icon: PawPrint },
  { value: "grooming", label: "Grooming", icon: Stethoscope },
  { value: "exercise", label: "Exercise", icon: Activity },
  { value: "vaccination", label: "Vaccination", icon: Stethoscope },
  { value: "preventive-care", label: "Preventive Care", icon: Heart },
  { value: "dental-care", label: "Dental Care", icon: Stethoscope },
  { value: "senior-care", label: "Senior Care", icon: Heart },
];

const resourceTypes = [
  { value: "article", label: "Article", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "infographic", label: "Infographic", icon: FileText },
  { value: "checklist", label: "Checklist", icon: FileText },
  { value: "guide", label: "Guide", icon: FileText },
  { value: "emergency-contact", label: "Emergency Contact", icon: AlertCircle },
];

const speciesOptions = [
  { value: "all", label: "All Species" },
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "bird", label: "Bird" },
  { value: "reptile", label: "Reptile" },
  { value: "rabbit", label: "Rabbit" },
  { value: "ferret", label: "Ferret" },
];

const difficultyLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

interface HealthResource {
  id: number;
  title: string;
  description: string;
  content: string;
  category: string;
  type: string;
  species: string;
  author: string;
  tags: string[];
  estimatedReadTime: string;
  difficulty: string;
  featured: boolean;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  externalUrl?: string;
  downloadUrl?: string;
  emergencyType?: string;
  contactPhone?: string;
  contactAddress?: string;
  availability?: string;
}

// Resource Card Component
const ResourceCard = ({
  resource,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  resource: HealthResource;
  onEdit: (resource: HealthResource) => void;
  onDelete: (id: number) => void;
  onToggleFeatured: (id: number, featured: boolean) => void;
}) => {
  const getCategoryIcon = (category: string) => {
    const categoryConfig = resourceCategories.find((c) => c.value === category);
    const Icon = categoryConfig?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = resourceTypes.find((t) => t.value === type);
    const Icon = typeConfig?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${
        !resource.isActive ? "opacity-60" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getCategoryIcon(resource.category)}
              <CardTitle className="text-base line-clamp-2">
                {resource.title}
              </CardTitle>
              {resource.featured && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {resource.description}
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-xs">
                {getTypeIcon(resource.type)}
                <span className="ml-1">
                  {resourceTypes.find((t) => t.value === resource.type)?.label}
                </span>
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {
                  speciesOptions.find((s) => s.value === resource.species)
                    ?.label
                }
              </Badge>
              {resource.difficulty && (
                <Badge variant="outline" className="text-xs">
                  {resource.difficulty}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(resource)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onToggleFeatured(resource.id, !resource.featured)
                }
              >
                <Star className="h-4 w-4 mr-2" />
                {resource.featured ? "Remove from Featured" : "Make Featured"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(resource.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {resource.viewCount} views
            </span>
            {resource.estimatedReadTime && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {resource.estimatedReadTime}
              </span>
            )}
          </div>
          <span
            className={`px-2 py-1 rounded text-xs ${
              resource.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {resource.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        {resource.author && (
          <div className="mt-2 text-sm text-muted-foreground">
            By: {resource.author}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Create/Edit Resource Form Component
const ResourceForm = ({
  resource,
  onSave,
  onCancel,
}: {
  resource?: HealthResource | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: resource?.title || "",
    description: resource?.description || "",
    content: resource?.content || "",
    category: resource?.category || "wellness",
    type: resource?.type || "article",
    species: resource?.species || "all",
    author: resource?.author || "",
    tags: resource?.tags?.join(", ") || "",
    estimatedReadTime: resource?.estimatedReadTime || "",
    difficulty: resource?.difficulty || "beginner",
    featured: resource?.featured || false,
    isActive: resource?.isActive ?? true,
    thumbnailUrl: resource?.thumbnailUrl || "",
    imageUrl: resource?.imageUrl || "",
    videoUrl: resource?.videoUrl || "",
    externalUrl: resource?.externalUrl || "",
    downloadUrl: resource?.downloadUrl || "",
    emergencyType: resource?.emergencyType || "",
    contactPhone: resource?.contactPhone || "",
    contactAddress: resource?.contactAddress || "",
    availability: resource?.availability || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const processedData = {
      ...formData,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    onSave(processedData);
  };

  const isEmergencyContact = formData.type === "emergency-contact";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-[70vh] overflow-y-auto"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resourceCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type">Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resourceTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="species">Species</Label>
          <Select
            value={formData.species}
            onValueChange={(value) =>
              setFormData({ ...formData, species: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {speciesOptions.map((species) => (
                <SelectItem key={species.value} value={species.value}>
                  {species.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty">Difficulty Level</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value) =>
              setFormData({ ...formData, difficulty: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {difficultyLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            value={formData.author}
            onChange={(e) =>
              setFormData({ ...formData, author: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="estimatedReadTime">Estimated Read Time</Label>
          <Input
            id="estimatedReadTime"
            value={formData.estimatedReadTime}
            onChange={(e) =>
              setFormData({ ...formData, estimatedReadTime: e.target.value })
            }
            placeholder="e.g., 5 minutes"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="wellness, prevention, health"
          />
        </div>

        {/* Media URLs */}
        <div>
          <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
          <Input
            id="thumbnailUrl"
            type="url"
            value={formData.thumbnailUrl}
            onChange={(e) =>
              setFormData({ ...formData, thumbnailUrl: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            type="url"
            value={formData.imageUrl}
            onChange={(e) =>
              setFormData({ ...formData, imageUrl: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="videoUrl">Video URL</Label>
          <Input
            id="videoUrl"
            type="url"
            value={formData.videoUrl}
            onChange={(e) =>
              setFormData({ ...formData, videoUrl: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="externalUrl">External URL</Label>
          <Input
            id="externalUrl"
            type="url"
            value={formData.externalUrl}
            onChange={(e) =>
              setFormData({ ...formData, externalUrl: e.target.value })
            }
          />
        </div>

        {/* Emergency Contact Fields */}
        {isEmergencyContact && (
          <>
            <div>
              <Label htmlFor="emergencyType">Emergency Type</Label>
              <Input
                id="emergencyType"
                value={formData.emergencyType}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyType: e.target.value })
                }
                placeholder="e.g., poison control, 24hr clinic"
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) =>
                  setFormData({ ...formData, contactPhone: e.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="contactAddress">Contact Address</Label>
              <Input
                id="contactAddress"
                value={formData.contactAddress}
                onChange={(e) =>
                  setFormData({ ...formData, contactAddress: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="availability">Availability</Label>
              <Input
                id="availability"
                value={formData.availability}
                onChange={(e) =>
                  setFormData({ ...formData, availability: e.target.value })
                }
                placeholder="e.g., 24/7, Mon-Fri 9-5"
              />
            </div>
          </>
        )}

        {/* Settings */}
        <div className="col-span-2 flex gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) =>
                setFormData({ ...formData, featured: e.target.checked })
              }
            />
            <span>Featured Resource</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
            />
            <span>Active</span>
          </label>
        </div>
      </div>

      <div className="col-span-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          rows={8}
          placeholder="Enter the full content of the resource in Markdown format..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{resource ? "Update" : "Create"} Resource</Button>
      </DialogFooter>
    </form>
  );
};

export default function AdminHealthResourcesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<HealthResource | null>(
    null
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch health resources
  const { data: healthResources = [], isLoading: isLoadingResources } =
    useQuery({
      queryKey: ["admin-health-resources"],
      queryFn: async () => {
        const res = await fetch("/api/admin/health-resources");
        if (!res.ok) {
          throw new Error("Failed to fetch health resources");
        }
        return await res.json();
      },
    });

  // Create resource mutation
  const createResourceMutation = useMutation({
    mutationFn: async (resourceData: any) => {
      const res = await fetch("/api/admin/health-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resourceData),
      });
      if (!res.ok) {
        throw new Error("Failed to create resource");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-health-resources"] });
      setIsDialogOpen(false);
      setEditingResource(null);
      toast({
        title: "Success",
        description: "Health resource created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create health resource",
        variant: "destructive",
      });
    },
  });

  // Update resource mutation
  const updateResourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/health-resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to update resource");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-health-resources"] });
      setIsDialogOpen(false);
      setEditingResource(null);
      toast({
        title: "Success",
        description: "Health resource updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update health resource",
        variant: "destructive",
      });
    },
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/health-resources/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete resource");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-health-resources"] });
      toast({
        title: "Success",
        description: "Health resource deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete health resource",
        variant: "destructive",
      });
    },
  });

  const handleCreateResource = () => {
    setEditingResource(null);
    setIsDialogOpen(true);
  };

  const handleEditResource = (resource: HealthResource) => {
    setEditingResource(resource);
    setIsDialogOpen(true);
  };

  const handleDeleteResource = async (id: number) => {
    if (
      window.confirm("Are you sure you want to delete this health resource?")
    ) {
      deleteResourceMutation.mutate(id);
    }
  };

  const handleToggleFeatured = (id: number, featured: boolean) => {
    updateResourceMutation.mutate({
      id,
      data: { featured },
    });
  };

  const handleSaveResource = (data: any) => {
    if (editingResource) {
      updateResourceMutation.mutate({
        id: editingResource.id,
        data,
      });
    } else {
      createResourceMutation.mutate(data);
    }
  };

  // Filter resources
  const filteredResources = healthResources.filter(
    (resource: HealthResource) => {
      const matchesCategory =
        filterCategory === "all" || resource.category === filterCategory;
      const matchesType = filterType === "all" || resource.type === filterType;
      const matchesSearch =
        searchTerm === "" ||
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        resource.author?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesType && matchesSearch;
    }
  );

  const totalResources = healthResources.length;
  const activeResources = healthResources.filter(
    (r: HealthResource) => r.isActive
  ).length;
  const featuredResources = healthResources.filter(
    (r: HealthResource) => r.featured
  ).length;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Health Resources Management</h1>
          <p className="text-muted-foreground">
            Create and manage educational resources for pet owners
          </p>
        </div>
        <Button onClick={handleCreateResource}>
          <Plus className="h-4 w-4 mr-2" />
          Create Resource
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Resources
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResources}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Resources
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeResources}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Featured Resources
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featuredResources}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {resourceCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type-filter">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {resourceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterCategory("all");
                  setFilterType("all");
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      {isLoadingResources ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource: HealthResource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onEdit={handleEditResource}
              onDelete={handleDeleteResource}
              onToggleFeatured={handleToggleFeatured}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Resources Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterCategory !== "all" || filterType !== "all"
                ? "No resources match your current filters."
                : "Get started by creating your first health resource."}
            </p>
            <Button onClick={handleCreateResource}>
              <Plus className="h-4 w-4 mr-2" />
              Create Resource
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? "Edit" : "Create"} Health Resource
            </DialogTitle>
            <DialogDescription>
              {editingResource
                ? "Update the health resource information below."
                : "Create a new health resource for pet owners."}
            </DialogDescription>
          </DialogHeader>
          <ResourceForm
            resource={editingResource}
            onSave={handleSaveResource}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingResource(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
