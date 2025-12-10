"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckSquare,
  Package,
  PlusCircle,
  Search,
  ShoppingBag,
  Trash,
  ArrowUpDown,
  AlertTriangle,
  Pill,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RequirePermission, PermissionButton } from "@/lib/rbac/components";
import { Inventory } from "@/db/schema";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { StockAlerts } from "@/components/inventory/stock-alerts";
import { MarketplaceFeatureMessage } from "@/components/features/marketplace-feature-message";
// import { useFeatureAccess } from "@/hooks/use-feature-access";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [batchActionDialogOpen, setBatchActionDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [batchAction, setBatchAction] = useState<
    "adjust" | "delete" | "update"
  >("adjust");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const { format } = useCurrencyFormatter();

  // Single item adjustment state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<string>("");
  const [adjustType, setAdjustType] = useState<string>("add");
  const [adjustNotes, setAdjustNotes] = useState<string>("");

  // Quick Add Templates
  const quickAddTemplates = [
    {
      name: "Amoxicillin 500mg",
      type: "medication",
      description: "Antibiotic tablets",
      unit: "tablets",
      minQuantity: 20,
    },
    {
      name: "Surgical Gloves",
      type: "supply",
      description: "Disposable latex gloves",
      unit: "boxes",
      minQuantity: 5,
    },
    {
      name: "Digital Thermometer",
      type: "equipment",
      description: "Veterinary digital thermometer",
      unit: "units",
      minQuantity: 2,
    },
  ];

  // Quick add function
  const handleQuickAdd = (template: (typeof quickAddTemplates)[0]) => {
    const form = document.getElementById("add-item-form") as HTMLFormElement;
    if (form) {
      // Fill form with template data
      (form.elements.namedItem("name") as HTMLInputElement).value =
        template.name;
      (form.elements.namedItem("description") as HTMLInputElement).value =
        template.description;
      (form.elements.namedItem("unit") as HTMLInputElement).value =
        template.unit;
      (form.elements.namedItem("minQuantity") as HTMLInputElement).value =
        template.minQuantity.toString();

      // Set select value for type
      const typeSelect = form.querySelector('[name="type"]') as HTMLElement;
      if (typeSelect) {
        typeSelect.setAttribute("data-value", template.type);
        // Trigger change event
        typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }

      // Clear any existing errors
      setFormErrors({});
    }
  };

  // Fetch inventory data
  const {
    data: inventoryItems,
    isLoading,
    isError,
    refetch,
  } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  // Calculate totals and metrics
  const totalItems = inventoryItems?.length || 0;
  const lowStockItems =
    inventoryItems?.filter((item) => item.quantity < (item.minQuantity || 0))
      .length || 0;
  const totalValue =
    inventoryItems?.reduce((acc, item) => {
      const price = parseFloat(
        Array.isArray(item.price) ? item.price[0] : item.price || "0"
      );
      return acc + price * item.quantity;
    }, 0) || 0;

  // Filter inventory items
  const filteredItems = inventoryItems
    ? inventoryItems.filter((item) => {
        const matchesSearch =
          searchTerm === "" ||
          (typeof item.name === "string"
            ? item.name.toLowerCase()
            : Array.isArray(item.name)
            ? item.name.join(" ").toLowerCase()
            : ""
          ).includes(searchTerm.toLowerCase()) ||
          (typeof item.description === "string"
            ? item.description.toLowerCase().includes(searchTerm.toLowerCase())
            : Array.isArray(item.description)
            ? item.description
                .join(" ")
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            : false) ||
          (typeof item.sku === "string"
            ? item.sku.toLowerCase()
            : Array.isArray(item.sku)
            ? item.sku.join(" ").toLowerCase()
            : ""
          ).includes(searchTerm.toLowerCase());

        const matchesCategory =
          categoryFilter === "all" || item.type === categoryFilter;

        return matchesSearch && matchesCategory;
      })
    : [];

  // Function to get stock status
  const getStockStatus = (item: Inventory) => {
    if (!item.minQuantity) return "normal";
    if (item.quantity <= 0) return "out";
    if (item.quantity <= item.minQuantity * 0.5) return "critical";
    if (item.quantity <= item.minQuantity) return "low";
    return "normal";
  };

  // Add inventory item mutation
  const addInventoryMutation = useMutation({
    mutationFn: async (newItem: any) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newItem),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add inventory item");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Item Added Successfully",
        description: `${data.name} has been added to your inventory.`,
      });
      setAddItemDialogOpen(false);
      // Reset form and clear errors
      const form = document.getElementById("add-item-form") as HTMLFormElement;
      form?.reset();
      setFormErrors({});
      refetch();
    },
    onError: (error: any) => {
      // Handle validation errors from server
      if (error.message.includes("Validation failed")) {
        try {
          const errorData = JSON.parse(
            error.message.split("Validation failed: ")[1]
          );
          const newFormErrors: { [key: string]: string } = {};

          if (errorData.details) {
            errorData.details.forEach((detail: any) => {
              if (detail.path && detail.path.length > 0) {
                newFormErrors[detail.path[0]] = detail.message;
              }
            });
          }

          setFormErrors(newFormErrors);
        } catch (parseError) {
          // Fallback to generic error message
          toast({
            title: "Validation Error",
            description: "Please check your form inputs and try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error Adding Item",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    },
  });

  // Handle add new item
  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous errors
    setFormErrors({});

    const formData = new FormData(e.currentTarget);

    // Parse and validate form data
    const rawData = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      description: (formData.get("description") as string) || undefined,
      sku: (formData.get("sku") as string) || undefined,
      quantity: parseInt(formData.get("quantity") as string, 10) || 0,
      unit: (formData.get("unit") as string) || undefined,
      minQuantity: (formData.get("minQuantity") as string)
        ? parseInt(formData.get("minQuantity") as string, 10)
        : undefined,
      cost: (formData.get("cost") as string) || undefined,
      price: (formData.get("price") as string) || undefined,
      location: (formData.get("location") as string) || undefined,
      supplier: (formData.get("supplier") as string) || undefined,
      expiryDate: (formData.get("expiryDate") as string) || undefined,
      deaSchedule: (formData.get("deaSchedule") as string) || "none",
      requiresSpecialAuth: formData.get("requiresSpecialAuth") === "on",
    };

    // Client-side validation
    const errors: { [key: string]: string } = {};

    if (!rawData.name.trim()) {
      errors.name = "Item name is required.";
    }

    if (rawData.quantity < 0) {
      errors.quantity = "Quantity cannot be negative.";
    }

    if (rawData.minQuantity !== undefined && rawData.minQuantity < 0) {
      errors.minQuantity = "Minimum quantity cannot be negative.";
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Remove empty strings and convert to proper types
    const newItem = Object.fromEntries(
      Object.entries(rawData).filter(
        ([_, value]) => value !== undefined && value !== ""
      )
    );

    addInventoryMutation.mutate(newItem);
  };

  // Batch actions mutations
  const { toast } = useToast();

  const batchAdjustMutation = useMutation({
    mutationFn: async (data: { itemIds: number[]; quantityChange: number }) => {
      const res = await fetch("/api/inventory/batch-adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to adjust inventory items");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock Updated",
        description: `Successfully updated ${selectedItems.length} items.`,
      });
      setSelectedItems([]);
      setBatchActionDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update items. " + (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      const res = await fetch("/api/inventory/batch-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemIds }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete inventory items");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Items Deleted",
        description: `Successfully deleted ${selectedItems.length} items.`,
      });
      setSelectedItems([]);
      setBatchActionDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete items. " + (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Single item adjustment mutation
  const adjustItemMutation = useMutation({
    mutationFn: async (data: {
      itemId: number;
      quantity: number;
      transactionType: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/inventory/${data.itemId}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: data.quantity,
          transactionType: data.transactionType,
          notes: data.notes,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to adjust inventory");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock Adjusted",
        description: `Successfully adjusted stock for ${
          selectedItem?.name || "item"
        }.`,
      });
      setAdjustDialogOpen(false);
      setSelectedItem(null);
      setAdjustQuantity("");
      setAdjustType("add");
      setAdjustNotes("");
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Handle batch action form submission
  const handleBatchAction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (batchAction === "adjust") {
      const quantityChange = parseInt(formData.get("quantityChange") as string);
      batchAdjustMutation.mutate({
        itemIds: selectedItems,
        quantityChange,
      });
    } else if (batchAction === "delete") {
      batchDeleteMutation.mutate(selectedItems);
    }
  };

  // Handle single item adjustment
  const handleOpenAdjustDialog = (item: any) => {
    setSelectedItem(item);
    setAdjustQuantity("");
    setAdjustType("add");
    setAdjustNotes("");
    setAdjustDialogOpen(true);
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!adjustQuantity || isNaN(parseInt(adjustQuantity))) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    adjustItemMutation.mutate({
      itemId: selectedItem.id,
      quantity: parseInt(adjustQuantity),
      transactionType: adjustType,
      notes: adjustNotes || undefined,
    });
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <Dialog
          open={addItemDialogOpen}
          onOpenChange={(open) => {
            setAddItemDialogOpen(open);
            if (!open) {
              // Clear form and errors when dialog closes
              setTimeout(() => {
                const form = document.getElementById(
                  "add-item-form"
                ) as HTMLFormElement;
                form?.reset();
                setFormErrors({});
              }, 100);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <form id="add-item-form" onSubmit={handleAddItem}>
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Complete the form below to add a new item to your inventory.
                </DialogDescription>

                {/* Quick Add Templates */}
                <div className="mt-4">
                  <Label className="text-sm font-medium">
                    Quick Add Templates:
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {quickAddTemplates.map((template, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdd(template)}
                        className="text-xs"
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        placeholder="e.g., Amoxicillin 500mg"
                        className={formErrors.name ? "border-red-500" : ""}
                      />
                      {formErrors.name && (
                        <p className="text-sm text-red-500">
                          {formErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Category *</Label>
                      <Select name="type" defaultValue="medication">
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medication">Medication</SelectItem>
                          <SelectItem value="supply">Supply</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      placeholder="Brief description of the item"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU/Item Code</Label>
                      <Input
                        id="sku"
                        name="sku"
                        placeholder="e.g., MED-AMX-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Storage Location</Label>
                      <Input
                        id="location"
                        name="location"
                        placeholder="e.g., Pharmacy Shelf A2"
                      />
                    </div>
                  </div>
                </div>

                {/* Quantity & Stock Management */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Quantity & Stock Management
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Current Quantity *</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0"
                        required
                        defaultValue="0"
                        placeholder="0"
                        className={formErrors.quantity ? "border-red-500" : ""}
                      />
                      {formErrors.quantity && (
                        <p className="text-sm text-red-500">
                          {formErrors.quantity}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        name="unit"
                        placeholder="e.g., tablets, ml, boxes"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minQuantity">
                        Low Stock Alert Threshold
                      </Label>
                      <Input
                        id="minQuantity"
                        name="minQuantity"
                        type="number"
                        min="0"
                        defaultValue="10"
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                {/* Pricing & Supplier */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Pricing & Supplier
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost">Cost Per Unit</Label>
                      <Input
                        id="cost"
                        name="cost"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Selling Price Per Unit</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input
                        id="supplier"
                        name="supplier"
                        placeholder="e.g., VetSource, Patterson"
                      />
                    </div>
                  </div>
                </div>

                {/* Controlled substance section */}
                <div
                  className="relative border p-4 pt-6 rounded-md bg-yellow-50/30 border-yellow-200"
                  id="controlled-substance-fields"
                >
                  <div className="absolute -top-3 left-3 inline-flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="bg-yellow-500 hover:bg-yellow-500 text-white font-medium border-yellow-500"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                      MARKETPLACE ADD-ON
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2 mb-4">
                    Controlled Substance Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deaSchedule">DEA Schedule</Label>
                      <Select name="deaSchedule" defaultValue="none" disabled>
                        <SelectTrigger id="deaSchedule">
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            None (Not Controlled)
                          </SelectItem>
                          <SelectItem value="schedule_i">
                            Schedule I (CI)
                          </SelectItem>
                          <SelectItem value="schedule_ii">
                            Schedule II (CII)
                          </SelectItem>
                          <SelectItem value="schedule_iii">
                            Schedule III (CIII)
                          </SelectItem>
                          <SelectItem value="schedule_iv">
                            Schedule IV (CIV)
                          </SelectItem>
                          <SelectItem value="schedule_v">
                            Schedule V (CV)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end mb-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requiresSpecialAuth"
                          name="requiresSpecialAuth"
                          disabled
                        />
                        <Label
                          htmlFor="requiresSpecialAuth"
                          className="font-normal"
                        >
                          Requires Special Authorization
                        </Label>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-yellow-800 mt-2">
                    Controlled Substance Tracking is a marketplace add-on
                    feature.
                    <Link
                      href="/marketplace"
                      className="underline font-medium ml-1"
                    >
                      Upgrade in Marketplace
                    </Link>
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddItemDialogOpen(false);
                    // Clear form and errors when cancel is clicked
                    setTimeout(() => {
                      const form = document.getElementById(
                        "add-item-form"
                      ) as HTMLFormElement;
                      form?.reset();
                      setFormErrors({});
                    }, 100);
                  }}
                  disabled={addInventoryMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addInventoryMutation.isPending}>
                  {addInventoryMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Adding Item...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Item
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Items</CardTitle>
            <CardDescription>Inventory items tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>Items below minimum quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {lowStockItems}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Value</CardTitle>
            <CardDescription>Current inventory value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{format(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        defaultValue="all"
        className="mb-6"
        onValueChange={setCategoryFilter}
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="medication">Medications</TabsTrigger>
            <TabsTrigger value="supply">Supplies</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="drug-interactions" className="relative">
              <div className="flex items-center gap-2">
                <span>Drug Interactions</span>
                <Badge
                  variant="outline"
                  className="bg-yellow-500 hover:bg-yellow-500 text-white"
                >
                  MARKETPLACE
                </Badge>
              </div>
            </TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search inventory..."
              className="w-[250px] pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <StockAlerts
          onRestock={(itemId) => {
            // Find the item and open the adjustment dialog
            const item = inventoryItems?.find((item) => item.id === itemId);
            if (item) {
              handleOpenAdjustDialog(item);
            }
          }}
        />

        <TabsContent value="all" className="m-0">
          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            isError={isError}
            getStockStatus={getStockStatus}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            setBatchActionDialogOpen={setBatchActionDialogOpen}
            onAdjustClick={handleOpenAdjustDialog}
          />
        </TabsContent>

        <TabsContent value="medication" className="m-0">
          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            isError={isError}
            getStockStatus={getStockStatus}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            setBatchActionDialogOpen={setBatchActionDialogOpen}
            onAdjustClick={handleOpenAdjustDialog}
          />
        </TabsContent>

        <TabsContent value="supply" className="m-0">
          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            isError={isError}
            getStockStatus={getStockStatus}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            setBatchActionDialogOpen={setBatchActionDialogOpen}
            onAdjustClick={handleOpenAdjustDialog}
          />
        </TabsContent>

        <TabsContent value="equipment" className="m-0">
          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            isError={isError}
            getStockStatus={getStockStatus}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            setBatchActionDialogOpen={setBatchActionDialogOpen}
            onAdjustClick={handleOpenAdjustDialog}
          />
        </TabsContent>

        <TabsContent value="drug-interactions" className="m-0">
          {/* Drug Interactions Marketplace Add-on Message */}
          <MarketplaceFeatureMessage
            featureName="Drug Interactions"
            featureId="drug_interactions"
            description="The Drug Interactions feature helps identify potential conflicts between medications in your inventory. Purchase this add-on to enhance patient safety and streamline medication management."
            addOnId="drug-interactions"
          />

          {/* Sample UI mockup of what the feature would look like */}
          <div className="mt-6 opacity-60 pointer-events-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Drug Interaction Checker</h3>
              <div className="flex gap-2">
                <Button variant="outline" disabled>
                  <Search className="mr-2 h-4 w-4" />
                  Check Interactions
                </Button>
                <Button variant="outline" disabled>
                  <Pill className="mr-2 h-4 w-4" />
                  Medication Database
                </Button>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Select Medications to Check</CardTitle>
                <CardDescription>
                  Choose two or more medications to analyze potential
                  interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Medication</Label>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select medication" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="med1">
                            Rimadyl (Carprofen)
                          </SelectItem>
                          <SelectItem value="med2">
                            Apoquel (Oclacitinib)
                          </SelectItem>
                          <SelectItem value="med3">Buprenorphine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Second Medication</Label>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select medication" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="med1">
                            Rimadyl (Carprofen)
                          </SelectItem>
                          <SelectItem value="med2">
                            Apoquel (Oclacitinib)
                          </SelectItem>
                          <SelectItem value="med3">Buprenorphine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Additional Medications (Optional)</Label>
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Select additional medications" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="med4">Meloxicam</SelectItem>
                        <SelectItem value="med5">Acepromazine</SelectItem>
                        <SelectItem value="med6">Prednisone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Batch Action Dialog */}
      <Dialog
        open={batchActionDialogOpen}
        onOpenChange={setBatchActionDialogOpen}
      >
        <DialogContent>
          <form onSubmit={handleBatchAction}>
            <DialogHeader>
              <DialogTitle>
                Batch Actions for {selectedItems.length} Items
              </DialogTitle>
              <DialogDescription>
                Choose an action to perform on the selected inventory items.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Action Type</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={batchAction === "adjust" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setBatchAction("adjust")}
                  >
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Adjust Stock
                  </Button>
                  <Button
                    type="button"
                    variant={batchAction === "delete" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setBatchAction("delete")}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Items
                  </Button>
                </div>
              </div>

              {batchAction === "adjust" && (
                <div className="space-y-2">
                  <Label htmlFor="quantityChange">Quantity Change</Label>
                  <div className="flex items-center">
                    <Input
                      id="quantityChange"
                      name="quantityChange"
                      type="number"
                      placeholder="Enter amount"
                      defaultValue="0"
                      className="flex-1"
                      required
                    />
                    <div className="ml-2 text-sm text-muted-foreground">
                      (positive to add, negative to subtract)
                    </div>
                  </div>
                </div>
              )}

              {batchAction === "delete" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This will permanently delete {selectedItems.length} items
                    from inventory. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchActionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={batchAction === "delete" ? "destructive" : "default"}
                disabled={
                  batchAdjustMutation.isPending || batchDeleteMutation.isPending
                }
              >
                {batchAdjustMutation.isPending ||
                batchDeleteMutation.isPending ? (
                  <>
                    <span className="mr-2">Processing</span>
                    <Spinner className="h-4 w-4" />
                  </>
                ) : batchAction === "delete" ? (
                  "Delete Items"
                ) : (
                  "Update Stock"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single Item Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Current stock: {selectedItem?.quantity}{" "}
              {selectedItem?.unit || "units"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdjustment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjustType">Transaction Type</Label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger id="adjustType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
                  <SelectItem value="use">Use/Consume</SelectItem>
                  <SelectItem value="expired">Mark as Expired</SelectItem>
                  <SelectItem value="lost">Mark as Lost/Damaged</SelectItem>
                  <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustQuantity">Quantity</Label>
              <Input
                id="adjustQuantity"
                type="number"
                min="1"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Enter quantity"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustNotes">Notes (Optional)</Label>
              <Textarea
                id="adjustNotes"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Add any notes about this adjustment..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustDialogOpen(false)}
                disabled={adjustItemMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adjustItemMutation.isPending}>
                {adjustItemMutation.isPending
                  ? "Adjusting..."
                  : "Confirm Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InventoryTableProps {
  items: Inventory[];
  isLoading: boolean;
  isError: boolean;
  getStockStatus: (item: Inventory) => string;
  selectedItems?: number[];
  setSelectedItems?: (ids: number[]) => void;
  setBatchActionDialogOpen?: (open: boolean) => void;
  onAdjustClick?: (item: any) => void;
}

function InventoryTable({
  items,
  isLoading,
  isError,
  getStockStatus,
  selectedItems = [],
  setSelectedItems,
  setBatchActionDialogOpen,
  onAdjustClick,
}: InventoryTableProps) {
  const hasSelectionEnabled = !!setSelectedItems;
  const { format } = useCurrencyFormatter();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!setSelectedItems) return;

    if (e.target.checked) {
      setSelectedItems(items.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, selected: boolean) => {
    if (!setSelectedItems) return;

    if (selected) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    }
  };

  const allSelected =
    hasSelectionEnabled &&
    items.length > 0 &&
    selectedItems.length === items.length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load inventory data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center border rounded-lg">
        <Package className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No inventory items found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search or filters, or add new items.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* <PermissionButton resource={"inventory" as any} action={"CREATE" as any}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Item
                </PermissionButton> */}
      {hasSelectionEnabled && selectedItems.length > 0 && (
        <div className="bg-muted p-4 mb-4 rounded-md flex justify-between items-center">
          <div>
            <span className="font-medium">
              {selectedItems.length} items selected
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedItems([])}
            >
              Clear Selection
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                setBatchActionDialogOpen && setBatchActionDialogOpen(true)
              }
            >
              Batch Actions
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelectionEnabled && (
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="w-[300px]">Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit</TableHead>
              <TableHead className="text-right">Min Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const stockStatus = getStockStatus(item);
              const isSelected = selectedItems.includes(item.id);

              return (
                <TableRow
                  key={item.id}
                  className={isSelected ? "bg-muted/50" : undefined}
                >
                  {hasSelectionEnabled && (
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={isSelected}
                        onChange={(e) =>
                          handleSelectItem(item.id, e.target.checked)
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div>
                      {item.name}
                      {item.description && (
                        <div className="text-sm text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {item.unit || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.minQuantity || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.price
                      ? format(
                          parseFloat(
                            Array.isArray(item.price)
                              ? item.price[0]
                              : item.price || "0"
                          )
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <StockStatusBadge status={stockStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={
                            `/admin/inventory/${item.id}` as unknown as string
                          }
                        >
                          Details
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAdjustClick?.(item)}
                      >
                        Adjust
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StockStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "out":
      return <Badge variant="destructive">Out of Stock</Badge>;
    case "critical":
      return (
        <Badge variant="destructive" className="bg-red-400">
          Critical
        </Badge>
      );
    case "low":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500">
          Low Stock
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-green-500 text-green-500">
          In Stock
        </Badge>
      );
  }
}
