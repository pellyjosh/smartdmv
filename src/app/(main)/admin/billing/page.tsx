"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePractice } from "@/hooks/use-practice";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  FileText,
  CreditCard,
  DollarSign,
  Eye,
  FilePenLine,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ServiceCodeEditDialog from "@/components/billing/ServiceCodeEditDialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface Invoice {
  id: number;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientId: number;
  petId: number;
  practiceId: number;
  status:
    | "draft"
    | "pending"
    | "paid"
    | "partially_paid"
    | "overdue"
    | "cancelled"
    | "refunded";
  subtotal: string;
  tax: string;
  total: string;
  amountPaid: string;
  clientName?: string;
  petName?: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
}

interface Payment {
  id: number;
  paymentNumber: string;
  amount: string;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  notes?: string;
  invoice?: {
    invoiceNumber: string;
    description: string;
    client?: {
      name: string;
    };
    pet?: {
      name: string;
    };
  };
}

interface TaxRate {
  id: number;
  name: string;
  rate: string;
  type: "percentage" | "fixed";
  isDefault: "yes" | "no";
  active: "yes" | "no";
  createdAt: string;
  updatedAt: string;
}

const InvoiceStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "paid":
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    case "partially_paid":
      return (
        <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>
      );
    case "overdue":
      return <Badge variant="destructive">Overdue</Badge>;
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-gray-100">
          Cancelled
        </Badge>
      );
    case "refunded":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700">
          Refunded
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const BillingPage = () => {
  const [activeTab, setActiveTab] = useState("invoices");
  const { practice } = usePractice();
  const practiceId = practice?.id;
  const router = useRouter();

  // Fetch invoices (admin-wide or practice specific)
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    isError: isErrorInvoices,
  } = useQuery<Invoice[]>({
    queryKey: ["/api/practices", practiceId, "invoices"],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await fetch(`/api/practices/${practiceId}/invoices`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!practiceId,
  });

  // Fetch clients for dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<
    Client[]
  >({
    queryKey: ["/api/practices", practiceId, "clients"],
    queryFn: async () => {
      if (!practiceId) return [] as Client[];
      const res = await fetch(`/api/practices/${practiceId}/clients`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: !!practiceId,
    staleTime: 60_000,
  });

  // Fetch service codes (future use on services tab)
  const { data: serviceCodes = [], isLoading: isLoadingServiceCodes } =
    useQuery<any[]>({
      queryKey: ["/api/practices", practiceId, "service-codes"],
      queryFn: async () => {
        if (!practiceId) return [] as any[];
        const res = await fetch(`/api/practices/${practiceId}/service-codes`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch service codes");
        return res.json();
      },
      enabled: !!practiceId,
      staleTime: 60_000,
    });

  // Fetch payments for payment history tab
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<
    Payment[]
  >({
    queryKey: ["/api/practices", practiceId, "payments"],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await fetch(`/api/practices/${practiceId}/payments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: !!practiceId,
  });

  // Fetch tax rates
  const {
    data: taxRates = [],
    isLoading: isLoadingTaxRates,
    refetch: refetchTaxRates,
  } = useQuery<TaxRate[]>({
    queryKey: ["/api/practices", practiceId, "tax-rates"],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await fetch(`/api/practices/${practiceId}/tax-rates`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tax rates");
      return res.json();
    },
    enabled: !!practiceId,
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Tax rate form state
  const [showTaxRateForm, setShowTaxRateForm] = useState(false);
  const [taxRateForm, setTaxRateForm] = useState({
    name: "",
    rate: "",
    type: "percentage" as "percentage" | "fixed",
    isDefault: false,
  });
  const [isCreatingTaxRate, setIsCreatingTaxRate] = useState(false);
  // Service code dialog state
  const [serviceCodeToEdit, setServiceCodeToEdit] = useState<any>(null);
  const [serviceCodeToDelete, setServiceCodeToDelete] = useState<any>(null);

  const handleDeleteServiceCode = async () => {
    if (!practiceId || !serviceCodeToDelete) return;
    try {
      const res = await fetch(
        `/api/practices/${practiceId}/service-codes/${serviceCodeToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (res.ok) {
        // refresh list
        // naive: reload the page data by navigating to same route (or could use queryClient.invalidateQueries if available)
        window.location.reload();
      } else {
        console.error("Failed to delete service code");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setServiceCodeToDelete(null);
    }
  };

  // Navigate helpers
  const handleNewInvoice = () => {
    // Navigate to the new invoice creation page within billing namespace
    router.push("/admin/billing/invoice/new");
  };

  const handleViewInvoice = (invoiceId: number) => {
    // Future: implement dedicated invoice view page; temporary route placeholder
    router.push(`/admin/billing/invoice/${invoiceId}`);
  };

  // Tax rate handlers
  const handleCreateTaxRate = async () => {
    if (!practiceId || !taxRateForm.name || !taxRateForm.rate) return;

    setIsCreatingTaxRate(true);
    try {
      const res = await fetch(`/api/practices/${practiceId}/tax-rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: taxRateForm.name,
          rate: parseFloat(taxRateForm.rate),
          type: taxRateForm.type,
          isDefault: taxRateForm.isDefault,
        }),
      });

      if (res.ok) {
        setShowTaxRateForm(false);
        setTaxRateForm({
          name: "",
          rate: "",
          type: "percentage",
          isDefault: false,
        });
        refetchTaxRates();
      }
    } catch (error) {
      console.error("Error creating tax rate:", error);
    } finally {
      setIsCreatingTaxRate(false);
    }
  };

  const handleSetDefaultTaxRate = async (taxRateId: number) => {
    if (!practiceId) return;

    try {
      const res = await fetch(
        `/api/practices/${practiceId}/tax-rates/${taxRateId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isDefault: true }),
        }
      );

      if (res.ok) {
        refetchTaxRates();
      }
    } catch (error) {
      console.error("Error setting default tax rate:", error);
    }
  };

  const handleDeleteTaxRate = async (taxRateId: number) => {
    if (!practiceId) return;

    try {
      const res = await fetch(
        `/api/practices/${practiceId}/tax-rates/${taxRateId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (res.ok) {
        refetchTaxRates();
      }
    } catch (error) {
      console.error("Error deleting tax rate:", error);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const searchMatch =
      !searchTerm ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.clientName &&
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.petName &&
        invoice.petName.toLowerCase().includes(searchTerm.toLowerCase()));
    const statusMatch =
      statusFilter === "all" ||
      invoice.status === (statusFilter as Invoice["status"]);
    const clientMatch =
      clientFilter === "all" || invoice.clientId.toString() === clientFilter;
    let dateMatch = true;
    if (dateFilter === "overdue") {
      const now = new Date();
      const dueDate = new Date(invoice.dueDate);
      dateMatch = dueDate < now && invoice.status !== "paid";
    } else if (dateFilter === "this-month") {
      const now = new Date();
      const invoiceDate = new Date(invoice.date);
      dateMatch =
        invoiceDate.getMonth() === now.getMonth() &&
        invoiceDate.getFullYear() === now.getFullYear();
    } else if (dateFilter === "last-month") {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      const invoiceDate = new Date(invoice.date);
      dateMatch =
        invoiceDate.getMonth() === lastMonth.getMonth() &&
        invoiceDate.getFullYear() === lastMonth.getFullYear();
    }
    return searchMatch && statusMatch && clientMatch && dateMatch;
  });

  const isLoading =
    isLoadingInvoices || isLoadingClients || isLoadingServiceCodes;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-9 w-32" />
        </div>
        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28" />
            ))}
          </div>
          {/* Filters Card */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Skeleton className="h-10 w-full sm:flex-1" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-[130px]" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Invoices Table Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, r) => (
                  <div key={r} className="grid grid-cols-7 gap-4 items-center">
                    {Array.from({ length: 7 }).map((__, c) => (
                      <Skeleton key={c} className="h-5 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-9 w-40" />
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (isErrorInvoices) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">Error loading billing data</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Billing & Invoicing
        </h1>
        <Button onClick={handleNewInvoice} className="gap-2">
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="taxes">Tax Rates</TabsTrigger>
          <TabsTrigger value="services">Service Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search invoices..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partially_paid">
                        Partially Paid
                      </SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem
                          key={client.id}
                          value={client.id.toString()}
                        >
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                Manage and review all invoices for{" "}
                {practiceId ? "your practice" : "all practices"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewInvoice(invoice.id)}
                      >
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {invoice.date
                            ? format(new Date(invoice.date), "MMM d, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell>{invoice.clientName || "N/A"}</TableCell>
                        <TableCell>{invoice.petName || "N/A"}</TableCell>
                        <TableCell>
                          ${parseFloat(invoice.total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Invoice"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(invoice.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-6 text-muted-foreground"
                      >
                        {invoices.length === 0
                          ? "No invoices found. Create your first invoice to get started."
                          : "No invoices match your filters."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredInvoices.length || 0} of {invoices.length || 0}{" "}
                invoices
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push("/reports/financial")}
                className="gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Financial Reports
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View all payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPayments ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Pet</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.paymentNumber}
                        </TableCell>
                        <TableCell>
                          {payment.invoice?.invoiceNumber || "N/A"}
                        </TableCell>
                        <TableCell>
                          {payment.invoice?.client?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {payment.invoice?.pet?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          ${parseFloat(payment.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {payment.paymentMethod
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </TableCell>
                        <TableCell>
                          {payment.paymentDate
                            ? format(
                                new Date(payment.paymentDate),
                                "MMM d, yyyy"
                              )
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              payment.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : ""
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payments found</p>
                  <p className="text-sm">
                    Payments will appear here once clients make payments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tax Rates</CardTitle>
                <CardDescription>
                  Configure general tax rate for all products and services
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowTaxRateForm(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Tax Rate
              </Button>
            </CardHeader>
            <CardContent>
              {showTaxRateForm && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Create New Tax Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Name
                        </label>
                        <Input
                          placeholder="e.g., General Sales Tax"
                          value={taxRateForm.name}
                          onChange={(e) =>
                            setTaxRateForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Rate
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="8.25"
                            value={taxRateForm.rate}
                            onChange={(e) =>
                              setTaxRateForm((prev) => ({
                                ...prev,
                                rate: e.target.value,
                              }))
                            }
                          />
                          <Select
                            value={taxRateForm.type}
                            onValueChange={(value: "percentage" | "fixed") =>
                              setTaxRateForm((prev) => ({
                                ...prev,
                                type: value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="fixed">$</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={taxRateForm.isDefault}
                        onChange={(e) =>
                          setTaxRateForm((prev) => ({
                            ...prev,
                            isDefault: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="isDefault" className="text-sm">
                        Set as default tax rate
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateTaxRate}
                        disabled={
                          isCreatingTaxRate ||
                          !taxRateForm.name ||
                          !taxRateForm.rate
                        }
                      >
                        {isCreatingTaxRate ? "Creating..." : "Create Tax Rate"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowTaxRateForm(false);
                          setTaxRateForm({
                            name: "",
                            rate: "",
                            type: "percentage",
                            isDefault: false,
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isLoadingTaxRates ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : taxRates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRates.map((taxRate) => (
                      <TableRow key={taxRate.id}>
                        <TableCell className="font-medium">
                          {taxRate.name}
                        </TableCell>
                        <TableCell>
                          {taxRate.rate}
                          {taxRate.type === "percentage" ? "%" : ""}
                        </TableCell>
                        <TableCell>
                          {taxRate.type === "percentage"
                            ? "Percentage"
                            : "Fixed Amount"}
                        </TableCell>
                        <TableCell>
                          {taxRate.isDefault === "yes" ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              Default
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleSetDefaultTaxRate(taxRate.id)
                              }
                            >
                              Set Default
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              taxRate.active === "yes" ? "default" : "secondary"
                            }
                          >
                            {taxRate.active === "yes" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTaxRate(taxRate.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tax rates configured</p>
                  <p className="text-sm">
                    Create a tax rate to apply to products and services
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Codes</CardTitle>
                <CardDescription>
                  Manage your practice's service codes and pricing
                </CardDescription>
              </div>
              <Button
                onClick={() => router.push("/admin/billing/service-code/new")}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Service Code
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search service codes..."
                    className="pl-8"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Default Price</TableHead>
                    <TableHead>Taxable</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceCodes.length > 0 ? (
                    serviceCodes.map((code: any) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-medium">
                          {code.code}
                        </TableCell>
                        <TableCell>{code.description}</TableCell>
                        <TableCell>{code.category}</TableCell>
                        <TableCell>
                          ${parseFloat(code.defaultPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>{code.taxable ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <FileText className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setServiceCodeToEdit(code)}
                                >
                                  <FilePenLine className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setServiceCodeToDelete(code)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No service codes found. Add your first service code to
                        get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Service Code Dialogs */}
      {serviceCodeToEdit && (
        <ServiceCodeEditDialog
          code={serviceCodeToEdit}
          open={!!serviceCodeToEdit}
          onOpenChange={(open: boolean) => !open && setServiceCodeToEdit(null)}
          practiceId={practiceId}
        />
      )}

      <AlertDialog
        open={!!serviceCodeToDelete}
        onOpenChange={(open) => !open && setServiceCodeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this service code?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteServiceCode}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingPage;
