"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Receipt
} from "lucide-react";
import { ClientHeader } from "@/components/client/ClientHeader";
import { format } from "@/lib/date-utils";

export default function BillingPage() {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('invoices');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    amount: 0
  });

  // Mock data for veterinary billing
  const mockInvoices = [
    {
      id: 'INV-2025-001',
      date: '2025-07-28',
      dueDate: '2025-08-15',
      amount: 125.50,
      status: 'unpaid',
      services: [
        { name: 'Annual Wellness Exam', price: 85.00, petName: 'Bella' },
        { name: 'Vaccinations', price: 40.50, petName: 'Bella' }
      ],
      veterinarian: 'Dr. Sarah Johnson',
      petName: 'Bella',
      description: 'Annual checkup and vaccinations'
    },
    {
      id: 'INV-2025-002',
      date: '2025-07-15',
      dueDate: '2025-08-01',
      amount: 89.00,
      status: 'paid',
      services: [
        { name: 'Dental Cleaning', price: 75.00, petName: 'Max' },
        { name: 'Dental X-rays', price: 14.00, petName: 'Max' }
      ],
      veterinarian: 'Dr. Michael Chen',
      petName: 'Max',
      description: 'Routine dental cleaning',
      paidDate: '2025-07-16'
    },
    {
      id: 'INV-2025-003',
      date: '2025-06-20',
      dueDate: '2025-07-20',
      amount: 245.75,
      status: 'overdue',
      services: [
        { name: 'Emergency Visit', price: 150.00, petName: 'Luna' },
        { name: 'Blood Work', price: 65.75, petName: 'Luna' },
        { name: 'Medications', price: 30.00, petName: 'Luna' }
      ],
      veterinarian: 'Dr. Emily Rodriguez',
      petName: 'Luna',
      description: 'Emergency visit for stomach issues'
    }
  ];

  const mockPaymentHistory = [
    {
      id: 'PAY-001',
      date: '2025-07-16',
      amount: 89.00,
      method: 'Credit Card',
      invoiceId: 'INV-2025-002',
      status: 'completed'
    },
    {
      id: 'PAY-002',
      date: '2025-06-15',
      amount: 167.25,
      method: 'Debit Card',
      invoiceId: 'INV-2025-004',
      status: 'completed'
    }
  ];

  // Calculate totals
  const totalOutstanding = mockInvoices
    .filter(inv => inv.status === 'unpaid' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overdueBills = mockInvoices.filter(inv => inv.status === 'overdue');

  const handlePayInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentForm(prev => ({ ...prev, amount: invoice.amount }));
    setShowPaymentDialog(true);
  };

  const processPayment = () => {
    // Mock payment processing
    toast({
      title: "Payment Processed",
      description: `Payment of $${paymentForm.amount.toFixed(2)} has been processed successfully.`,
    });
    setShowPaymentDialog(false);
    setSelectedInvoice(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case 'unpaid':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Unpaid</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user || user.role !== 'CLIENT') {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Access denied. Client login required.</p>
          </CardContent>
        </Card>
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
              {mockInvoices.filter(inv => inv.status !== 'paid').length} unpaid bills
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
              ${mockPaymentHistory.reduce((sum, pay) => sum + pay.amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-green-700 mt-1">
              {mockPaymentHistory.length} payments made
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                    You have {overdueBills.length} overdue bill(s) totaling ${overdueBills.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}. 
                    Please pay these as soon as possible to avoid any service interruptions.
                  </p>
                  <Button variant="destructive" size="sm">
                    Pay Overdue Bills Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Invoices List */}
            <div className="space-y-4">
              {mockInvoices.map((invoice) => (
                <Card key={invoice.id} className={invoice.status === 'overdue' ? 'border-red-200' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{invoice.id}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Service Date: {format(new Date(invoice.date), 'MMM d, YYYY')} • 
                          Due: {format(new Date(invoice.dueDate), 'MMM d, YYYY')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">${invoice.amount.toFixed(2)}</div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Pet:</span>
                          <span className="ml-2 font-medium">{invoice.petName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Veterinarian:</span>
                          <span className="ml-2 font-medium">{invoice.veterinarian}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Description:</span>
                          <span className="ml-2">{invoice.description}</span>
                        </div>
                      </div>
                      
                      {/* Services Breakdown */}
                      <div className="border-t pt-3">
                        <h5 className="font-medium text-sm mb-2">Services:</h5>
                        <div className="space-y-1">
                          {invoice.services.map((service, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{service.name}</span>
                              <span>${service.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    {invoice.status !== 'paid' && (
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
            {mockPaymentHistory.map((payment) => (
              <Card key={payment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{payment.id}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.date), 'MMM d, YYYY')} • {payment.method}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">${payment.amount.toFixed(2)}</div>
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <span className="text-muted-foreground">For Invoice:</span>
                    <span className="ml-2 font-medium">{payment.invoiceId}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm">
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
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">•••• •••• •••• 4242</div>
                        <div className="text-sm text-muted-foreground">Expires 12/2026</div>
                      </div>
                    </div>
                    <Badge variant="outline">Primary</Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">
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
                    <span className="text-muted-foreground">Billing Address:</span>
                    <div className="mt-1">
                      <div>123 Main Street</div>
                      <div>Anytown, ST 12345</div>
                      <div>United States</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email for Receipts:</span>
                    <div className="mt-1">{user?.email}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">
                  Edit Billing Information
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pay Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice && `Pay invoice ${selectedInvoice.id} for $${selectedInvoice.amount.toFixed(2)}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentForm.cardNumber}
                onChange={(e) => setPaymentForm({...paymentForm, cardNumber: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={paymentForm.expiryDate}
                  onChange={(e) => setPaymentForm({...paymentForm, expiryDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={paymentForm.cvv}
                  onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nameOnCard">Name on Card</Label>
              <Input
                id="nameOnCard"
                placeholder="John Doe"
                value={paymentForm.nameOnCard}
                onChange={(e) => setPaymentForm({...paymentForm, nameOnCard: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Pay</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={processPayment}>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ${paymentForm.amount.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
