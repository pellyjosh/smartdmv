"use client";
import React, { useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { usePractice } from "@/hooks/use-practice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  FileText,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  DollarSign,
  CircleDollarSign,
  BarChart3,
  Receipt,
} from "lucide-react";
import { ExpenseStatus, Expense } from "@/shared/expense-schema";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type TabName = "expenses" | "budgets" | "reports";

const createExpenseSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  amount: z
    .string()
    .min(1, "Amount required")
    .transform((val) => parseFloat(val)),
  date: z.date(),
  category: z.string().min(2, "Category is required"),
  subcategory: z.string().optional(),
  vendorName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  paymentMethod: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.string().optional(),
  recurrenceEndDate: z.date().optional().nullable(),
  taxDeductible: z.boolean().default(false),
  status: z.string().default(ExpenseStatus.DRAFT),
});
type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;

interface ExpenseFilters {
  search: string;
  category: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  minAmount: string;
  maxAmount: string;
  isRecurring: boolean | null;
  taxDeductible: boolean | null;
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { practice } = usePractice();
  const practiceId = practice?.id ? Number(practice.id) : undefined;
  const [activeTab, setActiveTab] = useState<TabName>("expenses");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showUpdateStatusDialog, setShowUpdateStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [filters, setFilters] = useState<ExpenseFilters>({
    search: "",
    category: "",
    status: "",
    startDate: null,
    endDate: null,
    minAmount: "",
    maxAmount: "",
    isRecurring: null,
    taxDeductible: null,
  });

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const time = String(now.getTime()).slice(-6); // Last 6 digits of timestamp
    return `EXP-${year}${month}${day}-${time}`;
  };

  // Derived base URL
  const base = practiceId ? `/api/practices/${practiceId}/expenses` : undefined;
  const budgetBase = practiceId
    ? `/api/practices/${practiceId}/budgets`
    : undefined;

  // Budgets state
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const budgetFormSchema = z.object({
    name: z.string().min(2),
    category: z.string().optional(),
    amountAllocated: z
      .string()
      .min(1)
      .transform((v) => parseFloat(v)),
    periodStart: z.date(),
    periodEnd: z.date(),
    notes: z.string().optional(),
  });
  type BudgetFormValues = z.infer<typeof budgetFormSchema>;
  const budgetForm = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: "",
      category: "",
      amountAllocated: 0 as any,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
      ),
      notes: "",
    },
  });

  const {
    data: budgetsList,
    refetch: refetchBudgets,
    isLoading: loadingBudgets,
  } = useQuery({
    queryKey: [budgetBase],
    enabled: !!budgetBase,
    queryFn: async () => {
      const res = await apiRequest("GET", budgetBase!);
      return res.json();
    },
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (data: BudgetFormValues) => {
      if (!budgetBase) throw new Error("No practice context");
      const res = await apiRequest("POST", budgetBase, {
        ...data,
        periodStart: data.periodStart.toISOString(),
        periodEnd: data.periodEnd.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Budget created" });
      setShowBudgetDialog(false);
      refetchBudgets();
    },
    onError: (e: any) =>
      toast({
        title: "Failed to create budget",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!budgetBase) throw new Error("No practice context");
      const res = await apiRequest("DELETE", `${budgetBase}?id=${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Budget deleted" });
      refetchBudgets();
    },
    onError: (e: any) =>
      toast({
        title: "Failed to delete budget",
        description: e.message,
        variant: "destructive",
      }),
  });

  // Reports state
  const [reportRange, setReportRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [groupBy, setGroupBy] = useState<"category" | "month">("category");
  const reportBase = practiceId
    ? `/api/practices/${practiceId}/expenses/reports/summary`
    : undefined;
  const {
    data: reportSummary,
    refetch: refetchReport,
    isLoading: loadingReport,
  } = useQuery({
    queryKey: [reportBase, groupBy, reportRange],
    enabled: !!reportBase,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("groupBy", groupBy);
      if (reportRange.start)
        params.append("start", reportRange.start.toISOString());
      if (reportRange.end) params.append("end", reportRange.end.toISOString());
      const res = await apiRequest("GET", `${reportBase}?${params}`);
      return res.json();
    },
  });

  const {
    data: expensesList,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [base, filters],
    enabled: !!base,
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters.category && filters.category !== "all_categories")
        queryParams.append("category", filters.category);
      if (filters.status && filters.status !== "all_statuses")
        queryParams.append("status", filters.status);
      if (filters.startDate)
        queryParams.append("startDate", filters.startDate.toISOString());
      if (filters.endDate)
        queryParams.append("endDate", filters.endDate.toISOString());
      if (filters.minAmount) queryParams.append("minAmount", filters.minAmount);
      if (filters.maxAmount) queryParams.append("maxAmount", filters.maxAmount);
      const url = `${base}${queryParams.toString() ? `?${queryParams}` : ""}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const { data: categories } = useQuery({
    queryKey: [base, "categories"],
    enabled: !!base,
    queryFn: async () => {
      const res = await apiRequest("GET", `${base}/categories`);
      return res.json();
    },
  });

  const { data: statuses } = useQuery({
    queryKey: [base, "statuses"],
    enabled: !!base,
    queryFn: async () => {
      const res = await apiRequest("GET", `${base}/statuses`);
      return res.json();
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (expense: CreateExpenseFormValues) => {
      if (!base) throw new Error("No practice context");
      const res = await apiRequest("POST", base, expense);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense created",
        description: "Your expense has been created successfully.",
      });
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: [base] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to create expense",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!base) throw new Error("No practice context");
      const res = await apiRequest("DELETE", `${base}/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [base] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to delete expense",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateExpenseStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      if (!base) throw new Error("No practice context");
      const res = await apiRequest("PATCH", `${base}/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense updated",
        description: "The expense status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [base] });
      setSelectedExpense(null);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to update expense",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      title: "",
      description: "",
      // amount is a number after zod transform; initialize to 0
      amount: 0,
      date: new Date(),
      category: "",
      subcategory: "",
      vendorName: "",
      invoiceNumber: generateInvoiceNumber(), // Auto-generate invoice number
      paymentMethod: "",
      isRecurring: false,
      recurrenceType: "none",
      recurrenceEndDate: null,
      taxDeductible: false,
      status: ExpenseStatus.DRAFT,
    },
  });

  function onSubmit(data: CreateExpenseFormValues) {
    createExpenseMutation.mutate(data);
  }

  const handleOpenCreateDialog = () => {
    form.reset({
      title: "",
      description: "",
      amount: 0,
      date: new Date(),
      category: "",
      subcategory: "",
      vendorName: "",
      invoiceNumber: generateInvoiceNumber(), // Generate new invoice number
      paymentMethod: "",
      isRecurring: false,
      recurrenceType: "none",
      recurrenceEndDate: null,
      taxDeductible: false,
      status: ExpenseStatus.DRAFT,
    });
    setShowCreateDialog(true);
  };

  const resetFilters = () =>
    setFilters({
      search: "",
      category: "",
      status: "",
      startDate: null,
      endDate: null,
      minAmount: "",
      maxAmount: "",
      isRecurring: null,
      taxDeductible: null,
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case ExpenseStatus.DRAFT:
        return "bg-yellow-100 text-yellow-800";
      case ExpenseStatus.PENDING:
        return "bg-blue-100 text-blue-800";
      case ExpenseStatus.APPROVED:
        return "bg-green-100 text-green-800";
      case ExpenseStatus.REJECTED:
        return "bg-red-100 text-red-800";
      case ExpenseStatus.PAID:
        return "bg-purple-100 text-purple-800";
      case ExpenseStatus.CANCELED:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const formatDate = (d: string | Date) =>
    d ? format(new Date(d), "MMM d, yyyy") : "-";
  const formatAmount = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amt);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-gray-500">
            Manage your practice expenses, budgets, and financial reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenCreateDialog} disabled={!practiceId}>
            <Plus className="mr-2 h-4 w-4" /> New Expense
          </Button>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabName)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="expenses">
            <Receipt className="mr-2 h-4 w-4" /> Expenses
          </TabsTrigger>
          <TabsTrigger value="budgets">
            <CircleDollarSign className="mr-2 h-4 w-4" /> Budgets
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="mr-2 h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expenses List</CardTitle>
              <CardDescription>
                View and manage all your practice expenses
              </CardDescription>
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search expenses..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />
                </div>
                <Select
                  value={filters.category}
                  onValueChange={(v) => setFilters({ ...filters, category: v })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_categories">
                      All Categories
                    </SelectItem>
                    {categories?.map((c: string) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() +
                          c.slice(1).toLowerCase().replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters({ ...filters, status: v })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    {statuses?.map((s: string) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={!practiceId}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expensesList?.length ? (
                        expensesList.map((exp: Expense) => (
                          <TableRow key={exp.id}>
                            <TableCell className="font-medium">
                              {exp.title}
                            </TableCell>
                            <TableCell>{formatDate(exp.date)}</TableCell>
                            <TableCell>
                              {exp.category.charAt(0).toUpperCase() +
                                exp.category
                                  .slice(1)
                                  .toLowerCase()
                                  .replace("_", " ")}
                            </TableCell>
                            <TableCell>
                              {formatAmount(Number(exp.amount))}
                            </TableCell>
                            <TableCell>
                              {(exp as any).vendorName || "-"}
                            </TableCell>
                            <TableCell>
                              {(exp as any).isRecurring ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {(exp as any).recurrenceType
                                    ?.charAt(0)
                                    .toUpperCase() +
                                    (exp as any).recurrenceType
                                      ?.slice(1)
                                      .toLowerCase() || "Recurring"}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">
                                  One-time
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getStatusColor(exp.status)}
                                variant="secondary"
                              >
                                {exp.status.charAt(0).toUpperCase() +
                                  exp.status.slice(1).toLowerCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedExpense(exp)}
                                  title="View details"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedExpense(exp);
                                    setNewStatus(exp.status);
                                    setShowUpdateStatusDialog(true);
                                  }}
                                  title="Update status"
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    deleteExpenseMutation.mutate(exp.id)
                                  }
                                  title="Delete expense"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10">
                            <div className="flex flex-col items-center space-y-2">
                              <DollarSign className="h-12 w-12 text-gray-300" />
                              <p className="text-gray-500 text-lg">
                                No expenses found
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setShowCreateDialog(true)}
                                disabled={!practiceId}
                              >
                                <Plus className="mr-2 h-4 w-4" /> Add your first
                                expense
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                {expensesList?.length ? (
                  <p className="text-sm text-gray-500">
                    Showing {expensesList.length} expenses
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="budgets">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Budgets</CardTitle>
                  <CardDescription>
                    Track allocated vs spent per category or overall.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowBudgetDialog(true)}
                  disabled={!practiceId}
                >
                  <Plus className="mr-2 h-4 w-4" /> New Budget
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBudgets ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : budgetsList?.length ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {budgetsList.map((b: any) => {
                    const utilizationPct = (b.utilization * 100).toFixed(1);
                    const over = b.remaining < 0;
                    return (
                      <div
                        key={b.id}
                        className="border rounded-md p-4 space-y-3 bg-white shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{b.name}</h4>
                            <p className="text-xs text-gray-500">
                              {format(new Date(b.periodStart), "MMM d")} -{" "}
                              {format(new Date(b.periodEnd), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBudgetMutation.mutate(b.id)}
                          >
                            ✕
                          </Button>
                        </div>
                        <div className="text-sm">
                          <p>
                            <span className="text-gray-500">Category:</span>{" "}
                            {b.category || "All"}
                          </p>
                          <p>
                            <span className="text-gray-500">Allocated:</span> $
                            {Number(b.amountAllocated).toFixed(2)}
                          </p>
                          <p>
                            <span className="text-gray-500">Spent:</span> $
                            {Number(b.spent).toFixed(2)}
                          </p>
                          <p>
                            <span className="text-gray-500">Remaining:</span>{" "}
                            <span
                              className={over ? "text-red-600 font-medium" : ""}
                            >
                              ${Number(b.remaining).toFixed(2)}
                            </span>
                          </p>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded overflow-hidden">
                          <div
                            className={`h-2 ${
                              over ? "bg-red-500" : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.abs(Number(utilizationPct))
                              )}%`,
                            }}
                          />
                        </div>
                        <p
                          className={`text-xs ${
                            over ? "text-red-600" : "text-gray-600"
                          }`}
                        >
                          {utilizationPct}% utilized
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center h-48 justify-center space-y-3">
                  <CircleDollarSign className="h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">No budgets yet.</p>
                  <Button onClick={() => setShowBudgetDialog(true)}>
                    Create your first budget
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports">
          <Card>
            <CardHeader className="space-y-4">
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Visual summaries of expenses by {groupBy}.
              </CardDescription>
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Group By
                  </label>
                  <Select
                    value={groupBy}
                    onValueChange={(v: any) => setGroupBy(v)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Start
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[140px] justify-start"
                      >
                        {reportRange.start
                          ? format(reportRange.start, "MMM d, yyyy")
                          : "Pick"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0">
                      <Calendar
                        mode="single"
                        selected={reportRange.start ?? undefined}
                        onSelect={(d) =>
                          setReportRange((r) => ({ ...r, start: d || null }))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">End</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[140px] justify-start"
                      >
                        {reportRange.end
                          ? format(reportRange.end, "MMM d, yyyy")
                          : "Pick"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0">
                      <Calendar
                        mode="single"
                        selected={reportRange.end ?? undefined}
                        onSelect={(d) =>
                          setReportRange((r) => ({ ...r, end: d || null }))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  variant="outline"
                  onClick={() => refetchReport()}
                  disabled={!practiceId}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReport ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : reportSummary?.length ? (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportSummary}
                          dataKey="total"
                          nameKey="label"
                          label
                        >
                          {reportSummary.map((_: any, idx: number) => (
                            <Cell
                              key={idx}
                              fill={
                                [
                                  "#6366F1",
                                  "#22C55E",
                                  "#F59E0B",
                                  "#EF4444",
                                  "#06B6D4",
                                  "#8B5CF6",
                                  "#10B981",
                                ][idx % 7]
                              }
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(v: any) => `$${Number(v).toFixed(2)}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportSummary}>
                        <XAxis dataKey="label" hide={groupBy === "month"} />
                        <YAxis tickFormatter={(v) => `$${v}`} />
                        <RechartsTooltip
                          content={({ active, payload }: any) =>
                            active && payload?.length ? (
                              <div className="bg-white border shadow px-3 py-2 text-xs">
                                {payload[0].payload.label}: $
                                {Number(payload[0].value).toFixed(2)}
                              </div>
                            ) : null
                          }
                        />
                        <Legend />
                        <Bar dataKey="total" name="Total" fill="#6366F1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center h-64 justify-center space-y-3 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">No data for selected range.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            form.reset();
          }
          setShowCreateDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
            <DialogDescription>
              Enter the details of your expense below. Click save when you're
              done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Title*</FormLabel>
                      <FormControl>
                        <Input placeholder="Expense title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2">
                            $
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-7"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((c: string) => (
                            <SelectItem key={c} value={c}>
                              {c.charAt(0).toUpperCase() +
                                c.slice(1).toLowerCase().replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Subcategory (optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Vendor or supplier name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Auto-generated"
                            readOnly
                            className="bg-muted"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              field.onChange(generateInvoiceNumber())
                            }
                            title="Regenerate invoice number"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statuses?.map((s: string) => (
                            <SelectItem key={s} value={s}>
                              {s.charAt(0).toUpperCase() +
                                s.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Additional details about this expense"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2">
                  <Separator className="my-4" />
                </div>
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Recurring Expense</FormLabel>
                        <FormDescription>
                          This expense occurs on a regular basis
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                {form.watch("isRecurring") && (
                  <FormField
                    control={form.control}
                    name="recurrenceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurrence Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="biannually">
                              Bi-annually
                            </SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="taxDeductible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Tax Deductible</FormLabel>
                        <FormDescription>
                          This expense is eligible for tax deduction
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setShowCreateDialog(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                >
                  {createExpenseMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Save Expense
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Budget Dialog */}
      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Budget</DialogTitle>
            <DialogDescription>
              Define a spending allocation for a date range.
            </DialogDescription>
          </DialogHeader>
          <Form {...budgetForm}>
            <form
              onSubmit={budgetForm.handleSubmit((d) =>
                createBudgetMutation.mutate(d)
              )}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={budgetForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Q1 Supplies" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Category (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Leave blank for all categories"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="amountAllocated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount*</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="periodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="periodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Optional notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowBudgetDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createBudgetMutation.isPending}>
                  {createBudgetMutation.isPending ? "Saving..." : "Save Budget"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {selectedExpense && (
        <Dialog
          open={!!selectedExpense}
          onOpenChange={(o) => !o && setSelectedExpense(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
              <DialogDescription>
                Detailed information about the expense.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{selectedExpense.title}</h3>
                  <p className="text-gray-500">
                    {formatDate(selectedExpense.date)}
                  </p>
                </div>
                <Badge className={getStatusColor(selectedExpense.status)}>
                  {selectedExpense.status.charAt(0).toUpperCase() +
                    selectedExpense.status.slice(1).toLowerCase()}
                </Badge>
              </div>
              <div className="bg-gray-50 p-4 rounded-md flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-2xl font-bold">
                    {formatAmount(Number(selectedExpense.amount))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">
                    {selectedExpense.category.charAt(0).toUpperCase() +
                      selectedExpense.category
                        .slice(1)
                        .toLowerCase()
                        .replace("_", " ")}
                  </p>
                  {selectedExpense.subcategory && (
                    <p className="text-sm text-gray-500">
                      {selectedExpense.subcategory}
                    </p>
                  )}
                </div>
              </div>
              {selectedExpense.description && (
                <div>
                  <h4 className="text-sm font-medium">Description</h4>
                  <p className="mt-1 text-gray-700">
                    {selectedExpense.description}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Vendor</h4>
                  <p className="mt-1 text-gray-700">
                    {(selectedExpense as any).vendorName || "Not specified"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Invoice Number</h4>
                  <p className="mt-1 text-gray-700">
                    {(selectedExpense as any).invoiceNumber || "Not specified"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Payment Frequency</h4>
                  <p className="mt-1 text-gray-700">
                    {(selectedExpense as any).isRecurring ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {(selectedExpense as any).recurrenceType
                          ?.charAt(0)
                          .toUpperCase() +
                          (selectedExpense as any).recurrenceType
                            ?.slice(1)
                            .toLowerCase() || "Recurring"}
                      </Badge>
                    ) : (
                      "One-time expense"
                    )}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Tax Deductible</h4>
                  <p className="mt-1 text-gray-700">
                    {(selectedExpense as any).taxDeductible ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedExpense(null)}
              >
                Close
              </Button>
              <Button
                onClick={() => deleteExpenseMutation.mutate(selectedExpense.id)}
                variant="destructive"
              >
                <XCircle className="mr-2 h-4 w-4" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Update Dialog */}
      <Dialog
        open={showUpdateStatusDialog}
        onOpenChange={setShowUpdateStatusDialog}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Expense Status</DialogTitle>
            <DialogDescription>
              Change the status of "{selectedExpense?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Status</label>
              <p className="mt-1">
                <Badge
                  className={getStatusColor(selectedExpense?.status || "")}
                >
                  {selectedExpense?.status
                    ? selectedExpense.status.charAt(0).toUpperCase() +
                      selectedExpense.status.slice(1).toLowerCase()
                    : "No status"}
                </Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses?.map((s: string) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateStatusDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedExpense && newStatus) {
                  updateExpenseStatusMutation.mutate({
                    id: selectedExpense.id,
                    status: newStatus,
                  });
                }
              }}
              disabled={
                !newStatus ||
                newStatus === selectedExpense?.status ||
                updateExpenseStatusMutation.isPending
              }
            >
              {updateExpenseStatusMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
