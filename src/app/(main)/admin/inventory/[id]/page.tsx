"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Edit,
  ArrowUpDown,
  ShoppingCart,
  ShoppingBag,
  Trash2,
  Package,
  Calendar,
  Clock,
  User,
  Link as LinkIcon,
  ExternalLink,
  Plus,
  Box,
  Info,
  History as HistoryIcon,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MarketplaceFeatureMessage } from "@/components/features/marketplace-feature-message";
import { useUser } from "@/context/UserContext";
import { hasPermission } from "@/lib/rbac-helpers";
import { ResourceType, StandardAction } from "@/lib/rbac/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BreadcrumbNav from "@/components/breadcrumbs";
import { Spinner } from "@/components/ui/spinner";

import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";

// New implementation code goes below:

function InventoryItemDetailPage() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [currentTab, setCurrentTab] = useState("details");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [restockFormOpen, setRestockFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  // Permission checks
  const canRead = user
    ? hasPermission(user, StandardAction.READ, ResourceType.INVENTORY)
    : false;
  const canUpdate = user
    ? hasPermission(user, StandardAction.UPDATE, ResourceType.INVENTORY)
    : false;
  const canDelete = user
    ? hasPermission(user, StandardAction.DELETE, ResourceType.INVENTORY)
    : false;
  const canManage = user
    ? hasPermission(user, StandardAction.MANAGE, ResourceType.INVENTORY)
    : false;

  // Admin override for testing (temporary)
  const isAdmin =
    user?.role === "ADMINISTRATOR" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "PRACTICE_ADMINISTRATOR";
  const hasReadAccess = canRead || canManage || isAdmin;
  const hasUpdateAccess = canUpdate || canManage || isAdmin;
  const hasDeleteAccess = canDelete || canManage || isAdmin;

  // Interaction state
  const [interactions, setInteractions] = useState<any[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [showEditInteractionModal, setShowEditInteractionModal] =
    useState(false);
  const [showDeleteInteractionModal, setShowDeleteInteractionModal] =
    useState(false);

  // Safely parse the ID and handle NaN cases properly
  const itemId =
    params.id && !isNaN(parseInt(params.id)) ? parseInt(params.id, 10) : null;

  // Get inventory item details
  const {
    data: item,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["inventory", itemId],
    queryFn: async () => {
      if (!itemId) throw new Error("No item ID provided");
      const res = await apiRequest("GET", `/api/inventory/${itemId}`);
      return res.json();
    },
    enabled: !!itemId,
  }) as { data: any | undefined; isLoading: boolean; isError: boolean };

  // Add edit dialog form
  const editForm = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        description: z.string().optional(),
        type: z.string(),
        minQuantity: z.number().optional(),
        unit: z.string().optional(),
        sku: z.string().optional(),
        cost: z.number().optional(),
        price: z.number().optional(),
        supplier: z.string().optional(),
        location: z.string().optional(),
        deaSchedule: z.string().optional(),
        requiresSpecialAuth: z.boolean().optional(),
      })
    ),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      minQuantity: 0,
      unit: "",
      sku: "",
      cost: 0,
      price: 0,
      supplier: "",
      location: "",
      deaSchedule: "none",
      requiresSpecialAuth: false,
    },
  });

  // Update form values when item data changes
  useEffect(() => {
    if (item) {
      editForm.reset({
        name: item.name || "",
        description: item.description || "",
        type: item.type || "",
        minQuantity: item.minQuantity || 0,
        unit: item.unit || "",
        sku: item.sku || "",
        cost: item.cost || 0,
        price: item.price || 0,
        supplier: item.supplier || "",
        location: item.location || "",
        deaSchedule: item.deaSchedule || "none",
        requiresSpecialAuth: item.requiresSpecialAuth || false,
      });
    }
  }, [item, editForm]);

  // Edit item mutation
  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check permissions before mutation
      if (!hasUpdateAccess) {
        throw new Error("You do not have permission to edit inventory items");
      }

      const res = await apiRequest("PATCH", `/api/inventory/${itemId}`, data);
      return res;
    },
    onSuccess: () => {
      setEditDialogOpen(false);
      toast({
        title: "Item updated",
        description: "The inventory item has been updated successfully",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory", itemId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Interaction form schemas
  // Add interaction form
  const addInteractionSchema = z.object({
    medicationBId: z.string().or(z.number()),
    severity: z.enum(["mild", "moderate", "severe"]),
    description: z.string().min(5, "Description must be at least 5 characters"),
  });

  type AddInteractionFormValues = z.infer<typeof addInteractionSchema>;

  const addInteractionForm = useForm<AddInteractionFormValues>({
    resolver: zodResolver(addInteractionSchema),
    defaultValues: {
      medicationBId: "",
      severity: "moderate",
      description: "",
    },
  });

  // Edit interaction form
  const editInteractionSchema = z.object({
    severity: z.enum(["mild", "moderate", "severe"]),
    description: z.string().min(5, "Description must be at least 5 characters"),
  });

  type EditInteractionFormValues = z.infer<typeof editInteractionSchema>;

  const editInteractionForm = useForm<EditInteractionFormValues>({
    resolver: zodResolver(editInteractionSchema),
    defaultValues: {
      severity: "moderate",
      description: "",
    },
  });

  // Update edit interaction form values when selection changes
  useEffect(() => {
    if (selectedInteraction) {
      editInteractionForm.reset({
        severity: selectedInteraction.severity,
        description: selectedInteraction.description,
      });
    }
  }, [selectedInteraction, editInteractionForm]);

  // Query for other medications to populate the dropdown
  const { data: otherMedications = [] } = useQuery({
    queryKey: ["inventory", "medications", itemId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/inventory");
      const data = await res.json();
      return data.filter(
        (med: any) => med.id !== Number(itemId) && med.type === "medication"
      );
    },
    enabled: !!itemId && showAddInteractionModal,
  });

  // Add interaction mutation
  const addInteractionMutation = useMutation({
    mutationFn: async (data: AddInteractionFormValues) => {
      // Check permissions before mutation
      if (!hasUpdateAccess) {
        throw new Error(
          "You do not have permission to add medication interactions"
        );
      }

      const payload = {
        medicationAId: itemId,
        medicationBId: data.medicationBId,
        severity: data.severity,
        description: data.description,
      };

      const res = await apiRequest(
        "POST",
        "/api/medication-interactions",
        payload
      );
      return res.json();
    },
    onSuccess: () => {
      setShowAddInteractionModal(false);
      addInteractionForm.reset();
      toast({
        title: "Interaction added",
        description:
          "The medication interaction has been recorded successfully",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/medication-interactions/by-medication/${itemId}`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add interaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit interaction mutation
  const editInteractionMutation = useMutation({
    mutationFn: async (data: EditInteractionFormValues) => {
      // Check permissions before mutation
      if (!hasUpdateAccess) {
        throw new Error(
          "You do not have permission to edit medication interactions"
        );
      }

      if (!selectedInteraction?.id) {
        throw new Error("No interaction selected");
      }

      const res = await apiRequest(
        "PATCH",
        `/api/medication-interactions/${selectedInteraction.id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      setShowEditInteractionModal(false);
      toast({
        title: "Interaction updated",
        description: "The medication interaction has been updated successfully",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/medication-interactions/by-medication/${itemId}`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update interaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete interaction mutation
  const deleteInteractionMutation = useMutation({
    mutationFn: async () => {
      // Check permissions before mutation
      if (!hasUpdateAccess) {
        throw new Error(
          "You do not have permission to delete medication interactions"
        );
      }

      if (!selectedInteraction?.id) {
        throw new Error("No interaction selected");
      }

      const res = await apiRequest(
        "DELETE",
        `/api/medication-interactions/${selectedInteraction.id}`
      );
      return res;
    },
    onSuccess: () => {
      setShowDeleteInteractionModal(false);
      toast({
        title: "Interaction deleted",
        description: "The medication interaction has been removed",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/medication-interactions/by-medication/${itemId}`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete interaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const handleAddInteraction = (data: AddInteractionFormValues) => {
    addInteractionMutation.mutate(data);
  };

  const handleEditInteraction = (data: EditInteractionFormValues) => {
    editInteractionMutation.mutate(data);
  };

  const handleDeleteInteraction = () => {
    deleteInteractionMutation.mutate();
  };

  // Adjust stock form
  const adjustStockForm = useForm({
    resolver: zodResolver(
      z.object({
        quantity: z.number(),
        transactionType: z.string(),
        notes: z.string().optional(),
      })
    ),
    defaultValues: {
      quantity: 0,
      transactionType: "add",
      notes: "",
    },
  });

  // Adjust stock mutation
  const adjustStockMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check permissions before mutation
      if (!hasUpdateAccess) {
        throw new Error("You do not have permission to adjust inventory stock");
      }

      // Make sure quantity is negative for remove transactions
      const adjustedData = {
        ...data,
        quantity:
          data.transactionType === "add"
            ? Math.abs(data.quantity)
            : -Math.abs(data.quantity),
      };

      const res = await apiRequest(
        "POST",
        `/api/inventory/${itemId}/adjust`,
        adjustedData
      );
      return res;
    },
    onSuccess: () => {
      setAdjustDialogOpen(false);
      adjustStockForm.reset();
      toast({
        title: "Stock adjusted",
        description: "The inventory has been updated successfully",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory", itemId] });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventory/${itemId}/transactions`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to adjust stock",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restock form
  const restockForm = useForm({
    resolver: zodResolver(
      z.object({
        quantity: z.number().min(1, "Quantity must be at least 1"),
        notes: z.string().optional(),
        supplier: z.string().optional(),
        cost: z.number().optional(),
        // Remove the date picker because it's causing issues
        // expiryDate: z.date().optional().nullable(),
      })
    ),
    defaultValues: {
      quantity: 1,
      notes: "",
      supplier: "",
      cost: 0,
      // expiryDate: null,
    },
  });

  // Use effect to set default supplier
  useEffect(() => {
    if (item && item.supplier) {
      restockForm.setValue("supplier", item.supplier);
    }
    if (item && item.cost) {
      restockForm.setValue("cost", item.cost);
    }
  }, [item, restockForm]);

  const restockMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check permissions before mutation
      if (!hasUpdateAccess) {
        throw new Error(
          "You do not have permission to restock inventory items"
        );
      }

      const adjustData = {
        quantity: data.quantity,
        transactionType: "add",
        notes: `Restock: ${data.notes || ""} ${
          data.supplier ? `from ${data.supplier}` : ""
        }`,
      };

      const res = await apiRequest(
        "POST",
        `/api/inventory/${itemId}/adjust`,
        adjustData
      );

      // If there's a new cost or supplier, update the item
      if (data.cost || data.supplier) {
        const updateData = {
          ...(data.cost ? { cost: data.cost } : {}),
          ...(data.supplier ? { supplier: data.supplier } : {}),
        };

        await apiRequest("PATCH", `/api/inventory/${itemId}`, updateData);
      }

      return res;
    },
    onSuccess: () => {
      setRestockFormOpen(false);
      restockForm.reset();
      toast({
        title: "Item restocked",
        description: "The inventory has been updated successfully",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory", itemId] });
      queryClient.invalidateQueries({
        queryKey: [`/api/inventory/${itemId}/transactions`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to restock item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get transactions history using the correct endpoint format
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["inventory", itemId, "transactions"],
    queryFn: async () => {
      if (!itemId) return [];
      const res = await apiRequest(
        "GET",
        `/api/inventory/${itemId}/transactions`
      );
      return res.json();
    },
    enabled: !!itemId && currentTab === "history",
  }) as { data: any[]; isLoading: boolean };

  // Fetch interactions data for the inventory item
  const { data: interactionsData = [], isLoading: interactionsLoading } =
    useQuery({
      queryKey: ["medication-interactions", itemId],
      queryFn: async () => {
        if (!itemId) return [];
        const res = await apiRequest(
          "GET",
          `/api/medication-interactions/by-medication/${itemId}`
        );
        return res.json();
      },
      enabled:
        !!itemId &&
        !!item &&
        item.type === "medication" &&
        currentTab === "interactions",
    }) as { data: any[]; isLoading: boolean };

  // Update the interactions state when data is loaded
  useEffect(() => {
    if (interactionsData && Array.isArray(interactionsData)) {
      setInteractions(interactionsData);
    }
  }, [interactionsData]);

  // Get usage chart data
  const usageChartData =
    item && transactions
      ? [...Array(6).keys()]
          .map((i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);

            const month = date.toLocaleString("default", {
              month: "short",
              year: "2-digit",
            });

            // Find relevant transactions for this month
            const monthTransactions = transactions.filter((t: any) => {
              const txDate = new Date(t.createdAt);
              return (
                txDate.getMonth() === date.getMonth() &&
                txDate.getFullYear() === date.getFullYear()
              );
            });

            // Calculate usage stats for this month
            const usage = monthTransactions
              .filter(
                (t: any) =>
                  t.transactionType === "use" || t.transactionType === "remove"
              )
              .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);

            const additions = monthTransactions
              .filter((t: any) => t.transactionType === "add")
              .reduce((sum: number, t: any) => sum + t.quantity, 0);

            const expired = monthTransactions
              .filter((t: any) => t.transactionType === "expired")
              .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);

            const lost = monthTransactions
              .filter((t: any) => t.transactionType === "lost")
              .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);

            const adjustment = monthTransactions
              .filter((t: any) => t.transactionType === "adjustment")
              .reduce((sum: number, t: any) => sum + t.quantity, 0);

            // Calculate a running balance for each month
            // Use the current quantity and work backwards
            let runningBalance = item.quantity || 0;
            const laterMonths = [...Array(i).keys()].map((j) => {
              const laterDate = new Date();
              laterDate.setMonth(laterDate.getMonth() - j);
              return laterDate;
            });

            // Add all the net changes from later months
            laterMonths.forEach((laterDate) => {
              const laterMonthTransactions = transactions.filter((t: any) => {
                const txDate = new Date(t.createdAt);
                return (
                  txDate.getMonth() === laterDate.getMonth() &&
                  txDate.getFullYear() === laterDate.getFullYear()
                );
              });

              const netChange = laterMonthTransactions.reduce(
                (sum: number, t: any) => sum + t.quantity,
                0
              );
              runningBalance -= netChange;
            });

            return {
              month,
              usage,
              additions,
              expired,
              lost,
              adjustment,
              balance: runningBalance,
            };
          })
          .reverse()
      : [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Check permissions before mutation
      if (!hasDeleteAccess) {
        throw new Error("You do not have permission to delete inventory items");
      }

      if (!item || !item.id) {
        throw new Error("Cannot delete: item not found");
      }
      const res = await apiRequest("DELETE", `/api/inventory/${item.id}`);
      return res;
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setDeletePending(false);
      toast({
        title: "Item deleted",
        description: "The inventory item has been removed from the system",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      router.push("/admin/inventory");
    },
    onError: (error: Error) => {
      setDeletePending(false);
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    setDeletePending(true);
    deleteMutation.mutate();
  };

  if (isLoading || !item) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-4 text-lg text-muted-foreground">
          Loading item details...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">
          Unable to load inventory item details
        </p>
        <Button
          variant="secondary"
          onClick={() => router.push("/admin/inventory")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  // Check if user has permission to access this page
  if (!hasReadAccess) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You do not have permission to view inventory details
        </p>
        <Button
          variant="secondary"
          onClick={() => router.push("/admin/inventory")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  // Log item structure to help debug
  console.log("Item data structure:", JSON.stringify(item, null, 2));

  // Check explicitly for name property
  console.log("Item name exists:", item && "name" in item);
  console.log("Item name value:", item?.name);
  console.log("Item type value:", item?.type);
  console.log("Is medication?", item?.type === "medication");

  return (
    <div className="container mx-auto p-4 md:p-6">
      <BreadcrumbNav
        items={[
          { href: "/", label: "Dashboard" },
          { href: "/admin/inventory", label: "Inventory" },
          {
            href: `/admin/inventory/${item.id}`,
            label: item.name || "Item Details",
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {item.name || "Inventory Item"}
          </h1>
          <div className="flex items-center mt-2 text-muted-foreground">
            <Package className="mr-2 h-4 w-4" />
            <span className="mr-4">{item.type || ""}</span>

            {item.minQuantity && item.quantity <= item.minQuantity && (
              <Badge variant="destructive" className="ml-2">
                Low Stock
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          {hasUpdateAccess && (
            <Button variant="outline" size="sm" asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setEditDialogOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setEditDialogOpen(true);
                }}
                className="inline-flex items-center"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </div>
            </Button>
          )}
          {hasUpdateAccess && (
            <Button variant="outline" size="sm" asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setAdjustDialogOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setAdjustDialogOpen(true);
                }}
                className="inline-flex items-center"
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Adjust Stock
              </div>
            </Button>
          )}
          {hasUpdateAccess && (
            <Button variant="default" size="sm" asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setRestockFormOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setRestockFormOpen(true);
                }}
                className="inline-flex items-center"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Restock
              </div>
            </Button>
          )}
          {hasDeleteAccess && (
            <Button variant="destructive" size="sm" asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setDeleteDialogOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setDeleteDialogOpen(true);
                }}
                className="inline-flex items-center"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </div>
            </Button>
          )}
          {!hasReadAccess && (
            <div className="text-sm text-muted-foreground bg-yellow-50 px-3 py-2 rounded-md border border-yellow-200">
              <AlertTriangle className="inline h-4 w-4 mr-2" />
              Limited access - some actions may be restricted
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <Tabs
        defaultValue="details"
        onValueChange={setCurrentTab}
        value={currentTab}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">
            <Info className="mr-2 h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="history">
            <HistoryIcon className="mr-2 h-4 w-4" />
            Transaction History
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart className="mr-2 h-4 w-4" />
            Usage Analytics
          </TabsTrigger>
          <TabsTrigger
            value="interactions"
            disabled={item?.type !== "medication"}
            className="relative"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Drug Interactions</span>
              <Badge
                variant="secondary"
                className="bg-yellow-500 hover:bg-yellow-500 text-white"
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                MARKETPLACE
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">{item.quantity}</h3>
                    <p className="text-muted-foreground">
                      Current Stock ({item.unit || "units"})
                    </p>
                  </div>
                  {item.minQuantity && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Minimum Stock Level: {item.minQuantity}{" "}
                        {item.unit || "units"}
                      </p>
                    </div>
                  )}
                  {item.lastRestockDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Last Restocked:{" "}
                      {format(new Date(item.lastRestockDate), "PP")}
                    </div>
                  )}
                  {item.expiryDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      Expires: {format(new Date(item.expiryDate), "PP")}
                      {new Date(item.expiryDate) < new Date() && (
                        <Badge variant="destructive" className="ml-2">
                          Expired
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {item.sku && (
                    <div>
                      <p className="text-sm font-medium">SKU</p>
                      <p className="text-sm text-muted-foreground">
                        {item.sku}
                      </p>
                    </div>
                  )}
                  {item.description && (
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  )}
                  {item.supplier && (
                    <div>
                      <p className="text-sm font-medium">Supplier</p>
                      <p className="text-sm text-muted-foreground">
                        {item.supplier}
                      </p>
                    </div>
                  )}
                  {item.location && (
                    <div>
                      <p className="text-sm font-medium">Storage Location</p>
                      <p className="text-sm text-muted-foreground">
                        {item.location}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="relative">
                <CardTitle>Regulatory Information</CardTitle>
                <Badge
                  variant="secondary"
                  className="absolute top-4 right-6 bg-yellow-500 hover:bg-yellow-500 text-white font-medium"
                >
                  <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                  MARKETPLACE
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">DEA Schedule</p>
                    <div className="flex items-center">
                      {item.deaSchedule && item.deaSchedule !== "none" ? (
                        <>
                          <Badge variant="outline" className="font-semibold">
                            {item.deaSchedule
                              .replace("schedule_", "Schedule ")
                              .replace("_", " ")}
                          </Badge>
                          {item.deaSchedule.includes("i") && (
                            <Badge variant="destructive" className="ml-2">
                              Controlled Substance
                            </Badge>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          None (Not Controlled)
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Special Authorization</p>
                    <div className="flex items-center">
                      {item.requiresSpecialAuth ? (
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
                          <span className="text-sm text-destructive font-medium">
                            Required
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Not Required
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {item.cost && (
                    <div>
                      <p className="text-sm font-medium">Cost</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.cost}
                      </p>
                    </div>
                  )}
                  {item.price && (
                    <div>
                      <p className="text-sm font-medium">Price</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.price}
                      </p>
                    </div>
                  )}
                  {item.cost && item.price && (
                    <div>
                      <p className="text-sm font-medium">Markup</p>
                      <p className="text-sm text-muted-foreground">
                        {(
                          ((Number(item.price) - Number(item.cost)) /
                            Number(item.cost)) *
                          100
                        ).toFixed(2)}
                        %
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Record of all stock adjustments, usage, and restocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(new Date(transaction.createdAt), "PPp")}
                          </TableCell>
                          <TableCell>
                            {getTransactionTypeBadge(
                              transaction.transactionType
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                transaction.quantity > 0
                                  ? "text-green-600 font-medium"
                                  : "text-red-600 font-medium"
                              }
                            >
                              {transaction.quantity > 0 ? "+" : ""}
                              {transaction.quantity} {item.unit || "units"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1 text-muted-foreground" />
                              {transaction.performedByName}
                            </div>
                          </TableCell>
                          <TableCell>
                            {transaction.referenceType &&
                            (transaction.referenceData ||
                              transaction.referenceId) ? (
                              <div className="flex flex-col">
                                {transaction.referenceType ===
                                  "appointment" && (
                                  <>
                                    <div className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1 text-blue-500" />
                                      <span className="text-sm font-medium">
                                        {transaction.referenceData
                                          ? transaction.referenceData.title ||
                                            "Appointment"
                                          : `Appointment #${transaction.referenceId}`}
                                      </span>
                                    </div>
                                    {transaction.referenceData &&
                                      transaction.referenceData.startTime && (
                                        <Badge
                                          variant="outline"
                                          className="mt-1 self-start px-2 py-0 text-xs"
                                        >
                                          {format(
                                            new Date(
                                              transaction.referenceData.startTime
                                            ),
                                            "PPp"
                                          )}
                                        </Badge>
                                      )}
                                    <Link
                                      href={`/admin/appointments/${transaction.referenceId}`}
                                      className="text-xs text-blue-500 hover:underline mt-1"
                                    >
                                      <ExternalLink className="h-3 w-3 inline mr-1" />
                                      View appointment
                                    </Link>
                                  </>
                                )}
                                {transaction.referenceType !==
                                  "appointment" && (
                                  <div className="flex items-center">
                                    <LinkIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                                    <span className="text-sm">
                                      {transaction.referenceType}:{" "}
                                      {transaction.referenceId}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                None
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {transaction.notes || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transaction history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>Usage Trends (Last 6 Months)</CardTitle>
                <CardDescription>
                  Track inventory consumption and restocking patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={usageChartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="usage" name="Usage" fill="#ef4444" />
                        <Bar dataKey="expired" name="Expired" fill="#f97316" />
                        <Bar
                          dataKey="lost"
                          name="Lost/Damaged"
                          fill="#a16207"
                        />
                        <Bar
                          dataKey="adjustment"
                          name="Adjustments"
                          fill="#6366f1"
                        />
                        <Bar
                          dataKey="additions"
                          name="Additions"
                          fill="#22c55e"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Not enough data to display usage trends
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Balance Chart */}
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>Inventory Balance Over Time</CardTitle>
                <CardDescription>
                  Track how stock levels have changed monthly
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={usageChartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="balance"
                          name="Balance"
                          stroke="#3b82f6"
                          activeDot={{ r: 8 }}
                        />
                        {item.minQuantity && (
                          <ReferenceLine
                            y={item.minQuantity}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              value: `Min. Level (${item.minQuantity})`,
                              position: "insideBottomRight",
                              fill: "#ef4444",
                              fontSize: 12,
                            }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Not enough data to display balance history
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Drug Interactions Tab */}
        <TabsContent value="interactions">
          {/* Drug Interactions Marketplace Add-on Message */}
          <MarketplaceFeatureMessage
            featureName="Drug Interactions"
            featureId="drug_interactions"
            description="The Drug Interactions feature helps identify potential conflicts between medications in your inventory. Purchase this add-on to enhance patient safety and streamline medication management."
            addOnId="drug-interactions"
          />

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Drug Interactions</CardTitle>
              <CardDescription>
                Manage potential interactions between this medication and others
              </CardDescription>
            </CardHeader>
            <CardContent>
              {item.type === "medication" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Known Interactions</h3>
                    {hasUpdateAccess && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="opacity-60 cursor-not-allowed"
                        disabled
                        title="Enable after purchasing the add-on"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Interaction
                        <ShoppingBag className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {interactions && interactions.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Medication</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {interactions.map((interaction: any) => (
                            <TableRow key={interaction.id}>
                              <TableCell>
                                <Link
                                  href={`/admin/inventory/${interaction.medicationBId}`}
                                  className="text-blue-500 hover:underline"
                                >
                                  {interaction.medicationBName}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    interaction.severity === "severe"
                                      ? "destructive"
                                      : interaction.severity === "moderate"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {interaction.severity
                                    .charAt(0)
                                    .toUpperCase() +
                                    interaction.severity.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-md">
                                <p className="text-sm">
                                  {interaction.description}
                                </p>
                              </TableCell>
                              <TableCell>
                                {hasUpdateAccess && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedInteraction(interaction);
                                        setShowEditInteractionModal(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedInteraction(interaction);
                                        setShowDeleteInteractionModal(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {!hasUpdateAccess && (
                                  <span className="text-xs text-muted-foreground">
                                    No edit permission
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No interactions recorded for this medication.
                      <br />
                      {hasUpdateAccess && (
                        <Button
                          variant="outline"
                          className="mt-4 opacity-60 cursor-not-allowed"
                          disabled
                          title="Enable after purchasing the add-on"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Interaction
                          <ShoppingBag className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                      {!hasUpdateAccess && (
                        <div className="mt-4 text-xs text-muted-foreground">
                          No permission to add interactions
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Drug interactions are only available for medication type
                  inventory items.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item Details</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                editMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
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
                          <SelectItem value="medication">Medication</SelectItem>
                          <SelectItem value="supply">Supply</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="vaccine">Vaccine</SelectItem>
                          <SelectItem value="supplement">Supplement</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="mg, mL, units" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="deaSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DEA Schedule</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="schedule_i">Schedule I</SelectItem>
                        <SelectItem value="schedule_ii">Schedule II</SelectItem>
                        <SelectItem value="schedule_iii">
                          Schedule III
                        </SelectItem>
                        <SelectItem value="schedule_iv">Schedule IV</SelectItem>
                        <SelectItem value="schedule_v">Schedule V</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="requiresSpecialAuth"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Requires Special Authorization
                      </FormLabel>
                      <FormDescription>
                        This item requires special authorization before use
                      </FormDescription>
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Manually adjust inventory levels for {item?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...adjustStockForm}>
            <form
              onSubmit={adjustStockForm.handleSubmit((data) =>
                adjustStockMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={adjustStockForm.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="add">Add Stock</SelectItem>
                        <SelectItem value="remove">Remove Stock</SelectItem>
                        <SelectItem value="use">Mark as Used</SelectItem>
                        <SelectItem value="expired">Mark as Expired</SelectItem>
                        <SelectItem value="lost">
                          Mark as Lost/Damaged
                        </SelectItem>
                        <SelectItem value="adjustment">
                          Manual Adjustment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={adjustStockForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity ({item?.unit || "units"})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={adjustStockForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes about this adjustment..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={adjustStockMutation.isPending}>
                  {adjustStockMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Adjusting...
                    </>
                  ) : (
                    "Adjust Stock"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={restockFormOpen} onOpenChange={setRestockFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Restock Item</DialogTitle>
            <DialogDescription>
              Add new stock for {item?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...restockForm}>
            <form
              onSubmit={restockForm.handleSubmit((data: any) =>
                restockMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={restockForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity ({item?.unit || "units"})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={restockForm.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter supplier name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={restockForm.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per Unit ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={restockForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes about this restock..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRestockFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={restockMutation.isPending}>
                  {restockMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Restocking...
                    </>
                  ) : (
                    "Restock Item"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              inventory item "{item?.name}" and all its transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Item"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Drug Interaction Dialog */}
      <Dialog
        open={showAddInteractionModal}
        onOpenChange={setShowAddInteractionModal}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Drug Interaction</DialogTitle>
            <DialogDescription>
              Record a potential interaction between {item?.name} and another
              medication
            </DialogDescription>
          </DialogHeader>
          <Form {...addInteractionForm}>
            <form
              onSubmit={addInteractionForm.handleSubmit(handleAddInteraction)}
              className="space-y-4"
            >
              <FormField
                control={addInteractionForm.control}
                name="medicationBId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interacting Medication</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select medication" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {otherMedications.map((med: any) => (
                          <SelectItem key={med.id} value={med.id.toString()}>
                            {med.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addInteractionForm.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addInteractionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the interaction and its effects..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddInteractionModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addInteractionMutation.isPending}
                >
                  {addInteractionMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Adding...
                    </>
                  ) : (
                    "Add Interaction"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Drug Interaction Dialog */}
      <Dialog
        open={showEditInteractionModal}
        onOpenChange={setShowEditInteractionModal}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Drug Interaction</DialogTitle>
            <DialogDescription>
              Update the interaction details
            </DialogDescription>
          </DialogHeader>
          <Form {...editInteractionForm}>
            <form
              onSubmit={editInteractionForm.handleSubmit(handleEditInteraction)}
              className="space-y-4"
            >
              <FormField
                control={editInteractionForm.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editInteractionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the interaction and its effects..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditInteractionModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editInteractionMutation.isPending}
                >
                  {editInteractionMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Update Interaction"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Drug Interaction Dialog */}
      <AlertDialog
        open={showDeleteInteractionModal}
        onOpenChange={setShowDeleteInteractionModal}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drug Interaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this drug interaction? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInteraction}
              disabled={deleteInteractionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInteractionMutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Interaction"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper function for transaction type badges
function getTransactionTypeBadge(type: string) {
  switch (type) {
    case "add":
      return (
        <Badge
          variant="outline"
          className="border-green-500 text-green-500 flex items-center"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Badge>
      );
    case "use":
    case "remove":
      return (
        <Badge
          variant="outline"
          className="border-blue-500 text-blue-500 flex items-center"
        >
          <Package className="h-3 w-3 mr-1" />
          Used
        </Badge>
      );
    case "adjustment":
      return (
        <Badge
          variant="outline"
          className="border-purple-500 text-purple-500 flex items-center"
        >
          <ArrowUpDown className="h-3 w-3 mr-1" />
          Adjustment
        </Badge>
      );
    case "expired":
      return (
        <Badge
          variant="outline"
          className="border-amber-500 text-amber-500 flex items-center"
        >
          <Calendar className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    case "lost":
      return (
        <Badge
          variant="outline"
          className="border-red-500 text-red-500 flex items-center"
        >
          <Box className="h-3 w-3 mr-1" />
          Lost/Damaged
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="flex items-center">
          {type}
        </Badge>
      );
  }
}

export default InventoryItemDetailPage;
