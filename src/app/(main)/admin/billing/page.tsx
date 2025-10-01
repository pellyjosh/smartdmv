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
import { Plus, Search, FileText, CreditCard, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "@/lib/date-utils";

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

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Navigate helpers
  const handleNewInvoice = () => {
    // Navigate to the new invoice creation page within billing namespace
    router.push("/admin/billing/invoice/new");
  };

  const handleViewInvoice = (invoiceId: number) => {
    // Future: implement dedicated invoice view page; temporary route placeholder
    router.push(`/admin/billing/invoice/${invoiceId}`);
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
                          {format(new Date(invoice.date), "MMM D, YYYY")}
                        </TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell>{invoice.petName}</TableCell>
                        <TableCell>
                          ${parseFloat(invoice.total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoice(invoice.id);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {invoice.status !== "paid" &&
                              invoice.status !== "cancelled" &&
                              invoice.status !== "refunded" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Process Payment"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/admin/billing/invoice/${invoice.id}`
                                    );
                                  }}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                          </div>
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
              <p className="text-center py-10 text-muted-foreground">
                This feature will be implemented soon. The API endpoints are
                ready!
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Rates</CardTitle>
              <CardDescription>
                Configure tax rates for different services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-10 text-muted-foreground">
                This feature will be implemented soon. The API endpoints are
                ready!
              </p>
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
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={() =>
                                router.push(`/admin/billing/invoice/${code.id}`)
                              }
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
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
    </div>
  );
};

export default BillingPage;
