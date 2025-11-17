"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit,
  Trash,
  ArrowLeft,
  Tag,
  Home,
  Ruler,
} from "lucide-react";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
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
import { usePracticeId } from "@/hooks/use-practice-id";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Kennel {
  id: number;
  name: string;
  practiceId: number;
  type:
    | "standard"
    | "deluxe"
    | "premium"
    | "isolation"
    | "outdoor"
    | "cats_only"
    | "special_needs";
  size: "small" | "medium" | "large" | "extra_large";
  location: string | null;
  description: string | null;
  isActive: boolean;
}

export default function BoardingKennelManagementPage() {
  const practiceId = usePracticeId();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [showInactiveKennels, setShowInactiveKennels] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingKennel, setEditingKennel] = useState<Kennel | null>(null);
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  // Create form state
  const [formData, setFormData] = useState({
    name: "",
    type: "standard",
    size: "medium",
    location: "",
    description: "",
    isActive: true,
  });

  // Fetch kennels
  const {
    data: kennels,
    isLoading: kennelsLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/boarding/kennels", practiceId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/boarding/kennels?practiceId=${practiceId}`
      );
      return await res.json();
    },
    enabled: !!practiceId,
  });

  // Use API data directly - no mock data needed
  const displayKennels = kennels || [];

  // Filter function for search and filters
  const filterKennels = (
    kennels: Kennel[],
    query: string,
    type: string,
    size: string,
    showInactive: boolean
  ) => {
    return kennels.filter((kennel) => {
      const matchesSearch =
        !query ||
        kennel.name.toLowerCase().includes(query.toLowerCase()) ||
        (kennel.location &&
          kennel.location.toLowerCase().includes(query.toLowerCase())) ||
        (kennel.description &&
          kennel.description.toLowerCase().includes(query.toLowerCase()));

      const matchesType = type === "all" || kennel.type === type;
      const matchesSize = size === "all" || kennel.size === size;
      const matchesActive = showInactive || kennel.isActive;

      return matchesSearch && matchesType && matchesSize && matchesActive;
    });
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Handle form submission for new kennel
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // If editing, update the kennel
      if (editingKennel) {
        await apiRequest("PATCH", `/api/boarding/kennels/${editingKennel.id}`, {
          ...formData,
          practiceId,
        });
        toast({
          title: "Kennel updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Otherwise create a new kennel
        await apiRequest("POST", "/api/boarding/kennels", {
          ...formData,
          practiceId,
        });
        toast({
          title: "Kennel created",
          description: `${formData.name} has been added to your kennel inventory.`,
        });
      }

      // Reset form and close dialog
      setFormData({
        name: "",
        type: "standard",
        size: "medium",
        location: "",
        description: "",
        isActive: true,
      });
      setEditingKennel(null);
      setIsAddDialogOpen(false);

      // Refresh the kennel list
      refetch();
    } catch (error) {
      console.error("Error saving kennel:", error);
      toast({
        title: "Error",
        description: "Failed to save kennel. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle kennel deactivation/activation
  const handleToggleActive = async (kennel: Kennel) => {
    try {
      await apiRequest("PATCH", `/api/boarding/kennels/${kennel.id}`, {
        isActive: !kennel.isActive,
      });

      toast({
        title: kennel.isActive ? "Kennel deactivated" : "Kennel activated",
        description: `${kennel.name} has been ${
          kennel.isActive ? "deactivated" : "activated"
        } successfully.`,
      });

      // Refresh the kennel list
      refetch();
    } catch (error) {
      console.error("Error toggling kennel status:", error);
      toast({
        title: "Error",
        description: "Failed to update kennel status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle kennel edit
  const handleEdit = (kennel: Kennel) => {
    setEditingKennel(kennel);
    setFormData({
      name: kennel.name,
      type: kennel.type,
      size: kennel.size,
      location: kennel.location || "",
      description: kennel.description || "",
      isActive: kennel.isActive,
    });
    setIsAddDialogOpen(true);
  };

  // Render type badge with appropriate color
  const renderTypeBadge = (type: string) => {
    let variant = "outline";
    switch (type) {
      case "standard":
        variant = "secondary";
        break;
      case "deluxe":
        variant = "default";
        break;
      case "premium":
        variant = "blue";
        break;
      case "isolation":
        variant = "destructive";
        break;
      case "outdoor":
        variant = "green";
        break;
      case "cats_only":
        variant = "purple";
        break;
      case "special_needs":
        variant = "yellow";
        break;
    }

    return (
      <Badge variant={variant as any} className="capitalize">
        {type.replace("_", " ")}
      </Badge>
    );
  };

  // Render size badge
  const renderSizeBadge = (size: string) => {
    return (
      <Badge variant="outline" className="capitalize">
        {size}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/boarding">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              Kennel Management
              {!isOnline && (
                <Badge variant="secondary" className="gap-1.5">
                  <WifiOff className="h-3 w-3" />
                  Offline Mode
                </Badge>
              )}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage boarding kennels and cages
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingKennel(null);
                setFormData({
                  name: "",
                  type: "standard",
                  size: "medium",
                  location: "",
                  description: "",
                  isActive: true,
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Kennel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingKennel ? "Edit Kennel" : "Add New Kennel"}
              </DialogTitle>
              <DialogDescription>
                {editingKennel
                  ? "Update the kennel details below."
                  : "Enter the details for the new kennel."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="A1"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <Select
                    name="type"
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, type: value as any }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="deluxe">Deluxe</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="isolation">Isolation</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                      <SelectItem value="cats_only">Cats Only</SelectItem>
                      <SelectItem value="special_needs">
                        Special Needs
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="size" className="text-right">
                    Size
                  </Label>
                  <Select
                    name="size"
                    value={formData.size}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, size: value as any }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="extra_large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">
                    Location
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Main Building - Room 1"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Standard kennel with outdoor access"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isActive" className="text-right">
                    Active
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <input
                      id="isActive"
                      name="isActive"
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isActive" className="font-normal">
                      Kennel is available for booking
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingKennel ? "Update Kennel" : "Add Kennel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Boarding Kennels</CardTitle>
          <CardDescription>Manage your kennel inventory</CardDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, location, description..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deluxe">Deluxe</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="isolation">Isolation</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
                <SelectItem value="cats_only">Cats Only</SelectItem>
                <SelectItem value="special_needs">Special Needs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="extra_large">Extra Large</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <input
                id="showInactive"
                type="checkbox"
                checked={showInactiveKennels}
                onChange={(e) => setShowInactiveKennels(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="showInactive" className="font-normal text-sm">
                Show inactive kennels
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {kennelsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filterKennels(
              displayKennels,
              searchQuery,
              typeFilter,
              sizeFilter,
              showInactiveKennels
            ).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No kennels found matching the current filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium">Name</th>
                    <th className="py-3 px-4 text-left font-medium">Type</th>
                    <th className="py-3 px-4 text-left font-medium">Size</th>
                    <th className="py-3 px-4 text-left font-medium">
                      Location
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Description
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filterKennels(
                    displayKennels,
                    searchQuery,
                    typeFilter,
                    sizeFilter,
                    showInactiveKennels
                  ).map((kennel) => (
                    <tr key={kennel.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{kennel.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          {renderTypeBadge(kennel.type)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                          {renderSizeBadge(kennel.size)}
                        </div>
                      </td>
                      <td className="py-3 px-4">{kennel.location}</td>
                      <td className="py-3 px-4">{kennel.description}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={kennel.isActive ? "default" : "secondary"}
                        >
                          {kennel.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            title="Edit"
                            onClick={() => handleEdit(kennel)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={
                              kennel.isActive ? "destructive" : "default"
                            }
                            size="icon"
                            title={kennel.isActive ? "Deactivate" : "Activate"}
                            onClick={() => handleToggleActive(kennel)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
