"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePractice } from "@/hooks/use-practice";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";

import {
  Card,
  CardContent,
  CardDescription,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Banknote,
} from "lucide-react";

interface PayrollStub {
  id: number;
  employeeId: number;
  employeeName: string;
  grossPay: string;
  netPay: string;
  status: "pending" | "processing" | "paid" | "failed" | "void";
  payDate: string;
  deductionsBreakdown: any;
  taxesBreakdown: any;
}

interface BankAccount {
  id: number;
  accountName: string;
  accountType: string;
  bankName: string;
  accountNumber: string;
  isDefault: boolean;
}

export function PayrollPaymentProcessor() {
  const { practice } = usePractice();
  const { format: formatCurrency } = useCurrencyFormatter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStubs, setSelectedStubs] = useState<number[]>([]);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [batchPaymentDialog, setBatchPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const practiceId = practice?.id ? Number(practice.id) : undefined;
  const base = practiceId ? `/api/practices/${practiceId}/payroll` : undefined;

  // Fetch pending payroll stubs
  const { data: payrollStubs = [], isLoading: stubsLoading } = useQuery({
    queryKey: [base, "stubs", "pending"],
    enabled: !!base,
    queryFn: async () => {
      const response = await apiRequest("GET", `${base}/stubs`);
      const data = await response.json();
      return data.filter((stub: PayrollStub) => stub.status === "pending");
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

  // Process individual payment
  const processPayment = useMutation({
    mutationFn: async ({
      stubId,
      paymentMethod,
      bankAccountId,
      notes,
    }: {
      stubId: number;
      paymentMethod: string;
      bankAccountId?: string;
      notes?: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `${base}/stubs/${stubId}/process-payment`,
        {
          paymentMethod,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
          notes,
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Processed",
        description: "Payment has been processed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [base, "stubs"] });
      setPaymentDialog(false);
      setSelectedStubs([]);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    },
  });

  // Process batch payments
  const processBatchPayments = useMutation({
    mutationFn: async ({
      paymentMethod,
      bankAccountId,
      notes,
      selectedEmployees,
    }: {
      paymentMethod: string;
      bankAccountId?: string;
      notes?: string;
      selectedEmployees: number[];
    }) => {
      // Find the pay period ID from the first selected stub
      const firstStub = payrollStubs.find((stub: any) =>
        selectedEmployees.includes(stub.employeeId)
      );
      if (!firstStub) throw new Error("No valid pay period found");

      const response = await apiRequest(
        "POST",
        `${base}/periods/${firstStub.payPeriodId}/batch-payments`,
        {
          paymentMethod,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
          notes,
          selectedEmployees,
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Payment Processed",
        description: `Successfully processed ${data.totalProcessed} payments.`,
      });
      queryClient.invalidateQueries({ queryKey: [base, "stubs"] });
      setBatchPaymentDialog(false);
      setSelectedStubs([]);
    },
    onError: (error: any) => {
      toast({
        title: "Batch Payment Failed",
        description: error.message || "Failed to process batch payments",
        variant: "destructive",
      });
    },
  });

  const handleStubSelection = (stubId: number, checked: boolean) => {
    if (checked) {
      setSelectedStubs([...selectedStubs, stubId]);
    } else {
      setSelectedStubs(selectedStubs.filter((id) => id !== stubId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStubs(payrollStubs.map((stub: any) => stub.id));
    } else {
      setSelectedStubs([]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const totalPendingAmount = payrollStubs.reduce(
    (sum: number, stub: any) => sum + parseFloat(stub.netPay || "0"),
    0
  );

  const selectedAmount = payrollStubs
    .filter((stub: any) => selectedStubs.includes(stub.id))
    .reduce(
      (sum: number, stub: any) => sum + parseFloat(stub.netPay || "0"),
      0
    );

  if (stubsLoading) {
    return <div>Loading payroll data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Payments
                </p>
                <p className="text-2xl font-bold">{payrollStubs.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalPendingAmount)}
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
                  Selected Amount
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(selectedAmount)}
                </p>
              </div>
              <Banknote className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Bank Accounts
                </p>
                <p className="text-2xl font-bold">{bankAccounts.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => setBatchPaymentDialog(true)}
          disabled={selectedStubs.length === 0}
          className="flex items-center gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Process Batch Payment ({selectedStubs.length})
        </Button>

        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Payroll Stubs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Payroll Payments</CardTitle>
          <CardDescription>
            Review and process payroll payments for employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedStubs.length === payrollStubs.length &&
                      payrollStubs.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pay Date</TableHead>
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
                        onCheckedChange={(checked) =>
                          handleStubSelection(stub.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {stub.employeeName || stub.userName}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(parseFloat(stub.grossPay))}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(parseFloat(stub.netPay))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(stub.status)}
                        <Badge className={getStatusBadgeColor(stub.status)}>
                          {stub.status.charAt(0).toUpperCase() +
                            stub.status.slice(1)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(stub.payDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStubs([stub.id]);
                            setPaymentDialog(true);
                          }}
                        >
                          Process Payment
                        </Button>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
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

      {/* Individual Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Process payment for selected employee(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="payroll_card">Payroll Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPaymentMethod === "direct_deposit" && (
              <div>
                <Label htmlFor="bankAccount">Bank Account</Label>
                <Select onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account: BankAccount) => (
                      <SelectItem
                        key={account.id}
                        value={account.id.toString()}
                      >
                        {account.accountName} ({account.bankName}) -{" "}
                        {account.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add payment notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const stubId = selectedStubs[0];
                if (stubId && selectedPaymentMethod) {
                  processPayment.mutate({
                    stubId,
                    paymentMethod: selectedPaymentMethod,
                    bankAccountId: selectedBankAccount,
                    notes: paymentNotes,
                  });
                }
              }}
              disabled={!selectedPaymentMethod || processPayment.isPending}
            >
              {processPayment.isPending ? "Processing..." : "Process Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Payment Dialog */}
      <Dialog open={batchPaymentDialog} onOpenChange={setBatchPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Batch Payment</DialogTitle>
            <DialogDescription>
              Process payments for {selectedStubs.length} selected employee(s) -
              Total: {formatCurrency(selectedAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="batchPaymentMethod">Payment Method</Label>
              <Select onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                  <SelectItem value="check">Batch Check Printing</SelectItem>
                  <SelectItem value="payroll_card">
                    Payroll Card Deposit
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPaymentMethod === "direct_deposit" && (
              <div>
                <Label htmlFor="batchBankAccount">Bank Account</Label>
                <Select onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account: BankAccount) => (
                      <SelectItem
                        key={account.id}
                        value={account.id.toString()}
                      >
                        {account.accountName} ({account.bankName}) -{" "}
                        {account.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="batchNotes">Batch Notes (Optional)</Label>
              <Textarea
                id="batchNotes"
                placeholder="Add batch payment notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPaymentMethod) {
                  const selectedEmployees = payrollStubs
                    .filter((stub: any) => selectedStubs.includes(stub.id))
                    .map((stub: any) => stub.employeeId);

                  processBatchPayments.mutate({
                    paymentMethod: selectedPaymentMethod,
                    bankAccountId: selectedBankAccount,
                    notes: paymentNotes,
                    selectedEmployees,
                  });
                }
              }}
              disabled={
                !selectedPaymentMethod || processBatchPayments.isPending
              }
            >
              {processBatchPayments.isPending
                ? "Processing..."
                : `Process ${selectedStubs.length} Payments`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
