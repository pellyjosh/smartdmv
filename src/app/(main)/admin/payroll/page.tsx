"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Users,
  DollarSign,
  Settings,
  Plus,
  CheckCircle,
  Clock,
  Calculator,
  X,
  Eye,
  FileDown,
  Download,
  Edit,
  Trash,
  MoreVertical,
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ArrowUpDown,
  TrendingUp,
  AlertCircle,
  Info,
  FileText,
  Printer,
  Banknote,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePractice } from "@/hooks/use-practice";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import formatAmountWithCurrency from "@/lib/format/currency";

// File-level safe formatter fallback. This will show a clear marker when no
// currency is configured instead of throwing. Components may override this by
// using the `useCurrencyFormatter` hook to get a practice-aware formatter.
const formatCurrency = (
  amount: number,
  currency?: { code?: string; decimals?: number } | null
) =>
  formatAmountWithCurrency(
    amount || 0,
    currency ? { code: currency.code, decimals: currency.decimals } : undefined
  );
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const useFormatCurrency = (practiceId?: number) => {
  // Wrap the shared currency hook so existing callers that call useFormatCurrency()
  // keep working while we centralize formatting logic.
  const { format } = useCurrencyFormatter();
  return format;
};

const formatDate = (dateString: string) =>
  dateString ? format(new Date(dateString), "MMM dd, yyyy") : "—";

// ...existing code...

// Schemas
const payRateSchema = z.object({
  userId: z.number({ required_error: "Select employee" }),
  rateType: z.enum(["hourly", "daily", "weekly", "monthly", "yearly"]),
  rate: z.string().min(1),
  effectiveDate: z.string().min(1),
  description: z.string().optional(),
});
const workHoursSchema = z.object({
  userId: z.number({ required_error: "Select employee" }),
  date: z.string().min(1),
  hoursWorked: z.string().min(1),
  payRateId: z.number().optional(),
  description: z.string().optional(),
  isApproved: z.boolean().default(false),
});
const payPeriodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  payDate: z.string().min(1),
  status: z.enum(["draft", "processing", "paid"]),
  description: z.string().optional(),
});

// New deduction schemas
const deductionTypeSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  category: z.enum(["tax", "benefit", "voluntary", "garnishment"]),
  description: z.string().optional(),
  calculationType: z.enum(["percentage", "fixed", "tiered"]),
  isEmployerContribution: z.boolean().default(false),
  displayOrder: z.number().default(0),
});

