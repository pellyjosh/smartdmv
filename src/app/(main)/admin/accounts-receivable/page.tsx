"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePractice } from "@/hooks/use-practice";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DollarSign,
  Search,
  FileText,
  CreditCard,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Phone,
  Mail,
  Download,
  Filter,
  Clock,
  Users,
  Receipt,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format, differenceInDays, isAfter, subDays } from "date-fns";
import PageHeader from "@/components/page-header";
import { cn } from "@/lib/utils";

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
  clientEmail?: string;
  clientPhone?: string;
  description?: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

const AccountsReceivablePage = () => {
  const router = useRouter();
  const { practice } = usePractice();
  const practiceId = practice?.id;
  const { format: formatCurrency } = useCurrencyFormatter();

  // State for filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);

  // Fetch invoices
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: isErrorInvoices,
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

  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<
    Client[]
  >({
    queryKey: ["/api/practices", practiceId, "clients"],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await fetch(`/api/practices/${practiceId}/clients`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: !!practiceId,
  });

  // Calculate AR metrics
  const arMetrics = useMemo(() => {
    const outstandingInvoices = invoices.filter(
      (inv) =>
        inv.status === "pending" ||
        inv.status === "partially_paid" ||
        inv.status === "overdue"
    );

    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => {
      const remaining =
        parseFloat(inv.total) - parseFloat(inv.amountPaid || "0");
      return sum + remaining;
    }, 0);

    const overdueInvoices = outstandingInvoices.filter((inv) => {
      const dueDate = new Date(inv.dueDate);
      return isAfter(new Date(), dueDate);
    });

    const totalOverdue = overdueInvoices.reduce((sum, inv) => {
      const remaining =
        parseFloat(inv.total) - parseFloat(inv.amountPaid || "0");
      return sum + remaining;
    }, 0);

    // Calculate aging buckets
    const aging = {
      current: 0, // 0-30 days
      thirty: 0, // 31-60 days
      sixty: 0, // 61-90 days
      ninety: 0, // 90+ days
    };

    outstandingInvoices.forEach((inv) => {
      const daysPastDue = differenceInDays(new Date(), new Date(inv.dueDate));
      const remaining =
        parseFloat(inv.total) - parseFloat(inv.amountPaid || "0");

      if (daysPastDue <= 0) {
        aging.current += remaining;
      } else if (daysPastDue <= 30) {
        aging.current += remaining;
      } else if (daysPastDue <= 60) {
        aging.thirty += remaining;
      } else if (daysPastDue <= 90) {
        aging.sixty += remaining;
      } else {
        aging.ninety += remaining;
      }
    });

    // Calculate average days to pay (for paid invoices in last 30 days)
    const recentPaidInvoices = invoices.filter(
      (inv) =>
        inv.status === "paid" &&
        differenceInDays(new Date(), new Date(inv.date)) <= 30
    );

    const avgDaysToPay =
      recentPaidInvoices.length > 0
        ? recentPaidInvoices.reduce((sum, inv) => {
            const daysToPay = differenceInDays(
              new Date(inv.date),
              new Date(inv.date)
            ); // This would need payment date
            return sum + daysToPay;
          }, 0) / recentPaidInvoices.length
        : 0;

    return {
      totalOutstanding,
      totalOverdue,
      outstandingInvoicesCount: outstandingInvoices.length,
      overdueInvoicesCount: overdueInvoices.length,
      aging,
      avgDaysToPay: Math.round(avgDaysToPay),
    };
  }, [invoices]);

  // Filter and sort invoices for AR table
  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(
      (inv) =>
        inv.status === "pending" ||
        inv.status === "partially_paid" ||
        inv.status === "overdue"
    );

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inv.clientName &&
            inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.petName &&
            inv.petName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply client filter
    if (clientFilter !== "all") {
      filtered = filtered.filter(
        (inv) => inv.clientId.toString() === clientFilter
      );
    }

    // Apply aging filter
    if (ageFilter !== "all") {
      filtered = filtered.filter((inv) => {
        const daysPastDue = differenceInDays(new Date(), new Date(inv.dueDate));
        switch (ageFilter) {
          case "current":
            return daysPastDue <= 30;
          case "30-60":
            return daysPastDue > 30 && daysPastDue <= 60;
          case "60-90":
            return daysPastDue > 60 && daysPastDue <= 90;
          case "90+":
            return daysPastDue > 90;
          case "overdue":
            return daysPastDue > 0;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "dueDate":
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "amount":
          const aRemaining =
            parseFloat(a.total) - parseFloat(a.amountPaid || "0");
          const bRemaining =
            parseFloat(b.total) - parseFloat(b.amountPaid || "0");
          return bRemaining - aRemaining;
        case "client":
          return (a.clientName || "").localeCompare(b.clientName || "");
        case "invoice":
          return a.invoiceNumber.localeCompare(b.invoiceNumber);
        default:
          return 0;
      }
    });

    return filtered;
  }, [invoices, searchTerm, clientFilter, ageFilter, sortBy]);

  const getDaysOverdue = (dueDate: string) => {
    const days = differenceInDays(new Date(), new Date(dueDate));
    return Math.max(0, days);
  };

  const getAgingBadge = (dueDate: string) => {
    const days = getDaysOverdue(dueDate);
    if (days <= 0) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200">
          Current
        </Badge>
      );
    } else if (days <= 30) {
      return (
        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
          1-30 Days
        </Badge>
      );
    } else if (days <= 60) {
      return (
        <Badge className="bg-orange-50 text-orange-700 border-orange-200">
          31-60 Days
        </Badge>
      );
    } else if (days <= 90) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200">
          61-90 Days
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          90+ Days
        </Badge>
      );
    }
  };

  const handleViewInvoice = (invoiceId: number) => {
    router.push(`/admin/billing/invoice/${invoiceId}`);
  };

  const handleContactClient = (invoice: Invoice) => {
    // This would typically open an email client or show a contact dialog
    if (invoice.clientEmail) {
      window.location.href = `mailto:${invoice.clientEmail}?subject=Invoice ${invoice.invoiceNumber} Payment Reminder`;
    }
  };

  const handleExportAR = () => {
    // Generate CSV content
    const headers = [
      "Invoice Number",
      "Client Name",
      "Pet Name",
      "Issue Date",
      "Due Date",
      "Days Overdue",
      "Original Amount",
      "Amount Paid",
      "Balance Due",
      "Status",
      "Client Email",
      "Client Phone",
    ];

    const rows = filteredInvoices.map((invoice) => {
      const balanceDue =
        parseFloat(invoice.total) - parseFloat(invoice.amountPaid || "0");
      const daysOverdue = getDaysOverdue(invoice.dueDate);

      return [
        invoice.invoiceNumber,
        invoice.clientName || "N/A",
        invoice.petName || "N/A",
        format(new Date(invoice.date), "yyyy-MM-dd"),
        format(new Date(invoice.dueDate), "yyyy-MM-dd"),
        daysOverdue > 0 ? daysOverdue.toString() : "0",
        parseFloat(invoice.total).toFixed(2),
        parseFloat(invoice.amountPaid || "0").toFixed(2),
        balanceDue.toFixed(2),
        invoice.status,
        invoice.clientEmail || "",
        invoice.clientPhone || "",
      ];
    });

    // Add summary rows
    const totalOutstanding = filteredInvoices.reduce((sum, inv) => {
      const balance = parseFloat(inv.total) - parseFloat(inv.amountPaid || "0");
      return sum + balance;
    }, 0);

    rows.push([]);
    rows.push([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Total Balance Due:",
      totalOutstanding.toFixed(2),
    ]);
    rows.push([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Total Invoices:",
      filteredInvoices.length.toString(),
    ]);

    // Convert to CSV format
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escape commas and quotes in cell values
            const cellStr = String(cell);
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `accounts-receivable-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setAgeFilter("all");
    setClientFilter("all");
    setSortBy("dueDate");
  };

  const isLoading = isLoadingInvoices || isLoadingClients;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Accounts Receivable"
          description="Monitor outstanding invoices and payment collection"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isErrorInvoices) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">
          Error loading accounts receivable data
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Accounts Receivable"
        description="Monitor outstanding invoices and payment collection for your veterinary practice"
      />

      {/* Key Metrics Dashboard */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Total Outstanding */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center justify-between">
              Total Outstanding
              <DollarSign className="h-5 w-5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {formatCurrency(arMetrics.totalOutstanding)}
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {arMetrics.outstandingInvoicesCount} outstanding invoices
            </p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-xs text-blue-600 font-medium">
                Active receivables
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Amount */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-900 flex items-center justify-between">
              Overdue Amount
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">
              {formatCurrency(arMetrics.totalOverdue)}
            </div>
            <p className="text-sm text-red-700 mt-1">
              {arMetrics.overdueInvoicesCount} overdue invoices
            </p>
            <div className="flex items-center mt-2">
              <Clock className="h-4 w-4 text-red-600 mr-1" />
              <span className="text-xs text-red-600 font-medium">
                Needs attention
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Collection Performance */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center justify-between">
              Avg. Collection Time
              <TrendingDown className="h-5 w-5 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {arMetrics.avgDaysToPay} days
            </div>
            <p className="text-sm text-green-700 mt-1">Average payment time</p>
            <div className="flex items-center mt-2">
              <Calendar className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-xs text-green-600 font-medium">
                Last 30 days
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Analysis</CardTitle>
          <CardDescription>
            Breakdown of outstanding amounts by age
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(arMetrics.aging.current)}
              </div>
              <p className="text-sm text-green-700">Current (0-30 days)</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-900">
                {formatCurrency(arMetrics.aging.thirty)}
              </div>
              <p className="text-sm text-yellow-700">31-60 days</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(arMetrics.aging.sixty)}
              </div>
              <p className="text-sm text-orange-700">61-90 days</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(arMetrics.aging.ninety)}
              </div>
              <p className="text-sm text-red-700">90+ days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search invoices, clients, or pets..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={ageFilter} onValueChange={setAgeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Age" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="30-60">31-60 Days</SelectItem>
                    <SelectItem value="60-90">61-90 Days</SelectItem>
                    <SelectItem value="90+">90+ Days</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>

                <Popover
                  open={clientComboboxOpen}
                  onOpenChange={setClientComboboxOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientComboboxOpen}
                      className="w-[140px] justify-between"
                    >
                      {clientFilter === "all"
                        ? "All Clients"
                        : clients.find(
                            (client) => client.id.toString() === clientFilter
                          )?.name || "Select client..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Search clients..." />
                      <CommandList>
                        <CommandEmpty>No client found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setClientFilter("all");
                              setClientComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clientFilter === "all"
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            All Clients
                          </CommandItem>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={`${client.name} ${client.email || ""}`}
                              onSelect={() => {
                                setClientFilter(client.id.toString());
                                setClientComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  clientFilter === client.id.toString()
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {client.name}
                                </span>
                                {client.email && (
                                  <span className="text-xs text-muted-foreground">
                                    {client.email}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="client">Client Name</SelectItem>
                    <SelectItem value="invoice">Invoice #</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportAR}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              <Button
                onClick={() => router.push("/admin/billing/invoice/new")}
                className="gap-2"
              >
                <Receipt className="h-4 w-4" />
                New Invoice
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
          <CardDescription>
            Detailed view of all unpaid and partially paid invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Pet</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Original Amount</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Balance Due</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => {
                  const balanceDue =
                    parseFloat(invoice.total) -
                    parseFloat(invoice.amountPaid || "0");
                  const daysOverdue = getDaysOverdue(invoice.dueDate);

                  return (
                    <TableRow
                      key={invoice.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        daysOverdue > 90 && "bg-red-50/50",
                        daysOverdue > 60 &&
                          daysOverdue <= 90 &&
                          "bg-orange-50/50",
                        daysOverdue > 30 &&
                          daysOverdue <= 60 &&
                          "bg-yellow-50/50"
                      )}
                      onClick={() => handleViewInvoice(invoice.id)}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.clientName || "N/A"}</TableCell>
                      <TableCell>{invoice.petName || "N/A"}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {daysOverdue > 0 ? (
                          <span className="text-red-600 font-medium">
                            {daysOverdue} days
                          </span>
                        ) : (
                          <span className="text-green-600">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(parseFloat(invoice.total))}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(parseFloat(invoice.amountPaid || "0"))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(balanceDue)}
                      </TableCell>
                      <TableCell>{getAgingBadge(invoice.dueDate)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Invoice"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(invoice.id);
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {invoice.clientEmail && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Contact Client"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContactClient(invoice);
                              }}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {/* <Button
                            variant="ghost"
                            size="icon"
                            title="Record Payment"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/admin/billing/invoice/${invoice.id}`
                              );
                            }}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {filteredInvoices.length === 0 && searchTerm ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Search className="h-8 w-8 opacity-50" />
                        <p>No invoices match your search criteria</p>
                        <Button variant="outline" onClick={clearAllFilters}>
                          Clear Filters
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <DollarSign className="h-8 w-8 opacity-50" />
                        <p>No outstanding invoices found</p>
                        <p className="text-sm">All invoices have been paid!</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Footer */}
      {filteredInvoices.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-muted-foreground">
                  Showing {filteredInvoices.length} of{" "}
                  {arMetrics.outstandingInvoicesCount} outstanding invoices
                </span>
                <div className="h-4 border-l border-muted-foreground/20" />
                <span className="font-medium">
                  Total:{" "}
                  {formatCurrency(
                    filteredInvoices.reduce((sum, inv) => {
                      const balance =
                        parseFloat(inv.total) -
                        parseFloat(inv.amountPaid || "0");
                      return sum + balance;
                    }, 0)
                  )}
                </span>
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push("/admin/billing")}
                className="gap-2"
              >
                <Receipt className="h-4 w-4" />
                View All Billing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccountsReceivablePage;
