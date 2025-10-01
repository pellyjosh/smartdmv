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
import { Loader2, Users, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePractice } from "@/hooks/use-practice";
import { format } from "date-fns";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount || 0);
const formatDate = (dateString: string) =>
  dateString ? format(new Date(dateString), "MMM dd, yyyy") : "—";

// Schemas
const payRateSchema = z.object({
  userId: z.number({ required_error: "Select employee" }),
  rateType: z.enum(["hourly", "salary"]),
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

export default function PayrollPage() {
  const { practice } = usePractice();
  const practiceId = practice?.id ? Number(practice.id) : undefined;
  const base = practiceId ? `/api/practices/${practiceId}/payroll` : undefined;
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payroll Management</h1>
      </div>
      <Tabs defaultValue="payRates" className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-4">
          <TabsTrigger value="payRates">Pay Rates</TabsTrigger>
          <TabsTrigger value="workHours">Work Hours</TabsTrigger>
          <TabsTrigger value="payPeriods">Pay Periods</TabsTrigger>
          <TabsTrigger value="payStubs">Pay Stubs</TabsTrigger>
        </TabsList>
        <TabsContent value="payRates">
          <PayRatesTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="workHours">
          <WorkHoursTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="payPeriods">
          <PayPeriodsTab practiceId={practiceId} base={base} />
        </TabsContent>
        <TabsContent value="payStubs">
          <PayStubsTab practiceId={practiceId} base={base} />
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
    if (editing)
      form.reset({
        userId: editing.userId,
        rateType: editing.rateType,
        rate: editing.rate,
        effectiveDate: editing.effectiveDate.split("T")[0],
        description: editing.description || "",
      });
    else
      form.reset({
        rateType: "hourly",
        rate: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        description: "",
      });
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
                        {r.rateType === "hourly" ? "/hr" : "/yr"}
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
                            {s.name}
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
                        <SelectItem value="salary">Salary</SelectItem>
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
                    <FormLabel>Rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
  const { data: rows, isLoading } = useQuery({
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(h);
                              setOpen(true);
                            }}
                          >
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
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
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
                            {s.name}
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
                        {(rates || [])
                          .filter(
                            (r: any) => r.userId === form.getValues("userId")
                          )
                          .map((r: any) => (
                            <SelectItem key={r.id} value={r.id.toString()}>
                              {formatCurrency(parseFloat(r.rate))}/
                              {r.rateType === "hourly" ? "hr" : "yr"} -{" "}
                              {r.description || "Standard"}
                            </SelectItem>
                          ))}
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
      toast({ title: "Pay stubs generated" });
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
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={p.status === "paid"}
                            onClick={() => {
                              if (confirm("Generate pay stubs?"))
                                generate.mutate(p.id);
                            }}
                          >
                            Generate Pay Stubs
                          </Button>
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
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
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
  const summary = stubs?.reduce(
    (acc: any, s: any) => {
      acc.total += parseFloat(s.netPay);
      acc.count += 1;
      return acc;
    },
    { total: 0, count: 0 }
  );
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pay Stubs</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pay Stubs
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stubs || []).length ? (
                  (stubs || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.userName}</TableCell>
                      <TableCell>{s.payPeriodName}</TableCell>
                      <TableCell>
                        {formatCurrency(parseFloat(s.grossPay))}
                      </TableCell>
                      <TableCell>{formatCurrency(0)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(parseFloat(s.netPay))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            s.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : s.status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No pay stubs
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
