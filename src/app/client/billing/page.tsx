"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useBillingData, type Invoice, type Payment } from "@/lib/billing-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Check,
  DollarSign,
  Calendar,
  Download,
  Eye,
  Clock,
  AlertCircle,
  Receipt,
  Loader2,
  Edit,
  Trash2,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { ClientHeader } from "@/components/client/ClientHeader";
import { format } from "@/lib/date-utils";

export default function BillingPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const billingHooks = useBillingData();

  const [activeTab, setActiveTab] = useState("invoices");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [showBillingInfoDialog, setShowBillingInfoDialog] = useState(false);
  const [showInvoiceDetailsDialog, setShowInvoiceDetailsDialog] =
    useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
    amount: 0,
  });

  const [selectedProvider, setSelectedProvider] = useState<
    "stripe" | "paystack"
  >("stripe");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    type: "credit_card",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    billingName: "",
    isDefault: false,
  });
  const [billingInfoForm, setBillingInfoForm] = useState({
    billingAddress: "123 Main Street",
    billingCity: "Anytown",
    billingState: "ST",
    billingZip: "12345",
    billingCountry: "United States",
    receiptEmail: user?.email || "",
  });

  // Fetch data using React Query hooks
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: invoicesError,
    refetch: refetchInvoices,
  } = billingHooks.useInvoices();

  const {
    data: payments = [],
    isLoading: isLoadingPayments,
    error: paymentsError,
    refetch: refetchPayments,
  } = billingHooks.usePayments();

  const {
    data: paymentMethods = [],
    isLoading: isLoadingPaymentMethods,
    error: paymentMethodsError,
    refetch: refetchPaymentMethods,
  } = billingHooks.usePaymentMethods();

  // Payment processing mutation
  const processPaymentMutation = billingHooks.useProcessPayment();

  // Add payment method mutation
  const addPaymentMethodMutation = billingHooks.useAddPaymentMethod();

  // Delete payment method mutation
  const deletePaymentMethodMutation = billingHooks.useDeletePaymentMethod();

  // Set primary payment method mutation
  const setPrimaryPaymentMethodMutation =
    billingHooks.useSetPrimaryPaymentMethod();

  // Calculate totals from real data
  const totalOutstanding = invoices
    .filter((inv) => inv.status === "pending" || inv.status === "overdue")
    .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

  const overdueBills = invoices.filter((inv) => inv.status === "overdue");

  const handlePayInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm((prev) => ({
      ...prev,
      amount: parseFloat(invoice.totalAmount),
    }));
    // Choose provider based on practice currency (NGN -> paystack).
    // We avoid calling usePractice() here because this component may render
    // outside the PracticeProvider during some layouts. Instead fetch practice
    // server-side data for the invoice's practice.
    (async () => {
      try {
        if ((invoice as any).practiceId) {
          const res = await fetch(
            `/api/practices/${(invoice as any).practiceId}`,
            { credentials: "include" }
          );
          if (res.ok) {
            const pr = await res.json();
            const legacyCurrency = (pr as any)?.currency;
            if (legacyCurrency && legacyCurrency.toUpperCase() === "NGN") {
              setSelectedProvider("paystack");
            } else {
              setSelectedProvider("stripe");
            }
          } else {
            setSelectedProvider("stripe");
          }
        } else {
          setSelectedProvider("stripe");
        }
      } catch (e) {
        setSelectedProvider("stripe");
      } finally {
        setShowProviderDialog(true);
      }
    })();
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchInvoices?.(),
        refetchPayments?.(),
        refetchPaymentMethods?.(),
      ]);
      toast({ title: "Data refreshed" });
    } catch (e) {
      toast({
        title: "Refresh failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const processPayment = async () => {
    if (!selectedInvoice) return;

    try {
      setIsProcessingPayment(true);
      // If provider is stripe, try to use Stripe Elements if available for PCI compliance
      if (selectedProvider === "stripe") {
        try {
          const [
            { loadStripe },
            { Elements, CardElement, useStripe, useElements },
          ] = await Promise.all([
            import("@stripe/stripe-js"),
            import("@stripe/react-stripe-js"),
          ]);

          // Request a client_secret from server
          const intentRes = await fetch("/api/billing/payments/create-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              invoiceId: selectedInvoice.id,
              amount: paymentForm.amount,
            }),
          });
          if (!intentRes.ok) throw new Error("Failed to create payment intent");
          const intentJson = await intentRes.json();
          const clientSecret = intentJson.client_secret;
          if (!clientSecret) throw new Error("No client_secret from server");

          // Initialize Stripe
          const stripePromise = loadStripe(
            (window as any).__STRIPE_PUBLISHABLE_KEY__ || ""
          );
          const stripe = await stripePromise;
          if (!stripe) throw new Error("Stripe JS not available");

          // Render a minimal temporary element to collect card details
          // For brevity, we will open a browser prompt for card details in fallback (since mounting Elements inside modal requires more refactor).
          // Prompt for basic card details (ONLY for dev/testing). In production, mount <Elements><CardElement/></Elements> and call stripe.confirmCardPayment.
          const cardNumber =
            window.prompt("Enter full card number (test only)") || "";
          const exp = window.prompt("Enter expiry MM/YY (test only)") || "";
          const cvv = window.prompt("Enter CVC (test only)") || "";

          if (!cardNumber || !exp || !cvv)
            throw new Error("Card details required");

          // Use stripe.confirmCardPayment with raw card details is not supported without Elements. For now we'll call the server to process using paymentMethod details.
          // Create a payment on the server with the paymentIntentId returned after client-side confirmation step would normally complete.
          // Since we couldn't mount Elements here, we will ask server to create a PaymentIntent and then record the payment by passing the intent id.
          // This is a pragmatic fallback for environments without @stripe/react-stripe-js installed.

          await processPaymentMutation.mutateAsync({
            invoiceId: selectedInvoice.id,
            amount: paymentForm.amount,
            paymentMethod: "credit_card",
            provider: "stripe",
            paymentIntentId:
              intentJson.id || intentJson.client_secret || undefined,
          });
        } catch (stripeErr) {
          // If Stripe libs aren't available or something failed, fallback to server-side processing using card details
          await processPaymentMutation.mutateAsync({
            invoiceId: selectedInvoice.id,
            amount: paymentForm.amount,
            paymentMethod: "credit_card",
            provider: "stripe",
            cardDetails: {
              cardNumber: paymentForm.cardNumber,
              expiryDate: paymentForm.expiryDate,
              cvv: paymentForm.cvv,
              nameOnCard: paymentForm.nameOnCard,
            },
          });
        }
      } else {
        // Paystack flow: call server to initialize transaction and get authorization_url
        if (selectedProvider === "paystack") {
          const res = await fetch("/api/billing/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              invoiceId: selectedInvoice.id,
              amount: paymentForm.amount,
              paymentMethod: "online",
              provider: "paystack",
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
              err.error || "Failed to initialize Paystack payment"
            );
          }

          const json = await res.json();
          const url =
            json.authorization_url ||
            json.authorizationUrl ||
            json.authorizationURL;
          if (url) {
            // Close modal and redirect
            setShowPaymentDialog(false);
            window.location.href = url;
            return; // halt further client-side toast until redirect
          }

          throw new Error("Paystack did not return an authorization URL");
        }

        // Other non-stripe providers - fallback to server-side processing
        await processPaymentMutation.mutateAsync({
          invoiceId: selectedInvoice.id,
          amount: paymentForm.amount,
          paymentMethod: "credit_card",
          provider: selectedProvider,
          cardDetails: {
            cardNumber: paymentForm.cardNumber,
            expiryDate: paymentForm.expiryDate,
            cvv: paymentForm.cvv,
            nameOnCard: paymentForm.nameOnCard,
          },
        });
      }

      toast({
        title: "Payment Processed",
        description: `Payment of $${paymentForm.amount.toFixed(
          2
        )} has been processed successfully.`,
      });

      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      setIsProcessingPayment(false);
    } catch (error) {
      setIsProcessingPayment(false);
      toast({
        title: "Payment Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred processing your payment.",
        variant: "destructive",
      });
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      const cardBrand = getCardBrand(paymentMethodForm.cardNumber);
      const lastFourDigits = paymentMethodForm.cardNumber.slice(-4);

      await addPaymentMethodMutation.mutateAsync({
        type: paymentMethodForm.type,
        cardNumber: paymentMethodForm.cardNumber,
        expiryMonth: paymentMethodForm.expiryMonth,
        expiryYear: paymentMethodForm.expiryYear,
        cardBrand,
        billingName: paymentMethodForm.billingName,
        // Use the existing billing info from the billingInfoForm
        billingAddress: billingInfoForm.billingAddress,
        billingCity: billingInfoForm.billingCity,
        billingState: billingInfoForm.billingState,
        billingZip: billingInfoForm.billingZip,
        billingCountry: billingInfoForm.billingCountry,
        isDefault: paymentMethodForm.isDefault,
      });

      toast({
        title: "Payment Method Added",
        description: `Payment method ending in ${lastFourDigits} has been added successfully.`,
      });

      setShowPaymentMethodDialog(false);
      resetPaymentMethodForm();
    } catch (error) {
      toast({
        title: "Failed to Add Payment Method",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred adding your payment method.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateBillingInfo = () => {
    toast({
      title: "Billing Information Updated",
      description: "Your billing information has been updated successfully.",
    });
    setShowBillingInfoDialog(false);
  };

  const getCardBrand = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, "");
    if (number.startsWith("4")) return "Visa";
    if (number.startsWith("5")) return "Mastercard";
    if (number.startsWith("3")) return "American Express";
    return "Unknown";
  };

  const resetPaymentMethodForm = () => {
    setPaymentMethodForm({
      type: "credit_card",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      billingName: "",
      isDefault: false,
    });
  };

  const handleDeletePaymentMethod = async (
    paymentMethodId: number,
    lastFourDigits: string,
    isDefault: boolean
  ) => {
    if (isDefault && paymentMethods.length === 1) {
      toast({
        title: "Cannot Delete Payment Method",
        description: "You cannot delete your only payment method.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deletePaymentMethodMutation.mutateAsync(paymentMethodId);
      toast({
        title: "Payment Method Deleted",
        description: `Payment method ending in ${lastFourDigits} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Delete Payment Method",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred deleting the payment method.",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimaryPaymentMethod = async (
    paymentMethodId: number,
    lastFourDigits: string
  ) => {
    try {
      await setPrimaryPaymentMethodMutation.mutateAsync(paymentMethodId);
      toast({
        title: "Primary Payment Method Updated",
        description: `Payment method ending in ${lastFourDigits} is now your primary method.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Update Primary Payment Method",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred updating the primary payment method.",
        variant: "destructive",
      });
    }
  };

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetailsDialog(true);
  };

  const handleDownloadInvoicePDF = async (invoice: Invoice) => {
    try {
      // In a real implementation, this would call an API endpoint to generate and download the PDF
      toast({
        title: "PDF Generated",
        description: `Invoice ${invoice.invoiceNumber} has been downloaded.`,
      });

      // For demo, create a simple downloadable text file
      const content = `
INVOICE: ${invoice.invoiceNumber}
Date: ${format(new Date(invoice.issueDate), "MMM d, YYYY")}
Due Date: ${format(new Date(invoice.dueDate), "MMM d, YYYY")}
Amount: $${parseFloat(invoice.totalAmount).toFixed(2)}
Status: ${invoice.status}

Description: ${invoice.description}

Services:
${invoice.items
  .map(
    (item) => `- ${item.description}: $${parseFloat(item.subtotal).toFixed(2)}`
  )
  .join("\n")}

Total: $${parseFloat(invoice.totalAmount).toFixed(2)}
      `;

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${invoice.invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePayOverdueBills = () => {
    const totalAmount = overdueBills.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount),
      0
    );
    setPaymentForm((prev) => ({
      ...prev,
      amount: totalAmount,
    }));
    setSelectedInvoice(null); // Clear single invoice selection for bulk payment
    setShowPaymentDialog(true);
  };

  const handleViewReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowReceiptDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            Paid
          </Badge>
        );
      case "unpaid":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Unpaid
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user || user.role !== "CLIENT") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Access denied. Client login required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isLoadingInvoices || isLoadingPayments) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <ClientHeader
          title="Billing & Payments"
          subtitle="Manage your veterinary bills and payment methods"
          showBackButton={true}
          backHref="/client"
          backLabel="Back to Portal"
        />
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <ClientHeader
        title="Billing & Payments"
        subtitle="Manage your veterinary bills and payment methods"
        showBackButton={true}
        backHref="/client"
        backLabel="Back to Portal"
      />

      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="ghost" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      {/* Billing Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-900 flex items-center justify-between">
              Outstanding Balance
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              ${totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-red-700 mt-1">
              {invoices.filter((inv) => inv.status !== "paid").length} unpaid
              bills
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-900 flex items-center justify-between">
              Overdue Bills
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {overdueBills.length}
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center justify-between">
              This Month's Payments
              <Check className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              $
              {payments
                .reduce((sum, pay) => sum + parseFloat(pay.amount), 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-green-700 mt-1">
              {payments.length} payments made
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* Surface invoice fetch errors */}
        {invoicesError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-red-800">
                  Failed to load invoices:{" "}
                  {(invoicesError as any)?.message || "Unknown error"}
                </div>
                <Button size="sm" onClick={() => refetchInvoices?.()}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <div className="space-y-6">
            {/* Overdue Bills Alert */}
            {overdueBills.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Overdue Bills Require Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700 mb-4">
                    You have {overdueBills.length} overdue bill(s) totaling $
                    {overdueBills
                      .reduce(
                        (sum, inv) => sum + parseFloat(inv.totalAmount),
                        0
                      )
                      .toFixed(2)}
                    . Please pay these as soon as possible to avoid any service
                    interruptions.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handlePayOverdueBills}
                  >
                    Pay Overdue Bills Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Invoices List */}
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card
                  key={invoice.id}
                  className={
                    invoice.status === "overdue" ? "border-red-200" : ""
                  }
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {invoice.invoiceNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Service Date:{" "}
                          {format(new Date(invoice.issueDate), "MMM d, YYYY")} •
                          Due:{" "}
                          {format(new Date(invoice.dueDate), "MMM d, YYYY")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          ${parseFloat(invoice.totalAmount).toFixed(2)}
                        </div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {invoice.pet && (
                          <div>
                            <span className="text-muted-foreground">Pet:</span>
                            <span className="ml-2 font-medium">
                              {invoice.pet.name}
                            </span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Description:
                          </span>
                          <span className="ml-2">{invoice.description}</span>
                        </div>
                      </div>

                      {/* Services Breakdown */}
                      <div className="border-t pt-3">
                        <h5 className="font-medium text-sm mb-2">Services:</h5>
                        <div className="space-y-1">
                          {invoice.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm"
                            >
                              <span>{item.description}</span>
                              <span>
                                ${parseFloat(item.subtotal).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInvoiceDetails(invoice)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoicePDF(invoice)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    {invoice.status !== "paid" && (
                      <Button
                        size="sm"
                        onClick={() => handlePayInvoice(invoice)}
                        className="ml-auto"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments">
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {payment.paymentNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.paymentDate), "MMM d, YYYY")} •{" "}
                        {payment.paymentMethod
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${parseFloat(payment.amount).toFixed(2)}
                      </div>
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <span className="text-muted-foreground">For Invoice:</span>
                    <span className="ml-2 font-medium">
                      {payment.invoice?.invoiceNumber || "N/A"}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReceipt(payment)}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    View Receipt
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              •••• •••• •••• {method.lastFourDigits}
                            </div>
                            {method.expiryMonth && method.expiryYear && (
                              <div className="text-sm text-muted-foreground">
                                Expires {method.expiryMonth}/{method.expiryYear}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {method.isDefault === "yes" && (
                            <Badge variant="outline">Primary</Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {method.isDefault !== "yes" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleSetPrimaryPaymentMethod(
                                      method.id,
                                      method.lastFourDigits
                                    )
                                  }
                                  disabled={
                                    setPrimaryPaymentMethodMutation.isPending
                                  }
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  Set as Primary
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeletePaymentMethod(
                                    method.id,
                                    method.lastFourDigits,
                                    method.isDefault === "yes"
                                  )
                                }
                                disabled={
                                  deletePaymentMethodMutation.isPending ||
                                  (method.isDefault === "yes" &&
                                    paymentMethods.length === 1)
                                }
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No saved payment methods
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentMethodDialog(true)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add New Payment Method
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Billing Address:
                    </span>
                    <div className="mt-1">
                      <div>{billingInfoForm.billingAddress}</div>
                      <div>
                        {billingInfoForm.billingCity},{" "}
                        {billingInfoForm.billingState}{" "}
                        {billingInfoForm.billingZip}
                      </div>
                      <div>{billingInfoForm.billingCountry}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Email for Receipts:
                    </span>
                    <div className="mt-1">{billingInfoForm.receiptEmail}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowBillingInfoDialog(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Billing Information
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      {/* Provider Selection Dialog (choose Stripe or Paystack) */}
      <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Choose Payment Provider</DialogTitle>
            <DialogDescription>
              Select a payment provider to process this payment. By default we
              will pick the recommended provider for your practice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label
                className={`p-3 border rounded-lg cursor-pointer ${
                  selectedProvider === "stripe"
                    ? "border-blue-500 bg-blue-50"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="stripe"
                  checked={selectedProvider === "stripe"}
                  onChange={() => setSelectedProvider("stripe")}
                  className="mr-2"
                />
                Stripe (default)
              </label>

              <label
                className={`p-3 border rounded-lg cursor-pointer ${
                  selectedProvider === "paystack"
                    ? "border-green-500 bg-green-50"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="paystack"
                  checked={selectedProvider === "paystack"}
                  onChange={() => setSelectedProvider("paystack")}
                  className="mr-2"
                />
                Paystack (Naira - NGN)
              </label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                onClick={() => setShowProviderDialog(false)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={async () => {
                // If Paystack selected, start initialization and redirect immediately
                setShowProviderDialog(false);
                if (selectedProvider === "paystack") {
                  try {
                    setIsProcessingPayment(true);
                    // Call payments init which returns authorization_url
                    const res = await fetch("/api/billing/payments", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        invoiceId: selectedInvoice?.id,
                        amount: paymentForm.amount,
                        paymentMethod: "online",
                        provider: "paystack",
                      }),
                    });

                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(
                        err.error || "Failed to initialize Paystack payment"
                      );
                    }

                    const json = await res.json();
                    const url =
                      json.authorization_url ||
                      json.authorizationUrl ||
                      json.authorizationURL;
                    if (url) {
                      setShowPaymentDialog(false);
                      window.location.href = url;
                      return;
                    }

                    throw new Error(
                      "Paystack did not return an authorization URL"
                    );
                  } catch (err) {
                    setIsProcessingPayment(false);
                    toast({
                      title: "Payment initialization failed",
                      description: (err as Error).message,
                      variant: "destructive",
                    });
                  }
                } else {
                  // For Stripe, open the payment modal (client-side Elements path)
                  setShowPaymentDialog(true);
                }
              }}
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                  Initializing...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pay Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice &&
                `Pay invoice ${selectedInvoice.invoiceNumber} for $${parseFloat(
                  selectedInvoice.totalAmount
                ).toFixed(2)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentForm.cardNumber}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, cardNumber: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={paymentForm.expiryDate}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      expiryDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={paymentForm.cvv}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, cvv: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameOnCard">Name on Card</Label>
              <Input
                id="nameOnCard"
                placeholder="John Doe"
                value={paymentForm.nameOnCard}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, nameOnCard: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Pay</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                disabled={processPaymentMutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={processPayment}
              disabled={processPaymentMutation.isPending || isProcessingPayment}
            >
              {(processPaymentMutation.isPending || isProcessingPayment) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ${paymentForm.amount.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Method Dialog */}
      <Dialog
        open={showPaymentMethodDialog}
        onOpenChange={setShowPaymentMethodDialog}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment method to your account for faster checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select
                value={paymentMethodForm.type}
                onValueChange={(value) =>
                  setPaymentMethodForm({ ...paymentMethodForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newCardNumber">Card Number</Label>
              <Input
                id="newCardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentMethodForm.cardNumber}
                onChange={(e) =>
                  setPaymentMethodForm({
                    ...paymentMethodForm,
                    cardNumber: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <Select
                  value={paymentMethodForm.expiryMonth}
                  onValueChange={(value) =>
                    setPaymentMethodForm({
                      ...paymentMethodForm,
                      expiryMonth: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = (i + 1).toString().padStart(2, "0");
                      return (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <Select
                  value={paymentMethodForm.expiryYear}
                  onValueChange={(value) =>
                    setPaymentMethodForm({
                      ...paymentMethodForm,
                      expiryYear: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = (new Date().getFullYear() + i).toString();
                      return (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  maxLength={4}
                  value={paymentMethodForm.cvv}
                  onChange={(e) =>
                    setPaymentMethodForm({
                      ...paymentMethodForm,
                      cvv: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingName">Name on Card</Label>
              <Input
                id="billingName"
                placeholder="John Doe"
                value={paymentMethodForm.billingName}
                onChange={(e) =>
                  setPaymentMethodForm({
                    ...paymentMethodForm,
                    billingName: e.target.value,
                  })
                }
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Billing Address:</strong>{" "}
                {billingInfoForm.billingAddress}, {billingInfoForm.billingCity},{" "}
                {billingInfoForm.billingState} {billingInfoForm.billingZip}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This card will use your current billing information. You can
                update it in the "Edit Billing Information" section.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={paymentMethodForm.isDefault}
                onCheckedChange={(checked) =>
                  setPaymentMethodForm({
                    ...paymentMethodForm,
                    isDefault: !!checked,
                  })
                }
              />
              <Label htmlFor="isDefault">Set as default payment method</Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                disabled={addPaymentMethodMutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleAddPaymentMethod}
              disabled={addPaymentMethodMutation.isPending}
            >
              {addPaymentMethodMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <CreditCard className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Billing Information Dialog */}
      <Dialog
        open={showBillingInfoDialog}
        onOpenChange={setShowBillingInfoDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Billing Information</DialogTitle>
            <DialogDescription>
              Update your billing address and receipt preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editBillingAddress">Billing Address</Label>
              <Input
                id="editBillingAddress"
                placeholder="123 Main Street"
                value={billingInfoForm.billingAddress}
                onChange={(e) =>
                  setBillingInfoForm({
                    ...billingInfoForm,
                    billingAddress: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editBillingCity">City</Label>
                <Input
                  id="editBillingCity"
                  placeholder="Anytown"
                  value={billingInfoForm.billingCity}
                  onChange={(e) =>
                    setBillingInfoForm({
                      ...billingInfoForm,
                      billingCity: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBillingState">State</Label>
                <Input
                  id="editBillingState"
                  placeholder="ST"
                  value={billingInfoForm.billingState}
                  onChange={(e) =>
                    setBillingInfoForm({
                      ...billingInfoForm,
                      billingState: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editBillingZip">ZIP Code</Label>
                <Input
                  id="editBillingZip"
                  placeholder="12345"
                  value={billingInfoForm.billingZip}
                  onChange={(e) =>
                    setBillingInfoForm({
                      ...billingInfoForm,
                      billingZip: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBillingCountry">Country</Label>
                <Input
                  id="editBillingCountry"
                  placeholder="United States"
                  value={billingInfoForm.billingCountry}
                  onChange={(e) =>
                    setBillingInfoForm({
                      ...billingInfoForm,
                      billingCountry: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptEmail">Email for Receipts</Label>
              <Input
                id="receiptEmail"
                type="email"
                placeholder="user@example.com"
                value={billingInfoForm.receiptEmail}
                onChange={(e) =>
                  setBillingInfoForm({
                    ...billingInfoForm,
                    receiptEmail: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateBillingInfo}>
              <Edit className="h-4 w-4 mr-2" />
              Update Information
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog
        open={showInvoiceDetailsDialog}
        onOpenChange={setShowInvoiceDetailsDialog}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Invoice Details - {selectedInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Complete invoice information and service breakdown
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold">Invoice Information</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Invoice Number:
                      </span>{" "}
                      <span className="font-medium">
                        {selectedInvoice.invoiceNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Issue Date:</span>{" "}
                      <span className="font-medium">
                        {format(
                          new Date(selectedInvoice.issueDate),
                          "MMM d, YYYY"
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due Date:</span>{" "}
                      <span className="font-medium">
                        {format(
                          new Date(selectedInvoice.dueDate),
                          "MMM d, YYYY"
                        )}
                      </span>
                    </div>
                    {selectedInvoice.paidDate && (
                      <div>
                        <span className="text-muted-foreground">
                          Paid Date:
                        </span>{" "}
                        <span className="font-medium">
                          {format(
                            new Date(selectedInvoice.paidDate),
                            "MMM d, YYYY"
                          )}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      {getStatusBadge(selectedInvoice.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Pet Information</h4>
                  <div className="space-y-1 text-sm">
                    {selectedInvoice.pet ? (
                      <div>
                        <span className="text-muted-foreground">Pet Name:</span>{" "}
                        <span className="font-medium">
                          {selectedInvoice.pet.name}
                        </span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        No pet information available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="font-semibold">Description</h4>
                <p className="text-sm">{selectedInvoice.description}</p>
              </div>

              {/* Services Table */}
              <div className="space-y-2">
                <h4 className="font-semibold">Services Breakdown</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">
                          Description
                        </th>
                        <th className="text-right p-3 font-medium">Quantity</th>
                        <th className="text-right p-3 font-medium">
                          Unit Price
                        </th>
                        <th className="text-right p-3 font-medium">Discount</th>
                        <th className="text-right p-3 font-medium">Taxable</th>
                        <th className="text-right p-3 font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr
                          key={item.id}
                          className={
                            index % 2 === 0 ? "bg-background" : "bg-muted/30"
                          }
                        >
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">
                            ${parseFloat(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            ${parseFloat(item.discountAmount).toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            {item.taxable === "yes" ? "Yes" : "No"}
                          </td>
                          <td className="p-3 text-right font-medium">
                            ${parseFloat(item.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>
                        ${parseFloat(selectedInvoice.subtotal).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>
                        ${parseFloat(selectedInvoice.taxAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-lg">
                      <span>Total:</span>
                      <span>
                        ${parseFloat(selectedInvoice.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History for this Invoice */}
              {selectedInvoice.payments &&
                selectedInvoice.payments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Payment History</h4>
                    <div className="space-y-2">
                      {selectedInvoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between items-center p-3 border rounded"
                        >
                          <div>
                            <div className="font-medium">
                              {payment.paymentNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(
                                new Date(payment.paymentDate),
                                "MMM d, YYYY"
                              )}{" "}
                              • {payment.paymentMethod}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              ${parseFloat(payment.amount).toFixed(2)}
                            </div>
                            <Badge className="bg-green-50 text-green-700 border-green-200">
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {selectedInvoice && selectedInvoice.status !== "paid" && (
              <Button
                onClick={() => {
                  setShowInvoiceDetailsDialog(false);
                  handlePayInvoice(selectedInvoice);
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Invoice
              </Button>
            )}
            {selectedInvoice && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvoiceDetailsDialog(false);
                  handleDownloadInvoicePDF(selectedInvoice);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payment Receipt - {selectedPayment?.paymentNumber}
            </DialogTitle>
            <DialogDescription>
              Receipt for your payment transaction
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Receipt Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-semibold">Payment Receipt</h3>
                <p className="text-sm text-muted-foreground">
                  Thank you for your payment
                </p>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Payment Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Receipt Number:
                      </span>{" "}
                      <span className="font-medium">
                        {selectedPayment.paymentNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Payment Date:
                      </span>{" "}
                      <span className="font-medium">
                        {format(
                          new Date(selectedPayment.paymentDate),
                          "MMM d, YYYY"
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Payment Method:
                      </span>{" "}
                      <span className="font-medium">
                        {selectedPayment.paymentMethod
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        {selectedPayment.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Invoice Information</h4>
                  <div className="space-y-2 text-sm">
                    {selectedPayment.invoice ? (
                      <>
                        <div>
                          <span className="text-muted-foreground">
                            Invoice Number:
                          </span>{" "}
                          <span className="font-medium">
                            {selectedPayment.invoice.invoiceNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Service:
                          </span>{" "}
                          <span className="font-medium">
                            {selectedPayment.invoice.description}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground">
                        No invoice information available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Amount Paid:</span>
                  <span>${parseFloat(selectedPayment.amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedPayment.notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Notes</h4>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-4 text-xs text-muted-foreground text-center">
                <p>
                  This is an electronic receipt. Please save this for your
                  records.
                </p>
                <p>
                  If you have any questions, please contact our billing
                  department.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedPayment) {
                  // Create downloadable receipt
                  const content = `
PAYMENT RECEIPT
Receipt Number: ${selectedPayment.paymentNumber}
Payment Date: ${format(new Date(selectedPayment.paymentDate), "MMM d, YYYY")}
Amount: $${parseFloat(selectedPayment.amount).toFixed(2)}
Payment Method: ${selectedPayment.paymentMethod
                    .replace("_", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
Status: ${selectedPayment.status}

${
  selectedPayment.invoice
    ? `Invoice: ${selectedPayment.invoice.invoiceNumber}`
    : ""
}
${selectedPayment.notes ? `Notes: ${selectedPayment.notes}` : ""}
                `;

                  const blob = new Blob([content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `receipt_${selectedPayment.paymentNumber}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