const employeeDeductionSchema = z.object({
  employeeId: z.number({ required_error: "Select employee" }),
  deductionTypeId: z.number({ required_error: "Select deduction type" }),
  amount: z.string().optional(),
  percentage: z.string().optional(),
  maxAmount: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export default function PayrollPage() {
  const { practice } = usePractice();
  const practiceId = practice?.id ? Number(practice.id) : undefined;
  const base = practiceId ? `/api/practices/${practiceId}/payroll` : undefined;
  const formatCurrency = useFormatCurrency(practiceId);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payroll Management</h1>
        <PayrollQuickActions practiceId={practiceId} base={base} />
      </div>

      {/* Summary Cards */}
      <PayrollSummaryCards practiceId={practiceId} base={base} />

      <Tabs defaultValue="payStubs" className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-8">
          <TabsTrigger value="payStubs">Pay Slips</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="workHours">Work Hours</TabsTrigger>
          <TabsTrigger value="payRates">Pay Rates</TabsTrigger>
          <TabsTrigger value="payPeriods">Pay Periods</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="payStubs">
          <PayStubsTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalsTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="deductions">
          <DeductionsTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="workHours">
          <WorkHoursTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="payRates">
          <PayRatesTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="payPeriods">
          <PayPeriodsTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentProcessorTab practiceId={practiceId} base={base} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PayRatesTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { format: formatCurrency } = useCurrencyFormatter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const form = useForm<z.infer<typeof payRateSchema>>({
    resolver: zodResolver(payRateSchema),
    defaultValues: {
      rateType: "hourly",
      effectiveDate: new Date().toISOString().split("T")[0],
    },
  });
  useEffect(() => {
    if (editing) {
      form.reset({
        userId: editing.userId,
        rateType: editing.rateType,
        rate: editing.rate,
        effectiveDate: editing.effectiveDate.split("T")[0],
        description: editing.description || "",
      });
    } else {
      form.reset({
        rateType: "hourly",
        rate: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        description: "",
      });
    }
  }, [editing]);
  const { data: rates, isLoading } = useQuery({
    queryKey: [base, "rates"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/rates`);
      return r.json();
    },
  });
  const { data: staff } = useQuery({
    queryKey: [practiceId, "staff"],
    enabled: !!practiceId,
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/users/staff`);
      return r.json();
    },
  });
  const create = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", `${base}/rates`, {
        ...d,
        rate: parseFloat(d.rate),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pay rate added" });
      qc.invalidateQueries({ queryKey: [base, "rates"] });
      setOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("PATCH", `${base}/rates/${editing.id}`, {
        ...d,
        rate: parseFloat(d.rate),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pay rate updated" });
      qc.invalidateQueries({ queryKey: [base, "rates"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `${base}/rates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pay rate deleted" });
      qc.invalidateQueries({ queryKey: [base, "rates"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const submit = (data: any) =>
    editing ? update.mutate(data) : create.mutate(data);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pay Rates</h2>
        <Button
          disabled={!base}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add Pay Rate
        </Button>
      </div>
      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {" "}
                  <Skeleton className="h-4 w-1/5" />{" "}
                  <Skeleton className="h-4 w-1/12" />{" "}
                  <Skeleton className="h-4 w-1/12" />{" "}
                  <Skeleton className="h-4 w-1/6" />{" "}
                  <Skeleton className="h-4 w-1/5" />{" "}
                  <Skeleton className="h-4 w-12 ml-auto" />{" "}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rates || []).length ? (
                  (rates || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.userName}</TableCell>
                      <TableCell className="capitalize">{r.rateType}</TableCell>
                      <TableCell>
                        {formatCurrency(parseFloat(r.rate))}
                        {r.rateType === "hourly"
                          ? "/hr"
                          : r.rateType === "daily"
                          ? "/day"
                          : r.rateType === "weekly"
                          ? "/wk"
                          : r.rateType === "monthly"
                          ? "/mo"
                          : r.rateType === "yearly"
                          ? "/yr"
                          : ""}
                      </TableCell>
                      <TableCell>{formatDate(r.effectiveDate)}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(r);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Delete pay rate?")) del.mutate(r.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No rates
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} Pay Rate</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(staff || []).map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.firstName} {s.lastName}
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
                name="rateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Type</FormLabel>
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
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rate{" "}
                      {form.watch("rateType") && `(${form.watch("rateType")})`}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={
                          form.watch("rateType") === "hourly"
                            ? "e.g., 25.00"
                            : form.watch("rateType") === "daily"
                            ? "e.g., 200.00"
                            : form.watch("rateType") === "weekly"
                            ? "e.g., 1000.00"
                            : form.watch("rateType") === "monthly"
                            ? "e.g., 4000.00"
                            : form.watch("rateType") === "yearly"
                            ? "e.g., 50000.00"
                            : "Enter rate amount"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editing ? "Update" : "Add"} Rate
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkHoursTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [range, setRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const form = useForm<z.infer<typeof workHoursSchema>>({
    resolver: zodResolver(workHoursSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      hoursWorked: "",
      isApproved: false,
    },
  });
  useEffect(() => {
    if (editing) {
      form.reset({
        userId: editing.userId,
        date: editing.date.split("T")[0],
        hoursWorked: editing.hoursWorked,
        payRateId: editing.payRateId,
        description: editing.description || "",
        isApproved: editing.isApproved,
      });
    } else {
      form.reset({
        date: new Date().toISOString().split("T")[0],
        hoursWorked: "",
        description: "",
        isApproved: false,
      });
    }
  }, [editing]);
  const { format: formatCurrency } = useCurrencyFormatter();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: [base, "work-hours", range.startDate, range.endDate],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest(
        "GET",
        `${base}/work-hours?startDate=${range.startDate}&endDate=${range.endDate}`
      );
      return r.json();
    },
  });
  const { data: staff } = useQuery({
    queryKey: [practiceId, "staff"],
    enabled: !!practiceId,
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/users/staff`);
      return r.json();
    },
  });
  const { data: rates } = useQuery({
    queryKey: [base, "rates"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/rates`);
      return r.json();
    },
  });
  const create = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", `${base}/work-hours`, {
        ...d,
        hoursWorked: parseFloat(d.hoursWorked),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Hours recorded" });
      qc.invalidateQueries({ queryKey: [base, "work-hours"] });
      setOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest(
        "PATCH",
        `${base}/work-hours/${editing.id}`,
        { ...d, hoursWorked: parseFloat(d.hoursWorked) }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Work hours updated" });
      qc.invalidateQueries({ queryKey: [base, "work-hours"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `${base}/work-hours/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Work hours deleted" });
      qc.invalidateQueries({ queryKey: [base, "work-hours"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Single work hours submission
  const submitForApproval = useMutation({
    mutationFn: async (workHoursId: number) => {
      const res = await apiRequest(
        "POST",
        `${base}/work-hours/submit-for-approval`,
        {
          workHoursIds: [workHoursId],
          reason: `Time approval request for work hours entry`,
          priority: "normal",
        }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Work hours submitted for approval" });
      qc.invalidateQueries({ queryKey: [base, "work-hours"] });
      qc.invalidateQueries({ queryKey: [base, "approval-instances"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Batch submission for selected work hours
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [batchSubmissionDialog, setBatchSubmissionDialog] = useState(false);
  const [batchReason, setBatchReason] = useState("");
  const [batchPriority, setBatchPriority] = useState("normal");

  const submitBatchForApproval = useMutation({
    mutationFn: async ({
      workHoursIds,
      reason,
      priority,
    }: {
      workHoursIds: number[];
      reason: string;
      priority: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `${base}/work-hours/submit-for-approval`,
        {
          workHoursIds,
          reason,
          priority,
        }
      );
      return res.json();
    },
    onSuccess: (data) => {
      const submitted =
        data.results?.filter((r: any) => r.status === "submitted").length || 0;
      toast({
        title: "Batch Submission Complete",
        description: `${submitted} work hours entries submitted for approval`,
      });
      qc.invalidateQueries({ queryKey: [base, "work-hours"] });
      qc.invalidateQueries({ queryKey: [base, "approval-instances"] });
      setBatchSubmissionDialog(false);
      setSelectedHours([]);
      setBatchReason("");
      setBatchPriority("normal");
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = (d: any) => (editing ? update.mutate(d) : create.mutate(d));
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Work Hours</h2>
        <Button
          disabled={!base}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Record Hours
        </Button>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>Filter work hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label className="mb-1 block">Start Date</Label>
              <Input
                type="date"
                value={range.startDate}
                onChange={(e) =>
                  setRange((r) => ({ ...r, startDate: e.target.value }))
                }
              />
            </div>
            <div className="flex-1">
              <Label className="mb-1 block">End Date</Label>
              <Input
                type="date"
                value={range.endDate}
                onChange={(e) =>
                  setRange((r) => ({ ...r, endDate: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions Bar */}
      {selectedHours.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {selectedHours.length} item(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setBatchSubmissionDialog(true)}
                  disabled={submitBatchForApproval.isPending}
                >
                  {submitBatchForApproval.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Selected for Approval"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedHours([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedHours.length ===
                          (rows || []).filter((h: any) => !h.isApproved)
                            .length &&
                        (rows || []).filter((h: any) => !h.isApproved).length >
                          0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHours(
                            (rows || [])
                              .filter((h: any) => !h.isApproved)
                              .map((h: any) => h.id)
                          );
                        } else {
                          setSelectedHours([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows || []).length ? (
                  (rows || []).map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedHours.includes(h.id)}
                          disabled={h.isApproved}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHours([...selectedHours, h.id]);
                            } else {
                              setSelectedHours(
                                selectedHours.filter((id) => id !== h.id)
                              );
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{h.userName}</TableCell>
                      <TableCell>{formatDate(h.date)}</TableCell>
                      <TableCell>{h.hoursWorked}</TableCell>
                      <TableCell>
                        {h.payRateName ? h.payRateName : "Default Rate"}
                      </TableCell>
                      <TableCell>{h.description}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            h.isApproved
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {h.isApproved ? "Approved" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {!h.isApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => submitForApproval.mutate(h.id)}
                              disabled={submitForApproval.isPending}
                            >
                              {submitForApproval.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Submit for Approval
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(h);
                              setOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Delete work hours?"))
                                del.mutate(h.id);
                            }}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No hours
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Record"} Work Hours</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(staff || []).map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.firstName} {s.lastName}
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hoursWorked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours Worked</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.25" {...field} />
                    </FormControl>
                    <FormDescription>e.g. 8.00, 7.50</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payRateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Rate (Optional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pay rate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {form.getValues("userId") ? (
                          (rates || []).filter(
                            (r: any) => r.userId === form.getValues("userId")
                          ).length > 0 ? (
                            (rates || [])
                              .filter(
                                (r: any) =>
                                  r.userId === form.getValues("userId")
                              )
                              .map((r: any) => (
                                <SelectItem key={r.id} value={r.id.toString()}>
                                  {formatCurrency(parseFloat(r.rate))}/
                                  {r.rateType === "hourly"
                                    ? "hr"
                                    : r.rateType === "daily"
                                    ? "day"
                                    : r.rateType === "weekly"
                                    ? "wk"
                                    : r.rateType === "monthly"
                                    ? "mo"
                                    : r.rateType === "yearly"
                                    ? "yr"
                                    : ""}{" "}
                                  - {r.description || "Standard"}
                                </SelectItem>
                              ))
                          ) : (
                            <div className="px-2 py-2 text-sm text-muted-foreground">
                              No pay rates found for selected employee
                            </div>
                          )
                        ) : (
                          <div className="px-2 py-2 text-sm text-muted-foreground">
                            Select an employee first
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      If not selected default pay rate assumed
                    </FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Regular shift" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isApproved"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Approved</FormLabel>
                      <FormDescription>
                        Mark as approved for payroll
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editing ? "Update" : "Record"} Hours
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Batch Submission Dialog */}
      <Dialog
        open={batchSubmissionDialog}
        onOpenChange={setBatchSubmissionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Work Hours for Approval</DialogTitle>
            <DialogDescription>
              Submit {selectedHours.length} work hours entries for approval
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="batchReason">Submission Reason</Label>
              <textarea
                id="batchReason"
                className="w-full p-2 border rounded-md"
                rows={3}
                value={batchReason}
                onChange={(e) => setBatchReason(e.target.value)}
                placeholder="Enter reason for submitting these work hours..."
              />
            </div>

            <div>
              <Label htmlFor="batchPriority">Priority Level</Label>
              <Select value={batchPriority} onValueChange={setBatchPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBatchSubmissionDialog(false);
                setBatchReason("");
                setBatchPriority("normal");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                submitBatchForApproval.isPending || selectedHours.length === 0
              }
              onClick={() => {
                submitBatchForApproval.mutate({
                  workHoursIds: selectedHours,
                  reason:
                    batchReason.trim() ||
                    `Batch approval request for ${selectedHours.length} work hours entries`,
                  priority: batchPriority,
                });
              }}
            >
              {submitBatchForApproval.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Submitting...
                </>
              ) : (
                `Submit ${selectedHours.length} Items`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayPeriodsTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { format: formatCurrency } = useCurrencyFormatter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const form = useForm<z.infer<typeof payPeriodSchema>>({
    resolver: zodResolver(payPeriodSchema),
    defaultValues: { status: "draft" },
  });
  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        startDate: editing.startDate.split("T")[0],
        endDate: editing.endDate.split("T")[0],
        payDate: editing.payDate.split("T")[0],
        status: editing.status,
        description: editing.description || "",
      });
    } else {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const pay = new Date(today.getFullYear(), today.getMonth() + 1, 5);
      form.reset({
        name: `Pay Period - ${format(first, "MMM yyyy")}`,
        startDate: first.toISOString().split("T")[0],
        endDate: last.toISOString().split("T")[0],
        payDate: pay.toISOString().split("T")[0],
        status: "draft",
        description: "",
      });
    }
  }, [editing]);
  const { data: periods, isLoading } = useQuery({
    queryKey: [base, "periods"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/periods`);
      return r.json();
    },
  });
  const create = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", `${base}/periods`, d);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pay period created" });
      qc.invalidateQueries({ queryKey: [base, "periods"] });
      setOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("PATCH", `${base}/periods/${editing.id}`, d);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pay period updated" });
      qc.invalidateQueries({ queryKey: [base, "periods"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `${base}/periods/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pay period deleted" });
      qc.invalidateQueries({ queryKey: [base, "periods"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const generate = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "POST",
        `${base}/periods/${id}/generate-stubs`
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pay slips generated" });
      qc.invalidateQueries({ queryKey: [base, "stubs"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const submit = (d: any) => (editing ? update.mutate(d) : create.mutate(d));
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pay Periods</h2>
        <Button
          disabled={!base}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Create Pay Period
        </Button>
      </div>
      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-14 ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(periods || []).length ? (
                  (periods || []).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{formatDate(p.startDate)}</TableCell>
                      <TableCell>{formatDate(p.endDate)}</TableCell>
                      <TableCell>{formatDate(p.payDate)}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            p.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : p.status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <GeneratePayslipsButton
                            period={p}
                            onGenerate={(periodId: number, options: any) => {
                              generate.mutate(periodId);
                            }}
                            disabled={p.status === "paid"}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(p);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={p.status !== "draft"}
                            onClick={() => {
                              if (confirm("Delete pay period?"))
                                del.mutate(p.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No periods
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Create"} Pay Period</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField
                control={form.control}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="payDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Date employees are paid</FormDescription>
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
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
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editing ? "Update" : "Create"} Pay Period
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayStubsTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { format: formatCurrency } = useCurrencyFormatter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [selectedPaystub, setSelectedPaystub] = useState<any>(null);
  const [paystubDetailDialog, setPaystubDetailDialog] = useState(false);
  const { data: periods } = useQuery({
    queryKey: [base, "periods"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/periods`);
      return r.json();
    },
  });
  const { data: stubs, isLoading } = useQuery({
    queryKey: [base, "stubs", selectedPeriod],
    enabled: !!base,
    queryFn: async () => {
      const url = selectedPeriod
        ? `${base}/stubs?payPeriodId=${selectedPeriod}`
        : `${base}/stubs`;
      const r = await apiRequest("GET", url);
      return r.json();
    },
  });

  // Auto-generation mutation for eligible periods
  const autoGenerate = useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiRequest(
        "POST",
        `${base}/periods/${periodId}/generate-stubs`
      );
      return res.json();
    },
    onSuccess: (data, periodId) => {
      toast({
        title: "Pay slips auto-generated",
        description: `Generated ${data.generated} pay slips for eligible employees`,
      });
      qc.invalidateQueries({ queryKey: [base, "stubs"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Check for eligible periods that could auto-generate
  const eligiblePeriods = (periods || []).filter(
    (p: any) => p.status === "draft" && new Date(p.endDate) <= new Date() // Period has ended
  );

  const summary = stubs?.reduce(
    (acc: any, s: any) => {
      acc.total += parseFloat(s.netPay);
      acc.count += 1;
      return acc;
    },
    { total: 0, count: 0 }
  );

  // Print function for payslips
  const handlePrintPaystub = (payslip: any) => {
    // Create a printable window
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pay Stub - ${payslip.userName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .section { margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PAY STUB</h1>
            <h2>${payslip.userName}</h2>
            <p>Pay Period: ${payslip.payPeriodName || "N/A"}</p>
          </div>
          
          <div class="section">
            <h3>Earnings</h3>
            <div class="row">
              <span>Gross Pay:</span>
              <span>${formatCurrency(parseFloat(payslip.grossPay))}</span>
            </div>
          </div>
          
          <div class="section">
            <h3>Deductions</h3>
            ${
              payslip.deductionsByCategory?.taxes
                ?.map(
                  (tax: any) =>
                    `<div class="row"><span>${
                      tax.description
                    }:</span><span>${formatCurrency(
                      parseFloat(tax.amount)
                    )}</span></div>`
                )
                .join("") || ""
            }
            ${
              payslip.deductionsByCategory?.benefits
                ?.map(
                  (benefit: any) =>
                    `<div class="row"><span>${
                      benefit.description
                    }:</span><span>${formatCurrency(
                      parseFloat(benefit.amount)
                    )}</span></div>`
                )
                .join("") || ""
            }
            <div class="row total">
              <span>Total Deductions:</span>
              <span>${formatCurrency(payslip.totalDeductions || 0)}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="row total">
              <span><strong>Net Pay:</strong></span>
              <span><strong>${formatCurrency(
                parseFloat(payslip.netPay)
              )}</strong></span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  // Regenerate payslip function
  const handleRegeneratePaystub = useMutation({
    mutationFn: async (payslipId: number) => {
      const res = await apiRequest(
        "POST",
        `${base}/stubs/${payslipId}/regenerate`
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payslip Regenerated",
        description: "The payslip has been recalculated with current data.",
      });
      qc.invalidateQueries({ queryKey: [base, "stubs"] });
    },
    onError: (e: any) => {
      toast({
        title: "Regeneration Failed",
        description: e.message || "Failed to regenerate payslip",
        variant: "destructive",
      });
    },
  });

  // Void payslip function with reason dialog
  const [voidingPayslip, setVoidingPayslip] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const handleVoidPaystub = useMutation({
    mutationFn: async ({
      payslipId,
      reason,
    }: {
      payslipId: number;
      reason: string;
    }) => {
      const res = await apiRequest("POST", `${base}/stubs/${payslipId}/void`, {
        reason: reason.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payslip Voided",
        description: "The payslip has been voided successfully.",
      });
      qc.invalidateQueries({ queryKey: [base, "stubs"] });
      setVoidingPayslip(null);
      setVoidReason("");
    },
    onError: (e: any) => {
      toast({
        title: "Void Failed",
        description: e.message || "Failed to void payslip",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pay Slips</h2>
      </div>

      {/* Auto-generation suggestion */}
      {eligiblePeriods.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-green-800">
                    Ready to generate pay slips!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    {eligiblePeriods.length} pay period(s) have ended and are
                    ready for pay slip generation.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  eligiblePeriods.forEach((period: any) => {
                    autoGenerate.mutate(period.id);
                  });
                }}
                disabled={autoGenerate.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {autoGenerate.isPending ? "Generating..." : "Auto-Generate All"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Help Card */}
      {(!stubs || stubs.length === 0) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  How to generate pay slips
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  1. Create pay rates for employees → 2. Add work hours → 3.
                  Create pay periods → 4. Go to "Pay Periods" tab and click
                  "Generate Pay Slips"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pay Slips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">{summary?.count || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Net Pay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">
                {formatCurrency(summary?.total || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Filter by Pay Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              onValueChange={(v) =>
                setSelectedPeriod(v === "all" ? null : parseInt(v))
              }
              value={selectedPeriod?.toString() || "all"}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Pay Periods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pay Periods</SelectItem>
                {(periods || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stubs || []).length ? (
                  (stubs || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.userName}
                      </TableCell>
                      <TableCell>{s.payPeriodName}</TableCell>
                      <TableCell>
                        {formatCurrency(parseFloat(s.grossPay))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <span className="font-medium">
                            {formatCurrency(s.totalDeductions || 0)}
                          </span>
                          {s.deductionsByCategory && (
                            <div className="text-xs text-muted-foreground">
                              {s.deductionsByCategory.taxes?.length > 0 && (
                                <span className="mr-2">
                                  Taxes: {s.deductionsByCategory.taxes.length}
                                </span>
                              )}
                              {s.deductionsByCategory.benefits?.length > 0 && (
                                <span className="mr-2">
                                  Benefits:{" "}
                                  {s.deductionsByCategory.benefits.length}
                                </span>
                              )}
                              {s.deductionsByCategory.voluntary?.length > 0 && (
                                <span>
                                  Voluntary:{" "}
                                  {s.deductionsByCategory.voluntary.length}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(parseFloat(s.netPay))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "paid"
                              ? "default"
                              : s.status === "processing"
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            s.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : s.status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPaystub(s);
                              setPaystubDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintPaystub(s)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                          {s.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600"
                                disabled={handleRegeneratePaystub.isPending}
                                onClick={() =>
                                  handleRegeneratePaystub.mutate(s.id)
                                }
                              >
                                {handleRegeneratePaystub.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4 mr-1" />
                                )}
                                {handleRegeneratePaystub.isPending
                                  ? "Regenerating..."
                                  : "Regenerate"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                disabled={handleVoidPaystub.isPending}
                                onClick={() => {
                                  setVoidingPayslip(s.id);
                                  setVoidReason("");
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Void
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <DollarSign className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">No pay slips found</p>
                        <p className="text-sm text-gray-400">
                          To generate pay slips: Create a pay period → Add work
                          hours → Go to Pay Periods tab → Click "Generate Pay
                          Slips"
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detailed Payslip Dialog */}
      <Dialog open={paystubDetailDialog} onOpenChange={setPaystubDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pay Stub Details - {selectedPaystub?.userName}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown for pay period:{" "}
              {selectedPaystub?.payPeriodName || "N/A"}
            </DialogDescription>
          </DialogHeader>

          {selectedPaystub && (
            <div className="space-y-6">
              {/* Employee Info Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Employee Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Employee Name
                      </Label>
                      <p className="text-lg font-semibold">
                        {selectedPaystub.userName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Pay Date
                      </Label>
                      <p>
                        {new Date(selectedPaystub.payDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Pay Period
                      </Label>
                      <p>{selectedPaystub.payPeriodName || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Status
                      </Label>
                      <Badge
                        variant={
                          selectedPaystub.status === "paid"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          selectedPaystub.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {selectedPaystub.status.charAt(0).toUpperCase() +
                          selectedPaystub.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Earnings Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">Gross Pay</span>
                      <span className="text-lg font-bold text-green-700">
                        {formatCurrency(parseFloat(selectedPaystub.grossPay))}
                      </span>
                    </div>

                    {/* Parse and display earnings breakdown from JSON if available */}
                    {selectedPaystub.deductionsBreakdown && (
                      <div className="text-sm text-muted-foreground">
                        <p>
                          Earnings calculation based on approved work hours and
                          pay rates
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Deductions Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-red-600" />
                    Deductions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Tax Deductions */}
                    {selectedPaystub.deductionsByCategory?.taxes &&
                      selectedPaystub.deductionsByCategory.taxes.length > 0 && (
                        <div>
                          <h4 className="font-medium text-red-700 mb-2">
                            Tax Deductions
                          </h4>
                          <div className="space-y-2">
                            {selectedPaystub.deductionsByCategory.taxes.map(
                              (tax: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center p-2 bg-red-50 rounded"
                                >
                                  <span className="text-sm">
                                    {tax.description}
                                  </span>
                                  <span className="font-medium text-red-700">
                                    -{formatCurrency(parseFloat(tax.amount))}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Benefits Deductions */}
                    {selectedPaystub.deductionsByCategory?.benefits &&
                      selectedPaystub.deductionsByCategory.benefits.length >
                        0 && (
                        <div>
                          <h4 className="font-medium text-blue-700 mb-2">
                            Benefits
                          </h4>
                          <div className="space-y-2">
                            {selectedPaystub.deductionsByCategory.benefits.map(
                              (benefit: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center p-2 bg-blue-50 rounded"
                                >
                                  <span className="text-sm">
                                    {benefit.description}
                                  </span>
                                  <span className="font-medium text-blue-700">
                                    -
                                    {formatCurrency(parseFloat(benefit.amount))}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Voluntary Deductions */}
                    {selectedPaystub.deductionsByCategory?.voluntary &&
                      selectedPaystub.deductionsByCategory.voluntary.length >
                        0 && (
                        <div>
                          <h4 className="font-medium text-purple-700 mb-2">
                            Voluntary Deductions
                          </h4>
                          <div className="space-y-2">
                            {selectedPaystub.deductionsByCategory.voluntary.map(
                              (voluntary: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center p-2 bg-purple-50 rounded"
                                >
                                  <span className="text-sm">
                                    {voluntary.description}
                                  </span>
                                  <span className="font-medium text-purple-700">
                                    -
                                    {formatCurrency(
                                      parseFloat(voluntary.amount)
                                    )}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Total Deductions */}
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                        <span className="font-medium">Total Deductions</span>
                        <span className="text-lg font-bold text-red-600">
                          -
                          {formatCurrency(selectedPaystub.totalDeductions || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Net Pay Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-green-600" />
                    Net Pay
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-green-100 rounded-lg border-2 border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Take-Home Pay</span>
                      <span className="text-2xl font-bold text-green-700">
                        {formatCurrency(parseFloat(selectedPaystub.netPay))}
                      </span>
                    </div>
                    <div className="text-sm text-green-600 mt-2">
                      Gross Pay (
                      {formatCurrency(parseFloat(selectedPaystub.grossPay))}) -
                      Deductions (
                      {formatCurrency(selectedPaystub.totalDeductions || 0)})
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePrintPaystub(selectedPaystub)}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Pay Stub
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Future: Download PDF functionality
                      toast({
                        title: "Feature Coming Soon",
                        description: "PDF download will be available soon.",
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>

                <Button
                  onClick={() => setPaystubDetailDialog(false)}
                  variant="default"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Payslip Dialog */}
      <Dialog
        open={voidingPayslip !== null}
        onOpenChange={() => setVoidingPayslip(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Payslip</DialogTitle>
            <DialogDescription>
              Please provide a reason for voiding this payslip. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="voidReason">Void Reason *</Label>
              <textarea
                id="voidReason"
                className="w-full p-2 border rounded-md"
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Enter the reason for voiding this payslip..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Minimum 5 characters required
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVoidingPayslip(null);
                setVoidReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                voidReason.trim().length < 5 || handleVoidPaystub.isPending
              }
              onClick={() => {
                if (voidingPayslip) {
                  handleVoidPaystub.mutate({
                    payslipId: voidingPayslip,
                    reason: voidReason.trim(),
                  });
                }
              }}
            >
              {handleVoidPaystub.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Voiding...
                </>
              ) : (
                "Void Payslip"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// New component: Payroll Summary Cards
function PayrollSummaryCards({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { data: summaryData, isLoading } = useQuery({
    queryKey: [base, "summary"],
    enabled: !!base,
    queryFn: async () => {
      const [stubsRes, periodsRes, hoursRes] = await Promise.all([
        apiRequest("GET", `${base}/stubs`),
        apiRequest("GET", `${base}/periods`),
        apiRequest("GET", `${base}/work-hours`),
      ]);
      const stubs = await stubsRes.json();
      const periods = await periodsRes.json();
      const hours = await hoursRes.json();

      return {
        totalPayroll: stubs.reduce(
          (sum: number, s: any) => sum + parseFloat(s.netPay || 0),
          0
        ),
        pendingApprovals: hours.filter((h: any) => !h.isApproved).length,
        activePeriods: periods.filter((p: any) => p.status === "draft").length,
        totalEmployees: new Set(stubs.map((s: any) => s.employeeId)).size,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const summary = summaryData || {
    totalPayroll: 0,
    pendingApprovals: 0,
    activePeriods: 0,
    totalEmployees: 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Payroll
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalPayroll || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pending Approvals
              </p>
              <p className="text-2xl font-bold">
                {summary.pendingApprovals || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Periods
              </p>
              <p className="text-2xl font-bold">{summary.activePeriods || 0}</p>
            </div>
            <Calculator className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Employees
              </p>
              <p className="text-2xl font-bold">
                {summary.totalEmployees || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// New component: Payroll Quick Actions
function PayrollQuickActions({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const initializeDefaults = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `${base}/deduction-types/initialize-defaults`
      );
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message });
      qc.invalidateQueries({ queryKey: [base, "deduction-types"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => initializeDefaults.mutate()}
        disabled={initializeDefaults.isPending}
      >
        {initializeDefaults.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        <Settings className="mr-2 h-4 w-4" />
        Initialize Defaults
      </Button>
    </div>
  );
}

// New component: Deductions Management Tab
function DeductionsTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const [activeSubTab, setActiveSubTab] = useState("types");

  return (
    <div className="space-y-4">
      <div className="flex space-x-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeSubTab === "types"
              ? "bg-white border-l border-t border-r border-gray-200 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveSubTab("types")}
        >
          Deduction Types
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeSubTab === "employee"
              ? "bg-white border-l border-t border-r border-gray-200 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveSubTab("employee")}
        >
          Employee Deductions
        </button>
      </div>

      {activeSubTab === "types" && (
        <DeductionTypesSubTab practiceId={practiceId} base={base} />
      )}
      {activeSubTab === "employee" && (
        <EmployeeDeductionsSubTab practiceId={practiceId} base={base} />
      )}
    </div>
  );
}

// New component: Reports Tab
function ReportsTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [generateDialog, setGenerateDialog] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0], // Start of year
    endDate: new Date().toISOString().split("T")[0], // Today
  });
  const [exportFormat, setExportFormat] = useState<string>("pdf");

  // Fetch existing reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: [base, "reports"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/reports`);
      return r.json();
    },
  });

  // Generate report mutation
  const generateReport = useMutation({
    mutationFn: async (reportData: any) => {
      const res = await apiRequest("POST", `${base}/reports`, reportData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: `${data.title} has been generated successfully`,
      });
      qc.invalidateQueries({ queryKey: [base, "reports"] });
      setGenerateDialog(false);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const downloadReport = async (report: any) => {
    try {
      // Create downloadable content based on report data
      const content = formatReportForDownload(report);
      const blob = new Blob([content], {
        type: report.exportFormat === "csv" ? "text/csv" : "application/json",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.${report.exportFormat || "json"}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Report download has begun",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const formatReportForDownload = (report: any) => {
    const data = JSON.parse(report.reportData || "{}");

    if (report.exportFormat === "csv") {
      return convertToCSV(data, report.reportType);
    }

    // Default to formatted JSON
    return JSON.stringify(data, null, 2);
  };

  const convertToCSV = (data: any, reportType: string) => {
    switch (reportType) {
      case "summary":
        return `Type,Amount\nGross Pay,$${
          data.summary?.totalGrossPay || 0
        }\nDeductions,$${data.summary?.totalDeductions || 0}\nNet Pay,$${
          data.summary?.totalNetPay || 0
        }\nTaxes,$${data.summary?.totalTaxes || 0}`;

      case "detailed":
        if (data.details) {
          const headers =
            "Employee ID,Period Start,Period End,Gross Amount,Net Amount,Status,Pay Date";
          const rows = data.details
            .map(
              (d: any) =>
                `${d.employeeId},${d.periodStart},${d.periodEnd},${d.grossAmount},${d.netAmount},${d.status},${d.payDate}`
            )
            .join("\n");
          return `${headers}\n${rows}`;
        }
        break;

      case "deductions":
        if (data.details) {
          const headers = "Deduction Name,Category,Total Amount,Count";
          const rows = data.details
            .map(
              (d: any) =>
                `${d.deductionName},${d.category},${d.totalAmount},${d.count}`
            )
            .join("\n");
          return `${headers}\n${rows}`;
        }
        break;
    }

    return JSON.stringify(data, null, 2);
  };

  const handleGenerateReport = () => {
    if (!selectedReportType) {
      toast({
        title: "Error",
        description: "Please select a report type",
        variant: "destructive",
      });
      return;
    }

    const reportData = {
      reportType: selectedReportType,
      title: getReportTitle(selectedReportType),
      description: getReportDescription(selectedReportType),
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period: "monthly",
      },
      exportFormat,
      filters: {
        includeDeductions: true,
        includeTaxes: true,
      },
    };

    generateReport.mutate(reportData);
  };

  const getReportTitle = (type: string) => {
    const titles = {
      summary: "Payroll Summary Report",
      detailed: "Detailed Payroll Report",
      tax: "Tax Report",
      deductions: "Employee Deductions Report",
      analytics: "Payroll Analytics Report",
    };
    return titles[type as keyof typeof titles] || "Payroll Report";
  };

  const getReportDescription = (type: string) => {
    const descriptions = {
      summary: "Comprehensive payroll summary by pay period",
      detailed: "Detailed breakdown of all payroll entries",
      tax: "Tax withholdings and employer contributions",
      deductions: "Detailed breakdown of all employee deductions",
      analytics: "Payroll trends and analytics",
    };
    return (
      descriptions[type as keyof typeof descriptions] ||
      "Generated payroll report"
    );
  };

  const reportCards = [
    {
      type: "summary",
      title: "Payroll Summary Report",
      description: "Comprehensive payroll summary by pay period",
      icon: "📊",
    },
    {
      type: "detailed",
      title: "Detailed Payroll Report",
      description: "Complete breakdown of all payroll entries",
      icon: "📋",
    },
    {
      type: "tax",
      title: "Tax Report",
      description: "Tax withholdings and employer contributions",
      icon: "🧾",
    },
    {
      type: "deductions",
      title: "Employee Deductions Report",
      description: "Detailed breakdown of all employee deductions",
      icon: "💰",
    },
    {
      type: "analytics",
      title: "Payroll Analytics",
      description: "Trends, costs, and performance metrics",
      icon: "📈",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payroll Reports</h2>
          <p className="text-muted-foreground">
            Generate and download payroll reports
          </p>
        </div>
        <Button onClick={() => setGenerateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Quick Report Generation */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {reportCards.map((card) => (
          <Card
            key={card.type}
            className="cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">{card.icon}</div>
              <h3 className="font-semibold text-sm mb-2">{card.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {card.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelectedReportType(card.type);
                  setGenerateDialog(true);
                }}
              >
                Generate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            View and download previously generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reports || []).length ? (
                  (reports || []).map((report: any) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {report.reportType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.dateRange
                          ? (() => {
                              const range = JSON.parse(report.dateRange);
                              return `${new Date(
                                range.startDate
                              ).toLocaleDateString()} - ${new Date(
                                range.endDate
                              ).toLocaleDateString()}`;
                            })()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            report.status === "completed"
                              ? "default"
                              : report.status === "generating"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {report.status === "completed" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadReport(report)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Preview report data in a modal
                                  const data = JSON.parse(
                                    report.reportData || "{}"
                                  );
                                  toast({
                                    title: "Report Preview",
                                    description: `${
                                      Object.keys(data).length
                                    } data sections available`,
                                  });
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">
                          No reports generated yet
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setGenerateDialog(true)}
                        >
                          Generate Your First Report
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Report Dialog */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Payroll Report</DialogTitle>
            <DialogDescription>
              Configure your report parameters and download options
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                value={selectedReportType}
                onValueChange={setSelectedReportType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                  <SelectItem value="tax">Tax Report</SelectItem>
                  <SelectItem value="deductions">Deductions Report</SelectItem>
                  <SelectItem value="analytics">Analytics Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="exportFormat">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={generateReport.isPending}
            >
              {generateReport.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// New component: Deduction Types Sub Tab
function DeductionTypesSubTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const form = useForm<z.infer<typeof deductionTypeSchema>>({
    resolver: zodResolver(deductionTypeSchema),
    defaultValues: {
      category: "benefit",
      calculationType: "fixed",
      isEmployerContribution: false,
      displayOrder: 0,
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        code: editing.code,
        category: editing.category,
        description: editing.description || "",
        calculationType: editing.calculationType,
        isEmployerContribution: editing.isEmployerContribution,
        displayOrder: editing.displayOrder,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        category: "benefit",
        description: "",
        calculationType: "fixed",
        isEmployerContribution: false,
        displayOrder: 0,
      });
    }
  }, [editing, form]);

  const { data: deductionTypes, isLoading } = useQuery({
    queryKey: [base, "deduction-types"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/deduction-types`);
      return r.json();
    },
  });

  const create = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", `${base}/deduction-types`, d);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deduction type created" });
      qc.invalidateQueries({ queryKey: [base, "deduction-types"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest(
        "PATCH",
        `${base}/deduction-types/${editing.id}`,
        d
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deduction type updated" });
      qc.invalidateQueries({ queryKey: [base, "deduction-types"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const initializeDefaults = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `${base}/deduction-types/initialize-defaults`
      );
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Initialized ${data.count || "default"} deduction types`,
      });
      qc.invalidateQueries({ queryKey: [base, "deduction-types"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (values: z.infer<typeof deductionTypeSchema>) => {
    if (editing) {
      update.mutate(values);
    } else {
      create.mutate(values);
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      tax: "bg-red-100 text-red-800",
      benefit: "bg-blue-100 text-blue-800",
      voluntary: "bg-green-100 text-green-800",
      garnishment: "bg-yellow-100 text-yellow-800",
    };
    return (
      colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Deduction Types</h3>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => initializeDefaults.mutate()}
                  disabled={initializeDefaults.isPending}
                >
                  {initializeDefaults.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      Setup Defaults
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Initialize standard deduction types (taxes, benefits, etc.)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Deduction Type
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Employer Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(deductionTypes || []).length ? (
                  (deductionTypes || []).map((dt: any) => (
                    <TableRow key={dt.id}>
                      <TableCell className="font-medium">{dt.name}</TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {dt.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadge(dt.category)}>
                          {dt.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {dt.calculationType}
                      </TableCell>
                      <TableCell>
                        {dt.isEmployerContribution ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dt.isActive ? "default" : "secondary"}>
                          {dt.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(dt);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Settings className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">
                          No deduction types found
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditing(null);
                            setOpen(true);
                          }}
                        >
                          Add First Deduction Type
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Deduction Type" : "Add Deduction Type"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the deduction type details."
                : "Create a new deduction type for payroll processing."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Health Insurance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., HEALTH"
                        className="uppercase"
                      />
                    </FormControl>
                    <FormDescription>
                      Short code for this deduction (will be uppercase)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
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
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tax">Tax</SelectItem>
                          <SelectItem value="benefit">Benefit</SelectItem>
                          <SelectItem value="voluntary">Voluntary</SelectItem>
                          <SelectItem value="garnishment">
                            Garnishment
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calculationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calculation Type</FormLabel>
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
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="tiered">Tiered</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isEmployerContribution"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Employer Contribution</FormLabel>
                        <FormDescription>
                          Check if this is paid by employer
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// New component: Employee Deductions Sub Tab
function EmployeeDeductionsSubTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const form = useForm<z.infer<typeof employeeDeductionSchema>>({
    resolver: zodResolver(employeeDeductionSchema),
    defaultValues: {
      startDate: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        employeeId: editing.employeeId,
        deductionTypeId: editing.deductionTypeId,
        amount: editing.amount ? parseFloat(editing.amount) : undefined,
        percentage: editing.percentage
          ? parseFloat(editing.percentage)
          : undefined,
        maxAmount: editing.maxAmount
          ? parseFloat(editing.maxAmount)
          : undefined,
        startDate: editing.startDate.split("T")[0],
        endDate: editing.endDate ? editing.endDate.split("T")[0] : undefined,
        notes: editing.notes || "",
      });
    } else {
      form.reset({
        startDate: new Date().toISOString().split("T")[0],
      });
    }
  }, [editing, form]);

  const { data: employeeDeductions, isLoading } = useQuery({
    queryKey: [base, "employee-deductions"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/employee-deductions`);
      return r.json();
    },
  });

  const { data: staff } = useQuery({
    queryKey: [practiceId, "staff"],
    enabled: !!practiceId,
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/users/staff`);
      return r.json();
    },
  });

  const { data: deductionTypes } = useQuery({
    queryKey: [base, "deduction-types"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/deduction-types`);
      return r.json();
    },
  });

  const create = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", `${base}/employee-deductions`, d);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Employee deduction added" });
      qc.invalidateQueries({ queryKey: [base, "employee-deductions"] });
      setOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest(
        "PATCH",
        `${base}/employee-deductions/${editing.id}`,
        d
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Employee deduction updated" });
      qc.invalidateQueries({ queryKey: [base, "employee-deductions"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "DELETE",
        `${base}/employee-deductions/${id}`
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Employee deduction removed" });
      qc.invalidateQueries({ queryKey: [base, "employee-deductions"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = (d: any) => (editing ? update.mutate(d) : create.mutate(d));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Employee Deductions</h3>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Assign Deduction
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Deduction</TableHead>
                  <TableHead>Amount/Percentage</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(employeeDeductions || []).length ? (
                  (employeeDeductions || []).map((ed: any) => (
                    <TableRow key={ed.id}>
                      <TableCell className="font-medium">
                        {ed.employeeName}
                      </TableCell>
                      <TableCell>{ed.deductionName}</TableCell>
                      <TableCell>
                        {ed.amount && formatCurrency(parseFloat(ed.amount))}
                        {ed.percentage && `${ed.percentage}%`}
                        {!ed.amount && !ed.percentage && "—"}
                      </TableCell>
                      <TableCell>{formatDate(ed.startDate)}</TableCell>
                      <TableCell>
                        <Badge variant={ed.isActive ? "default" : "secondary"}>
                          {ed.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(ed);
                              setOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteConfirm(ed)}
                            disabled={del.isPending}
                          >
                            {del.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4 mr-1" />
                            )}
                            {del.isPending ? "Removing..." : "Remove"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Users className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">
                          No employee deductions found
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditing(null);
                            setOpen(true);
                          }}
                        >
                          Assign First Deduction
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Edit Employee Deduction"
                : "Assign Employee Deduction"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the deduction parameters for this employee."
                : "Assign a deduction type to an employee with specific parameters."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(staff || []).map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.firstName} {s.lastName}
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
                name="deductionTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deduction Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select deduction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(deductionTypes || []).map((dt: any) => (
                          <SelectItem key={dt.id} value={dt.id.toString()}>
                            {dt.name} ({dt.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fixed Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editing ? "Update Deduction" : "Assign Deduction"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Employee Deduction</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the deduction "
              {deleteConfirm?.deductionName}" for {deleteConfirm?.employeeName}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    This action will deactivate the deduction
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      The deduction will be marked as inactive and will not
                      apply to future payroll calculations. This action can be
                      reversed by editing the deduction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => {
                if (deleteConfirm) {
                  del.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
            >
              {del.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Deduction"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// New component: Approvals Tab
function ApprovalsTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(
    null
  );
  const [actionDialog, setActionDialog] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");

  const { data: approvalInstances, isLoading } = useQuery({
    queryKey: [base, "approval-instances", selectedStatus],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest(
        "GET",
        `${base}/approval-instances?status=${selectedStatus}`
      );
      return r.json();
    },
  });

  const { data: workflows } = useQuery({
    queryKey: [base, "approval-workflows"],
    enabled: !!base,
    queryFn: async () => {
      const r = await apiRequest("GET", `${base}/approval-workflows`);
      return r.json();
    },
  });

  const processApproval = useMutation({
    mutationFn: async ({
      instanceId,
      action,
      comments,
    }: {
      instanceId: number;
      action: string;
      comments: string;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `${base}/approval-instances/${instanceId}`,
        {
          action,
          comments,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Approval processed successfully" });
      qc.invalidateQueries({ queryKey: [base, "approval-instances"] });
      setActionDialog(false);
      setSelectedInstanceId(null);
      setComments("");
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const initializeWorkflows = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `${base}/approval-workflows/initialize-defaults`
      );
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Initialized ${
          data.count || "default"
        } approval workflows`,
      });
      qc.invalidateQueries({ queryKey: [base, "approval-workflows"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleAction = (
    instanceId: number,
    actionType: "approve" | "reject"
  ) => {
    setSelectedInstanceId(instanceId);
    setAction(actionType);
    setActionDialog(true);
  };

  const submitAction = () => {
    if (selectedInstanceId && action) {
      processApproval.mutate({
        instanceId: selectedInstanceId,
        action,
        comments,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: "bg-blue-100 text-blue-600",
      normal: "bg-gray-100 text-gray-600",
      high: "bg-orange-100 text-orange-600",
      urgent: "bg-red-100 text-red-600",
    };
    return (
      colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-600"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Approval Management</h2>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => initializeWorkflows.mutate()}
                  disabled={initializeWorkflows.isPending}
                >
                  {initializeWorkflows.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      Setup Workflows
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Initialize default approval workflows for time, payroll, and
                  rates
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Approval Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Label>Filter by Status:</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-muted-foreground">
              {workflows?.length || 0} workflows configured
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Instances List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/5" />
                  <Skeleton className="h-4 w-1/5" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request Type</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(approvalInstances || []).length ? (
                  (approvalInstances || []).map((instance: any) => (
                    <TableRow key={instance.id}>
                      <TableCell className="font-medium">
                        {instance.workflowName}
                      </TableCell>
                      <TableCell>{instance.requestedByName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {instance.entityType
                              .replace("_", " ")
                              .toUpperCase()}
                          </div>
                          {instance.entityDetails && (
                            <div className="text-xs text-muted-foreground">
                              {instance.entityType === "work_hours" &&
                                `${
                                  instance.entityDetails.hoursWorked
                                }h on ${formatDate(
                                  instance.entityDetails.date
                                )}`}
                              {instance.entityType === "payroll" &&
                                `${formatCurrency(
                                  parseFloat(
                                    instance.entityDetails.grossAmount || "0"
                                  )
                                )}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadge(instance.priority)}>
                          {instance.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(instance.status)}>
                          {instance.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(instance.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {instance.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() =>
                                handleAction(instance.id, "approve")
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() =>
                                handleAction(instance.id, "reject")
                              }
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No approval requests found for "{selectedStatus}" status
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? "Are you sure you want to approve this request?"
                : "Please provide a reason for rejecting this request."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">
                Comments {action === "reject" && "(Required)"}
              </Label>
              <Input
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  action === "approve"
                    ? "Optional comments..."
                    : "Reason for rejection..."
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={
                processApproval.isPending ||
                (action === "reject" && !comments.trim())
              }
              variant={action === "approve" ? "default" : "destructive"}
            >
              {processApproval.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Payment Processor Tab Component
function PaymentProcessorTab({
  practiceId,
  base,
}: {
  practiceId?: number;
  base?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedStubs, setSelectedStubs] = useState<number[]>([]);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [batchPaymentDialog, setBatchPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Fetch pending payroll stubs
  const { data: payrollStubs = [], isLoading: stubsLoading } = useQuery({
    queryKey: [base, "stubs", "pending"],
    enabled: !!base,
    queryFn: async () => {
      const response = await apiRequest("GET", `${base}/stubs`);
      const data = await response.json();
      return data.filter((stub: any) => stub.status === "pending");
    },
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: [base, "bank-accounts"],
    enabled: !!base,
    queryFn: async () => {
      const response = await apiRequest("GET", `${base}/bank-accounts`);
      return response.json();
    },
  });

  if (stubsLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Processing</CardTitle>
          <CardDescription>
            Process payroll payments for employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {payrollStubs.length}
                  </div>
                  <div className="text-sm text-gray-600">Pending Payments</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      payrollStubs.reduce(
                        (sum: number, stub: any) =>
                          sum + parseFloat(stub.netPay || "0"),
                        0
                      )
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Total Amount</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {bankAccounts.length}
                  </div>
                  <div className="text-sm text-gray-600">Bank Accounts</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => setBatchPaymentDialog(true)}
              disabled={selectedStubs.length === 0}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Process Batch Payment ({selectedStubs.length})
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedStubs.length === payrollStubs.length &&
                      payrollStubs.length > 0
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStubs(
                          payrollStubs.map((stub: any) => stub.id)
                        );
                      } else {
                        setSelectedStubs([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollStubs.length > 0 ? (
                payrollStubs.map((stub: any) => (
                  <TableRow key={stub.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStubs.includes(stub.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStubs([...selectedStubs, stub.id]);
                          } else {
                            setSelectedStubs(
                              selectedStubs.filter((id) => id !== stub.id)
                            );
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {stub.employeeName || stub.userName}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(parseFloat(stub.netPay))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          stub.status === "paid" ? "default" : "secondary"
                        }
                        className={
                          stub.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {stub.status.charAt(0).toUpperCase() +
                          stub.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Individual payment processing would go here
                          toast({
                            title: "Feature Coming Soon",
                            description:
                              "Individual payment processing will be available soon.",
                          });
                        }}
                      >
                        Process Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <p className="text-gray-500">
                        No pending payroll payments
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Enhanced Generation Controls Component
function GeneratePayslipsButton({
  period,
  onGenerate,
  disabled,
}: {
  period: any;
  onGenerate: (periodId: number, options: any) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [includeHourlyWithoutHours, setIncludeHourlyWithoutHours] =
    useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  // Get employees for this practice
  const { data: employees } = useQuery({
    queryKey: [`/api/practices/${period.practiceId}/payroll/rates`],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/practices/${period.practiceId}/payroll/rates`
      );
      return res.json();
    },
    enabled: open,
  });

  // Get work hours for preview
  const { data: workHours } = useQuery({
    queryKey: [
      `/api/practices/${period.practiceId}/payroll/work-hours`,
      period.startDate,
      period.endDate,
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/practices/${period.practiceId}/payroll/work-hours?startDate=${period.startDate}&endDate=${period.endDate}`
      );
      return res.json();
    },
    enabled: open && previewMode,
  });

  const handleGenerate = () => {
    const options = {
      selectedEmployees:
        selectedEmployees.length > 0 ? selectedEmployees : undefined,
      includeHourlyWithoutHours,
      previewMode,
    };

    if (previewMode) {
      toast({
        title: "Generation Preview",
        description: `Would generate ${
          selectedEmployees.length || "all eligible"
        } payslips`,
      });
    } else {
      onGenerate(period.id, options);
      setOpen(false);
    }
  };

  const employeeHoursMap =
    workHours?.reduce((acc: any, wh: any) => {
      acc[wh.userId] =
        (acc[wh.userId] || 0) + parseFloat(wh.hoursWorked || "0");
      return acc;
    }, {}) || {};

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Generate Pay Slips
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Payslips</DialogTitle>
            <DialogDescription>
              Generate payslips for {period.name} (
              {format(new Date(period.startDate), "MMM dd")} -{" "}
              {format(new Date(period.endDate), "MMM dd, yyyy")})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Employee Selection */}
            <div>
              <h4 className="font-medium mb-2">Employee Selection</h4>
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                {employees?.map((emp: any) => {
                  const hours = employeeHoursMap[emp.userId] || 0;
                  const isHourly = emp.rateType === "hourly";
                  const hasHours = hours > 0;

                  return (
                    <div
                      key={emp.userId}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmployees([
                                ...selectedEmployees,
                                emp.userId,
                              ]);
                            } else {
                              setSelectedEmployees(
                                selectedEmployees.filter(
                                  (id) => id !== emp.userId
                                )
                              );
                            }
                          }}
                        />
                        <div>
                          <div className="font-medium">
                            {emp.userName || `Employee ${emp.userId}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {emp.rateType} - ${emp.rate}{" "}
                            {emp.rateType === "hourly"
                              ? "/hour"
                              : `/${emp.rateType}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        {isHourly && (
                          <div
                            className={
                              hasHours ? "text-green-600" : "text-orange-600"
                            }
                          >
                            {hours.toFixed(1)}h {!hasHours && "(No Hours)"}
                          </div>
                        )}
                        {!isHourly && (
                          <div className="text-blue-600">Salaried</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSelectedEmployees(
                      employees?.map((e: any) => e.userId) || []
                    )
                  }
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEmployees([])}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Generation Options */}
            <div>
              <h4 className="font-medium mb-2">Generation Options</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeHourlyWithoutHours"
                    checked={includeHourlyWithoutHours}
                    onChange={(e) =>
                      setIncludeHourlyWithoutHours(e.target.checked)
                    }
                  />
                  <label
                    htmlFor="includeHourlyWithoutHours"
                    className="text-sm"
                  >
                    Include hourly employees with no tracked hours (0 pay)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="previewMode"
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                  />
                  <label htmlFor="previewMode" className="text-sm">
                    Preview mode (don't actually generate)
                  </label>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium mb-1">Generation Summary</h4>
              <div className="text-sm text-muted-foreground">
                <div>
                  Selected Employees: {selectedEmployees.length || "All"}{" "}
                  employee(s)
                </div>
                <div>
                  Hourly w/o Hours:{" "}
                  {includeHourlyWithoutHours ? "Included" : "Excluded"}
                </div>
                <div>
                  Mode:{" "}
                  {previewMode ? "Preview Only" : "Generate Actual Payslips"}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate}>
              {previewMode ? "Preview Generation" : "Generate Payslips"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
