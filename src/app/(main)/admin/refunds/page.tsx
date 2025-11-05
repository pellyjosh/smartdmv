"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  CircleDollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "date-fns";
import { usePractice } from "@/hooks/use-practice";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";

// Schema
const refundRequestSchema = z.object({
  paymentId: z.string().min(1, "Payment is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().min(1, "Currency is required").default("USD"),
  gatewayType: z.enum(["STRIPE", "PAYSTACK"]),
  clientId: z.number().int().positive("Client ID is required"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});
type RefundRequestFormValues = z.infer<typeof refundRequestSchema>;

const StatusBadge = ({ status }: { status: string }) => {
  let variant: any = "outline";
  let icon = null;
  switch (status) {
    case "COMPLETED":
      variant = "success";
      icon = <CheckCircle2 className="w-4 h-4 mr-1" />;
      break;
    case "PENDING":
      variant = "secondary";
      icon = <Clock className="w-4 h-4 mr-1" />;
      break;
    case "PROCESSING":
      variant = "default";
      icon = <CircleDollarSign className="w-4 h-4 mr-1" />;
      break;
    case "FAILED":
      variant = "destructive";
      icon = <AlertCircle className="w-4 h-4 mr-1" />;
      break;
    case "CANCELED":
      variant = "outline";
      icon = <XCircle className="w-4 h-4 mr-1" />;
      break;
    default:
      variant = "outline";
  }
  return (
    <Badge variant={variant} className="flex items-center">
      {icon}
      {status}
    </Badge>
  );
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return (
    date.toLocaleString() +
    " (" +
    formatDistance(date, new Date(), { addSuffix: true }) +
    ")"
  );
};

export default function RefundManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [showRefundDetails, setShowRefundDetails] = useState(false);
  const [showNewRefundForm, setShowNewRefundForm] = useState(false);
  const { practice } = usePractice();
  const practiceId = practice?.id ? Number(practice.id) : undefined;

  const { format: formatCurrency } = useCurrencyFormatter();

  const form = useForm<RefundRequestFormValues>({
    resolver: zodResolver(refundRequestSchema),
    // Provide all text inputs with empty-string defaults so they are controlled from first render
    defaultValues: {
      paymentId: "",
      amount: "",
      // currency is provided by practice default; form does not expose currency selection
      currency: (practice as any)?.defaultCurrencyId
        ? ((practice as any).defaultCurrencyId as any)
        : (undefined as any),
      gatewayType: "STRIPE",
      clientId: undefined as any, // remains unset until user picks; select will treat '' as no selection
      reason: "",
      notes: "",
    },
  });

  // Fetch eligible payments (completed or processing)
  const { data: eligiblePayments, isLoading: paymentsLoading } = useQuery({
    queryKey: [practiceId, "eligible-payments"],
    enabled: !!practiceId,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/practices/${practiceId}/payments/eligible-for-refund`
      );
      return res.json();
    },
  });

  // Fetch clients for dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: [practiceId, "clients"],
    enabled: !!practiceId,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/practices/${practiceId}/clients`
      );
      return res.json();
    },
  });

  const base = practiceId ? `/api/practices/${practiceId}/refunds` : undefined;
  const {
    data: refundsList,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [base],
    enabled: !!base,
    refetchInterval: 60000,
    queryFn: async () => {
      const res = await apiRequest("GET", base!);
      return res.json();
    },
  });

  const createRefundMutation = useMutation({
    mutationFn: async (data: RefundRequestFormValues) => {
      if (!base) throw new Error("No practice context");
      // Ensure practice has configured default currency
      if (!(practice as any)?.defaultCurrencyId)
        throw new Error("Practice has no configured default currency");
      const payload = {
        paymentId: data.paymentId,
        amount: parseFloat(data.amount as unknown as string),
        currencyId: (practice as any).defaultCurrencyId,
        gatewayType: data.gatewayType,
        clientId: data.clientId,
        reason: data.reason,
        notes: data.notes,
      };
      const res = await apiRequest("POST", base, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Refund request created",
        description: "The refund request has been submitted.",
      });
      setShowNewRefundForm(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: [base] });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to create refund",
        description: e.message,
        variant: "destructive",
      }),
  });

  const processRefundMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!base) throw new Error("No practice context");
      const res = await apiRequest("POST", `${base}/${id}/process`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Refund processed" });
      setSelectedRefund(null);
      setShowRefundDetails(false);
      queryClient.invalidateQueries({ queryKey: [base] });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to process",
        description: e.message,
        variant: "destructive",
      }),
  });

  const cancelRefundMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!base) throw new Error("No practice context");
      const res = await apiRequest("POST", `${base}/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Refund canceled" });
      setSelectedRefund(null);
      setShowRefundDetails(false);
      queryClient.invalidateQueries({ queryKey: [base] });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to cancel",
        description: e.message,
        variant: "destructive",
      }),
  });

  const filtered = (refundsList || []).filter((r: any) => {
    if (activeTab === "all") return true;
    return r.status?.toLowerCase() === activeTab;
  });

  const onSubmit = (data: RefundRequestFormValues) =>
    // Block if practice doesn't have a default currency
    (async () => {
      if (!(practice as any)?.defaultCurrencyId) {
        toast({
          title:
            "Please configure the practice default currency before creating refunds.",
          variant: "destructive",
        });
        return;
      }
      createRefundMutation.mutate(data);
    })();
  const handleViewDetails = (r: any) => {
    setSelectedRefund(r);
    setShowRefundDetails(true);
  };

  if (isLoading)
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-80" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  if (isError)
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load refunds"}
          </AlertDescription>
        </Alert>
      </div>
    );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Refund Management</h1>
        <Button
          onClick={() => setShowNewRefundForm(true)}
          disabled={!practiceId}
        >
          Create New Refund Request
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processed">Processed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="void">Canceled</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Refund Requests</CardTitle>
              <CardDescription>
                Manage and process refunds for your practice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No refund requests found
                </div>
              ) : (
                <Table>
                  <TableCaption>List of refund requests</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.paymentId}</TableCell>
                        <TableCell>{r.clientName || "Unknown"}</TableCell>
                        <TableCell>
                          {r.amount} {r.currency}
                        </TableCell>
                        <TableCell>{r.gatewayType}</TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell>{formatDate(r.requestedAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(r)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showNewRefundForm} onOpenChange={setShowNewRefundForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Refund Request</DialogTitle>
            <DialogDescription>
              Enter the payment details for the refund request.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="paymentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment</FormLabel>
                    <FormControl>
                      <div>
                        <Combobox
                          disabled={paymentsLoading || !eligiblePayments}
                          options={(eligiblePayments || []).map((p: any) => ({
                            value: p.id.toString(),
                            label: `${p.paymentNumber} - ${p.client?.name || "Unknown"} - ${formatCurrency(p.amount)} (${p.currency?.code || ""})`,
                          }))}
                          value={field.value}
                          onSelect={(value) => {
                            field.onChange(value);
                            // Auto-populate other fields
                            const selectedPayment = eligiblePayments?.find(
                              (p: any) => p.id.toString() === value
                            );
                            if (selectedPayment) {
                              form.setValue("amount", selectedPayment.amount);
                              form.setValue("clientId", selectedPayment.client?.id);
                              // Set gateway type based on payment method or default to STRIPE
                              // You may need to adjust this logic based on your data
                              const gateway = selectedPayment.paymentMethod?.toUpperCase().includes("PAYSTACK") 
                                ? "PAYSTACK" 
                                : "STRIPE";
                              form.setValue("gatewayType", gateway as any);
                            }
                          }}
                          placeholder={
                            paymentsLoading
                              ? "Loading payments..."
                              : "Search payments..."
                          }
                          emptyText={
                            paymentsLoading ? "Loading..." : "No eligible payments"
                          }
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select a completed or processing payment to refund
                    </FormDescription>
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
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormDescription>
                        Auto-filled from selected payment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Currency is provided by the practice default; users cannot select it here */}
              </div>
              <FormField
                control={form.control}
                name="gatewayType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Gateway</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gateway" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STRIPE">Stripe</SelectItem>
                          <SelectItem value="PAYSTACK">Paystack</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <div>
                        <Combobox
                          disabled={true}
                          options={(clients || []).map((c: any) => ({
                            value: c.id.toString(),
                            label: c.name || c.email || `Client ${c.id}`,
                          }))}
                          value={
                            field.value ? field.value.toString() : undefined
                          }
                          onSelect={(v) => field.onChange(parseInt(v))}
                          placeholder="Auto-filled from payment"
                          emptyText="No client"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Auto-filled from selected payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Reason for refund" {...field} />
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
                      <Textarea placeholder="Additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewRefundForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRefundMutation.isPending}>
                  {createRefundMutation.isPending
                    ? "Creating..."
                    : "Create Refund Request"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showRefundDetails} onOpenChange={setShowRefundDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Refund Request Details</DialogTitle>
            <DialogDescription>
              View and manage the details of this refund request.
            </DialogDescription>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Payment ID</p>
                  <p className="text-sm">{selectedRefund.paymentId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <StatusBadge status={selectedRefund.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-sm">
                    {selectedRefund.amount} {selectedRefund.currency}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Gateway</p>
                  <p className="text-sm">{selectedRefund.gatewayType}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Requested At</p>
                <p className="text-sm">
                  {formatDate(selectedRefund.requestedAt)}
                </p>
              </div>
              {selectedRefund.processedAt && (
                <div>
                  <p className="text-sm font-medium">Processed At</p>
                  <p className="text-sm">
                    {formatDate(selectedRefund.processedAt)}
                  </p>
                </div>
              )}
              {selectedRefund.completedAt && (
                <div>
                  <p className="text-sm font-medium">Completed At</p>
                  <p className="text-sm">
                    {formatDate(selectedRefund.completedAt)}
                  </p>
                </div>
              )}
              {selectedRefund.reason && (
                <div>
                  <p className="text-sm font-medium">Reason</p>
                  <p className="text-sm">{selectedRefund.reason}</p>
                </div>
              )}
              {selectedRefund.notes && (
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm">{selectedRefund.notes}</p>
                </div>
              )}
              {selectedRefund.errorDetails && (
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Error Details
                  </p>
                  <p className="text-sm text-destructive">
                    {selectedRefund.errorDetails}
                  </p>
                </div>
              )}
              <DialogFooter>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRefundDetails(false)}
                  >
                    Close
                  </Button>
                  {selectedRefund.status === "PENDING" && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          cancelRefundMutation.mutate(selectedRefund.id)
                        }
                        disabled={cancelRefundMutation.isPending}
                      >
                        {cancelRefundMutation.isPending
                          ? "Canceling..."
                          : "Cancel Refund"}
                      </Button>
                      <Button
                        onClick={() =>
                          processRefundMutation.mutate(selectedRefund.id)
                        }
                        disabled={processRefundMutation.isPending}
                      >
                        {processRefundMutation.isPending
                          ? "Processing..."
                          : "Process Refund"}
                      </Button>
                    </>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
