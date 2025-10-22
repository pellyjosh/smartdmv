"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
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
  DialogTrigger,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  BadgeCheck,
  CircleDollarSign,
  CreditCardIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Helper function to format dates
const formatDate = (dateString: string) => {
  return format(new Date(dateString), "MMM dd, yyyy");
};

// Helper to format card number (hide all but last 4 digits)
const formatCardNumber = (cardNumber: string) => {
  return `•••• •••• •••• ${cardNumber.slice(-4)}`;
};

// Payment Methods Tab
const PaymentMethodsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);

  // Fetch payment methods
  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["/api/payments/methods"],
    queryFn: async () => {
      const res = await fetch("/api/payments/methods");
      if (!res.ok) throw new Error("Failed to fetch payment methods");
      return res.json();
    },
    staleTime: 10000,
  });

  // Payment method form schema
  const paymentMethodSchema = z.object({
    cardholderName: z.string().min(1, "Cardholder name is required"),
    cardNumber: z
      .string()
      .min(13, "Card number must be at least 13 digits")
      .max(19, "Card number must not exceed 19 digits"),
    expiryMonth: z.string().min(1, "Expiry month is required"),
    expiryYear: z.string().min(1, "Expiry year is required"),
    cvv: z
      .string()
      .min(3, "CVV must be at least 3 digits")
      .max(4, "CVV must not exceed 4 digits"),
    billingAddress: z.string().min(1, "Billing address is required"),
    isDefault: z.boolean().default(false),
  });

  // Form for adding payment methods
  const form = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      cardholderName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      billingAddress: "",
      isDefault: false,
    },
  });

  // Handle payment method selection for editing
  useEffect(() => {
    if (selectedPaymentMethod) {
      form.reset({
        cardholderName: selectedPaymentMethod.cardholderName,
        cardNumber: "••••••••••••" + selectedPaymentMethod.last4,
        expiryMonth: "••",
        expiryYear: "••••",
        cvv: "•••",
        billingAddress: selectedPaymentMethod.billingAddress,
        isDefault: selectedPaymentMethod.isDefault,
      });
    } else {
      form.reset({
        cardholderName: "",
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: "",
        billingAddress: "",
        isDefault: false,
      });
    }
  }, [selectedPaymentMethod, form]);

  // Create payment method mutation
  const createPaymentMethodMutation = useMutation({
    mutationFn: async (data: z.infer<typeof paymentMethodSchema>) => {
      const response = await fetch("/api/payments/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add payment method");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment method added",
        description: "Your payment method has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/methods"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add payment method: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update payment method mutation
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      billingAddress?: string;
      isDefault: boolean;
    }) => {
      const response = await fetch(`/api/payments/methods/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingAddress: data.billingAddress,
          isDefault: data.isDefault,
        }),
      });
      if (!response.ok) throw new Error("Failed to update payment method");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment method updated",
        description: "Your payment method has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/methods"] });
      setIsDialogOpen(false);
      setSelectedPaymentMethod(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update payment method: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/payments/methods/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete payment method");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment method deleted",
        description: "Your payment method has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/methods"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete payment method: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Submit handler for the form
  const onSubmit = (data: z.infer<typeof paymentMethodSchema>) => {
    if (selectedPaymentMethod) {
      updatePaymentMethodMutation.mutate({
        id: selectedPaymentMethod.id,
        billingAddress: data.billingAddress,
        isDefault: data.isDefault,
      });
    } else {
      createPaymentMethodMutation.mutate(data);
    }
  };

  const openNewPaymentMethodDialog = () => {
    setSelectedPaymentMethod(null);
    form.reset({
      cardholderName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      billingAddress: "",
      isDefault: false,
    });
    setIsDialogOpen(true);
  };

  const openEditPaymentMethodDialog = (method: any) => {
    setSelectedPaymentMethod(method);
    setIsDialogOpen(true);
  };

  const handleDeletePaymentMethod = (id: number) => {
    if (confirm("Are you sure you want to delete this payment method?")) {
      deletePaymentMethodMutation.mutate(id);
    }
  };

  const handleSetDefaultPaymentMethod = (id: number) => {
    updatePaymentMethodMutation.mutate({
      id,
      isDefault: true,
    });
  };

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      value: month.toString().padStart(2, "0"),
      label: month.toString().padStart(2, "0"),
    };
  });

  // Generate year options (current year + 20 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear + i;
    return { value: year.toString(), label: year.toString() };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payment Methods</h2>
        <Button onClick={openNewPaymentMethodDialog}>Add Payment Method</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods && paymentMethods.length > 0 ? (
            paymentMethods.map((method: any) => (
              <Card
                key={method.id}
                className={method.isDefault ? "border-2 border-primary" : ""}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {method.cardBrand || "Card"}{" "}
                      {method.isDefault && (
                        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </span>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{method.cardholderName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="font-mono text-lg">
                    {formatCardNumber(method.last4)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Expires: {method.expiryMonth}/{method.expiryYear}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditPaymentMethodDialog(method)}
                    >
                      Edit
                    </Button>
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    disabled={method.isDefault}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>No Payment Methods</CardTitle>
                <CardDescription>
                  You haven't added any payment methods yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Click "Add Payment Method" to add a credit card or other
                  payment method to your account.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPaymentMethod
                ? "Edit Payment Method"
                : "Add Payment Method"}
            </DialogTitle>
            <DialogDescription>
              {selectedPaymentMethod
                ? "Update your payment method information."
                : "Enter your payment details. Your information is secure and encrypted."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="cardholderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cardholder Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="John Doe"
                        disabled={!!selectedPaymentMethod}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="1234 5678 9012 3456"
                        disabled={!!selectedPaymentMethod}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="expiryMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!selectedPaymentMethod}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
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
                  name="expiryYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!selectedPaymentMethod}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="YYYY" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year.value} value={year.value}>
                              {year.label}
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
                  name="cvv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVV</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123"
                          maxLength={4}
                          disabled={!!selectedPaymentMethod}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="billingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="123 Main St, Anytown, USA"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set as default payment method</FormLabel>
                      <FormDescription>
                        This will be used as your default payment method for all
                        future transactions.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createPaymentMethodMutation.isPending ||
                    updatePaymentMethodMutation.isPending
                  }
                >
                  {(createPaymentMethodMutation.isPending ||
                    updatePaymentMethodMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedPaymentMethod ? "Update" : "Add"} Payment Method
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Payment History Tab
const PaymentHistoryTab = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Fetch payment history with date range filter
  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/payments/history", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/payments/history?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      if (!response.ok) throw new Error("Failed to fetch payment history");
      return response.json();
    },
    staleTime: 10000,
  });

  // Handle date range change
  const handleDateRangeChange = (
    field: "startDate" | "endDate",
    value: string
  ) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Get payment status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
        return "bg-yellow-100 text-yellow-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get payment status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "canceled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payment History</h2>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>
            Filter payment history by date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  handleDateRangeChange("startDate", e.target.value)
                }
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  handleDateRangeChange("endDate", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments && payments.length > 0 ? (
                  payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.createdAt)}</TableCell>
                      <TableCell>
                        {payment.description ||
                          `Payment for invoice #${payment.invoiceNumber}`}
                      </TableCell>
                      <TableCell>{payment.invoiceNumber}</TableCell>
                      <TableCell>
                        {payment.paymentMethodDetails ? (
                          <span className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-1 text-muted-foreground" />
                            {payment.paymentMethodDetails.brand} ••••{" "}
                            {payment.paymentMethodDetails.last4}
                          </span>
                        ) : (
                          "Not specified"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getStatusIcon(payment.status)}
                          <span
                            className={`ml-1 text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(
                              payment.status
                            )}`}
                          >
                            {payment.status
                              .replace(/_/g, " ")
                              .replace(/^\w/, (c: string) => c.toUpperCase())}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No payment history found for the selected date range.
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
};

// Practice Gateway Settings Tab
const PracticeGatewaySettingsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGateway, setSelectedGateway] = useState("");

  // State for API key forms
  const [showStripeApiForm, setShowStripeApiForm] = useState(false);
  const [showPaystackApiForm, setShowPaystackApiForm] = useState(false);

  // Fetch available gateways from Owner DB
  const { data: availableGateways, isLoading: isLoadingGateways } = useQuery({
    queryKey: ["/api/practice-admin/available-gateways"],
    queryFn: async () => {
      const res = await fetch("/api/practice-admin/available-gateways");
      if (!res.ok) throw new Error("Failed to fetch available gateways");
      const data = await res.json();
      return data.providers || [];
    },
    staleTime: 60000, // 1 minute
  });

  // Fetch practice payment settings
  const { data: practicePaymentSettings, isLoading: isLoadingSettings } =
    useQuery({
      queryKey: ["/api/practice-admin/payment-settings"],
      queryFn: async () => {
        const res = await fetch("/api/practice-admin/payment-settings");
        if (!res.ok) throw new Error("Failed to fetch settings");
        return res.json();
      },
      staleTime: 10000,
    });

  // Set initial selected gateway when data loads
  useEffect(() => {
    if (practicePaymentSettings?.preferredGateway) {
      setSelectedGateway(practicePaymentSettings.preferredGateway);
    } else if (practicePaymentSettings?.configuredProviders?.length > 0) {
      // If no preferred gateway, select the first configured one
      setSelectedGateway(
        practicePaymentSettings.configuredProviders[0].providerCode
      );
    }
  }, [practicePaymentSettings]);

  // Form for Stripe API keys
  const stripeForm = useForm({
    resolver: zodResolver(
      z.object({
        publishableKey: z.string().min(1, "Publishable key is required"),
        secretKey: z.string().min(1, "Secret key is required"),
      })
    ),
    defaultValues: {
      publishableKey: "",
      secretKey: "",
    },
  });

  // Form for Paystack API keys
  const paystackForm = useForm({
    resolver: zodResolver(
      z.object({
        publicKey: z.string().min(1, "Public key is required"),
        secretKey: z.string().min(1, "Secret key is required"),
      })
    ),
    defaultValues: {
      publicKey: "",
      secretKey: "",
    },
  });

  // Connect to Stripe mutation
  const connectToStripeMutation = useMutation({
    mutationFn: async (credentials: {
      publishableKey: string;
      secretKey: string;
    }) => {
      const response = await fetch(
        "/api/practice-admin/payments/stripe/connect",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        }
      );
      if (!response.ok) throw new Error("Failed to connect to Stripe");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connected to Stripe",
        description: "Your Stripe API keys have been saved successfully.",
      });
      setShowStripeApiForm(false);
      queryClient.invalidateQueries({
        queryKey: ["/api/practice-admin/payments/stripe/status"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to connect to Stripe: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Connect to Paystack mutation
  const connectToPaystackMutation = useMutation({
    mutationFn: async (credentials: {
      publicKey: string;
      secretKey: string;
    }) => {
      const response = await fetch(
        "/api/practice-admin/payments/paystack/connect",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        }
      );
      if (!response.ok) throw new Error("Failed to connect to Paystack");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connected to Paystack",
        description: "Your Paystack API keys have been saved successfully.",
      });
      setShowPaystackApiForm(false);
      queryClient.invalidateQueries({
        queryKey: ["/api/practice-admin/payments/paystack/status"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to connect to Paystack: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update practice preferred gateway mutation
  const updatePreferredGatewayMutation = useMutation({
    mutationFn: async (gateway: string) => {
      const response = await fetch(
        "/api/practice-admin/payment-settings/preferred",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gatewayType: gateway }),
        }
      );
      if (!response.ok) throw new Error("Failed to update preference");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Gateway preference updated",
        description: `Your practice will now use ${
          selectedGateway.charAt(0).toUpperCase() + selectedGateway.slice(1)
        } as the preferred payment gateway.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/practice-admin/payment-settings"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update gateway preference: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleGatewayChange = (gateway: string) => {
    setSelectedGateway(gateway);
  };

  const handleSavePreferredGateway = () => {
    if (!selectedGateway) {
      toast({
        title: "Error",
        description: "Please select a payment gateway first",
        variant: "destructive",
      });
      return;
    }
    updatePreferredGatewayMutation.mutate(selectedGateway);
  };

  const handleSubmitStripeKeys = (data: any) => {
    connectToStripeMutation.mutate(data);
  };

  const handleSubmitPaystackKeys = (data: any) => {
    connectToPaystackMutation.mutate(data);
  };

  // Check if a provider is configured
  const isProviderConfigured = (providerCode: string) => {
    return practicePaymentSettings?.configuredProviders?.some(
      (p: any) => p.providerCode === providerCode && p.hasSecretKey
    );
  };

  const isLoading = isLoadingGateways || isLoadingSettings;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Practice Payment Gateway Settings
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Preferred Payment Gateway</CardTitle>
              <CardDescription>
                Select which payment gateway your practice will primarily use
                for processing payments. Configure API keys below before
                selecting a preferred gateway.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="font-medium">Available payment gateways:</div>
                {availableGateways && availableGateways.length > 0 ? (
                  <>
                    <RadioGroup
                      value={selectedGateway}
                      onValueChange={handleGatewayChange}
                      className="grid grid-cols-1 gap-4 md:grid-cols-2"
                    >
                      {availableGateways.map((gateway: any) => {
                        const isConfigured = isProviderConfigured(gateway.code);
                        return (
                          <div key={gateway.code}>
                            <RadioGroupItem
                              value={gateway.code}
                              id={`${gateway.code}-gateway`}
                              className="sr-only"
                              disabled={!isConfigured}
                            />
                            <Label
                              htmlFor={`${gateway.code}-gateway`}
                              className={`${
                                selectedGateway === gateway.code
                                  ? "border-primary bg-primary/5"
                                  : "border-border"
                              } ${
                                !isConfigured
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                              } flex flex-col items-center justify-between rounded-lg border p-4 relative`}
                            >
                              <div className="flex w-full flex-row items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {gateway.code === "stripe" && (
                                    <BadgeCheck className="h-6 w-6 text-blue-600" />
                                  )}
                                  {gateway.code === "paystack" && (
                                    <CircleDollarSign className="h-6 w-6 text-green-600" />
                                  )}
                                  {gateway.code !== "stripe" &&
                                    gateway.code !== "paystack" && (
                                      <CreditCardIcon className="h-6 w-6 text-gray-600" />
                                    )}
                                  <span className="font-medium">
                                    {gateway.name}
                                  </span>
                                </div>
                                <CreditCard className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground w-full text-left">
                                {gateway.description ||
                                  `Secure payments with ${gateway.name}`}
                              </div>
                              {isConfigured ? (
                                <div className="mt-2 w-full">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Configured
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-2 w-full">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Not Configured
                                  </span>
                                </div>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={handleSavePreferredGateway}
                        disabled={
                          !selectedGateway ||
                          updatePreferredGatewayMutation.isPending
                        }
                      >
                        {updatePreferredGatewayMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Preferred Gateway
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment gateways available. Contact system administrator.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Key Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle>API Key Configuration</CardTitle>
              <CardDescription>
                Configure your payment gateway API keys. These credentials are
                encrypted and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {availableGateways &&
                  availableGateways.map((gateway: any) => {
                    const isConfigured = isProviderConfigured(gateway.code);

                    if (gateway.code === "stripe") {
                      return (
                        <div
                          key={gateway.code}
                          className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <BadgeCheck className="h-5 w-5 text-blue-600" />
                              <div>
                                <h3 className="text-lg font-medium">
                                  {gateway.name} API Keys
                                </h3>
                                {isConfigured && (
                                  <p className="text-xs text-green-600 flex items-center mt-1">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Keys configured
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setShowStripeApiForm(!showStripeApiForm)
                              }
                            >
                              {showStripeApiForm
                                ? "Cancel"
                                : isConfigured
                                ? "Update"
                                : "Configure"}
                            </Button>
                          </div>

                          {showStripeApiForm && (
                            <Form {...stripeForm}>
                              <form
                                onSubmit={stripeForm.handleSubmit(
                                  handleSubmitStripeKeys
                                )}
                                className="space-y-4 mt-4 bg-muted/50 p-4 rounded-lg"
                              >
                                <FormField
                                  control={stripeForm.control}
                                  name="publishableKey"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Stripe Publishable Key
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="pk_live_..."
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Your Stripe publishable key (starts with
                                        pk_)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={stripeForm.control}
                                  name="secretKey"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Stripe Secret Key</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="password"
                                          placeholder="sk_live_..."
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Your Stripe secret key (starts with sk_)
                                        - will be encrypted
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="submit"
                                  disabled={connectToStripeMutation.isPending}
                                >
                                  {connectToStripeMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  {isConfigured ? "Update" : "Save"}{" "}
                                  {gateway.name} Keys
                                </Button>
                              </form>
                            </Form>
                          )}
                        </div>
                      );
                    }

                    if (gateway.code === "paystack") {
                      return (
                        <div
                          key={gateway.code}
                          className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <CircleDollarSign className="h-5 w-5 text-green-600" />
                              <div>
                                <h3 className="text-lg font-medium">
                                  {gateway.name} API Keys
                                </h3>
                                {isConfigured && (
                                  <p className="text-xs text-green-600 flex items-center mt-1">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Keys configured
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setShowPaystackApiForm(!showPaystackApiForm)
                              }
                            >
                              {showPaystackApiForm
                                ? "Cancel"
                                : isConfigured
                                ? "Update"
                                : "Configure"}
                            </Button>
                          </div>

                          {showPaystackApiForm && (
                            <Form {...paystackForm}>
                              <form
                                onSubmit={paystackForm.handleSubmit(
                                  handleSubmitPaystackKeys
                                )}
                                className="space-y-4 mt-4 bg-muted/50 p-4 rounded-lg"
                              >
                                <FormField
                                  control={paystackForm.control}
                                  name="publicKey"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Paystack Public Key</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="pk_live_..."
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Your Paystack public key (starts with
                                        pk_)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={paystackForm.control}
                                  name="secretKey"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Paystack Secret Key</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="password"
                                          placeholder="sk_live_..."
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Your Paystack secret key (starts with
                                        sk_) - will be encrypted
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="submit"
                                  disabled={connectToPaystackMutation.isPending}
                                >
                                  {connectToPaystackMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  {isConfigured ? "Update" : "Save"}{" "}
                                  {gateway.name} Keys
                                </Button>
                              </form>
                            </Form>
                          )}
                        </div>
                      );
                    }

                    // For other gateways not yet supported
                    return (
                      <div
                        key={gateway.code}
                        className="space-y-2 border-t pt-4 opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CreditCardIcon className="h-5 w-5 text-gray-600" />
                            <div>
                              <h3 className="text-lg font-medium">
                                {gateway.name} API Keys
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Configuration UI not yet available
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default function PaymentGatewayPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payment Gateway</h1>
      </div>

      <Tabs defaultValue="paymentMethods" className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
          <TabsTrigger value="paymentMethods">Payment Methods</TabsTrigger>
          <TabsTrigger value="paymentHistory">Payment History</TabsTrigger>
          <TabsTrigger value="practiceSettings">Practice Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="paymentMethods" className="space-y-4">
          <PaymentMethodsTab />
        </TabsContent>
        <TabsContent value="paymentHistory" className="space-y-4">
          <PaymentHistoryTab />
        </TabsContent>
        <TabsContent value="practiceSettings" className="space-y-4">
          <PracticeGatewaySettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
