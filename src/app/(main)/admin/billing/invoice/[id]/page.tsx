"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileText,
  Mail,
  Phone,
  MapPin,
  Edit,
  Download,
  Receipt,
  CreditCard,
  Printer,
} from "lucide-react";
import html2pdf from "html2pdf.js";
import PageHeader from "@/components/page-header";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useUser } from "@/context/UserContext";

interface InvoiceItem {
  id: number;
  type: "service" | "product";
  serviceCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: {
    id: number;
    name: string;
    rate: number;
    type: string;
  };
  taxAmount: number;
}

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface Pet {
  id: number;
  name: string;
  species?: string;
  breed?: string;
  age?: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  totalTax: number;
  total: number;
  notes?: string;
  client: Client;
  pet?: Pet;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
  actionBy?: string;
  actionDate?: string;
}

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  SENT: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  PAID: "bg-green-100 text-green-800 hover:bg-green-200",
  OVERDUE: "bg-red-100 text-red-800 hover:bg-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 hover:bg-gray-200",
};

interface PaymentDialogData {
  paymentMethod: string;
  notes: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, userPracticeId } = useUser();
  const { toast } = useToast();
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentDialogData>({
    paymentMethod: "",
    notes: "",
  });

  const invoiceId = params.id as string;
  const practiceId = userPracticeId;

  // Format currency helper
  // Fetch practice currency metadata
  const { data: practiceCurrency } = useQuery({
    queryKey: [`/api/practices/${practiceId}/currency`],
    queryFn: async () => {
      if (!practiceId) return null;
      const res = await fetch(`/api/practices/${practiceId}/currency`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!practiceId,
  });

  const formatCurrency = (amount: number, currencyCode?: string) => {
    const code = currencyCode || (practiceCurrency && practiceCurrency.code);
    if (!code) return (amount || 0).toFixed(practiceCurrency?.decimals ?? 2);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
      }).format(amount);
    } catch (e) {
      return `${code} ${amount.toFixed(2)}`;
    }
  };

  // Fetch invoice data
  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery<Invoice>({
    queryKey: [`/api/practices/${practiceId}/invoices/${invoiceId}`],
    queryFn: async () => {
      if (!practiceId) throw new Error("Practice ID is required");

      const res = await fetch(
        `/api/practices/${practiceId}/invoices/${invoiceId}`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Invoice not found");
        }
        throw new Error("Failed to fetch invoice");
      }

      return res.json();
    },
    enabled: !!practiceId && !!invoiceId,
  });

  // Update invoice status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      newStatus,
      paymentData: pData,
    }: {
      newStatus: string;
      paymentData?: PaymentDialogData;
    }) => {
      if (!practiceId) throw new Error("Practice ID is required");

      const requestBody: any = { status: newStatus };

      // If marking as paid, include payment details
      if (newStatus === "PAID" && pData) {
        requestBody.paymentMethod = pData.paymentMethod;
        requestBody.notes = pData.notes;
      }

      const res = await fetch(
        `/api/practices/${practiceId}/invoices/${invoiceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        }
      );

      if (!res.ok) throw new Error("Failed to update invoice status");

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/practices/${practiceId}/invoices/${invoiceId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/practices/${practiceId}/invoices`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/practices/${practiceId}/payments`],
      });

      toast({
        title: "Success",
        description: `Invoice status updated successfully${
          data.actionBy ? ` by ${data.actionBy}` : ""
        }`,
      });

      setIsChangingStatus(false);
      setShowPaymentDialog(false);
      setPaymentData({ paymentMethod: "", notes: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
      setIsChangingStatus(false);
      setShowPaymentDialog(false);
    },
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "Draft";
      case "SENT":
        return "Sent";
      case "PAID":
        return "Paid";
      case "OVERDUE":
        return "Overdue";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  const handleStatusChange = (newStatus: string) => {
    // If marking as paid, show payment dialog
    if (newStatus === "PAID" && invoice?.status !== "PAID") {
      setShowPaymentDialog(true);
      return;
    }

    setIsChangingStatus(true);
    updateStatusMutation.mutate({ newStatus });
  };

  const handlePaymentSubmit = () => {
    if (!paymentData.paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    setIsChangingStatus(true);
    updateStatusMutation.mutate({ newStatus: "PAID", paymentData });
  };

  const handlePrint = () => {
    // Use the browser's print functionality
    window.print();
  };

  const handleDownload = async () => {
    if (!invoice) {
      toast({
        title: "Error",
        description: "Invoice data not available",
        variant: "destructive",
      });
      return;
    }

    try {
      // Show loading toast
      toast({
        title: "Generating PDF...",
        description: "Please wait while we prepare your invoice PDF",
      });

      // Get the invoice content element (exclude print:hidden elements)
      const invoiceElement = document.querySelector(".max-w-4xl") as HTMLElement;

      if (!invoiceElement) {
        throw new Error("Invoice content not found");
      }

      // Configure PDF options
      const options = {
        margin: 0.5,
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          allowTaint: false
        },
        jsPDF: {
          unit: "in",
          format: "letter",
          orientation: "portrait" as const
        }
      };

      // Generate and download PDF
      await html2pdf()
        .set(options)
        .from(invoiceElement)
        .save();

      // Show success toast
      toast({
        title: "PDF Downloaded",
        description: `Invoice ${invoice.invoiceNumber} has been downloaded successfully`,
      });

    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = () => {
    // TODO: Implement email sending functionality
    toast({
      title: "Info",
      description: "Email sending feature coming soon",
    });
  };

  // Debug log to check the invoice status value
  console.log(
    "Invoice status:",
    invoice?.status,
    "Type:",
    typeof invoice?.status
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error instanceof Error && error.message === "Invoice not found"
              ? "Invoice Not Found"
              : "Failed to Load Invoice"}
          </h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error && error.message === "Invoice not found"
              ? "The invoice you are looking for does not exist or has been deleted."
              : "There was an error loading the invoice. Please try again."}
          </p>
          <Button asChild>
            <Link href="/admin/billing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 print:p-0">
      <div className="print:hidden">
        <PageHeader
          title={`Invoice ${invoice.invoiceNumber}`}
          description="View and manage invoice details"
        />

        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            asChild
            className="bg-white hover:bg-gray-50"
          >
            <Link href="/admin/billing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Select
              value={invoice.status?.toString() || "DRAFT"}
              onValueChange={handleStatusChange}
              disabled={isChangingStatus}
            >
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleSendEmail}
              className="text-sm bg-white hover:bg-gray-50"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>

            <Button
              variant="outline"
              onClick={handlePrint}
              className="text-sm bg-white hover:bg-gray-50"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Print
            </Button>

            <Button
              variant="outline"
              onClick={handleDownload}
              className="text-sm bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Invoice Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  Invoice {invoice.invoiceNumber}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[invoice.status]}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>
                  Issue Date:{" "}
                  {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                </div>
                <div>
                  Due Date: {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                </div>
                {invoice.paidDate && (
                  <div className="text-green-600 font-medium">
                    Paid: {format(new Date(invoice.paidDate), "MMM dd, yyyy")}
                  </div>
                )}
                {invoice.actionBy && (
                  <div className="text-xs text-gray-500 mt-1">
                    Last action by: {invoice.actionBy}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Client & Pet Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="font-medium">{invoice.client.name}</div>
              {invoice.client.email && (
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {invoice.client.email}
                </div>
              )}
              {invoice.client.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {invoice.client.phone}
                </div>
              )}
              {(invoice.client.address || invoice.client.city) && (
                <div className="flex items-start text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                  <div>
                    {invoice.client.address && (
                      <div>{invoice.client.address}</div>
                    )}
                    {(invoice.client.city ||
                      invoice.client.state ||
                      invoice.client.zipCode) && (
                      <div>
                        {invoice.client.city}
                        {invoice.client.state && `, ${invoice.client.state}`}
                        {invoice.client.zipCode && ` ${invoice.client.zipCode}`}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {invoice.pet && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pet Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium">{invoice.pet.name}</div>
                {invoice.pet.species && (
                  <div className="text-gray-600">
                    Species: {invoice.pet.species}
                  </div>
                )}
                {invoice.pet.breed && (
                  <div className="text-gray-600">
                    Breed: {invoice.pet.breed}
                  </div>
                )}
                {invoice.pet.age && (
                  <div className="text-gray-600">
                    Age: {invoice.pet.age} years
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Invoice Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {item.type === "service" ? "Service" : "Product"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        {item.description}
                        {item.serviceCode && (
                          <div className="text-sm text-gray-500">
                            Code: {item.serviceCode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.taxRate ? (
                        <div>
                          <div>{formatCurrency(item.taxAmount)}</div>
                          <div className="text-xs text-gray-500">
                            ({item.taxRate.rate}%)
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total + item.taxAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Totals */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(invoice.totalTax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer Information */}
        <div className="text-center text-sm text-gray-500 print:block">
          <p>
            Created on {format(new Date(invoice.createdAt), "MMM dd, yyyy")}
            {invoice.updatedAt !== invoice.createdAt && (
              <span>
                {" "}
                • Last updated{" "}
                {format(new Date(invoice.updatedAt), "MMM dd, yyyy")}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Mark Invoice as Paid
            </DialogTitle>
            <DialogDescription>
              Record payment details for invoice {invoice?.invoiceNumber}. Total
              amount: {invoice && formatCurrency(invoice.total)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={paymentData.paymentMethod}
                onValueChange={(value) =>
                  setPaymentData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Payment Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this payment (optional)"
                value={paymentData.notes}
                onChange={(e) =>
                  setPaymentData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={isChangingStatus}
              className="bg-white hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={isChangingStatus || !paymentData.paymentMethod}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isChangingStatus ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
