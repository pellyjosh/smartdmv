'use client';
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle, 
  Search, 
  ShoppingCart, 
  CreditCard, 
  DollarSign, 
  Check, 
  Trash2, 
  Printer, 
  Mail, 
  BarChart4,
  Tag,
  User,
  Package
} from "lucide-react";
import { PawPrint } from "@/components/icons/custom-icons";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { MarketplaceFeatureMessage, MarketplaceFeatureContainer } from "@/components/features/marketplace-feature-message";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePractice } from "@/hooks/use-practice";

// Define types for POS entities
interface POSTransaction {
  id: number;
  practiceId: number;
  clientId: number | null;
  petId: number | null;
  appointmentId: number | null;
  cashierId: number;
  transactionNumber: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes: string | null;
  receiptSent: boolean;
  receiptEmail: string | null;
  receiptPhone: string | null;
  createdAt: string;
  updatedAt: string | null;
  cancelledAt: string | null;
  cancelledById: number | null;
  cancellationReason: string | null;
  deletedAt: string | null;
}

interface POSTransactionItem {
  id: number;
  transactionId: number;
  inventoryId: number | null;
  productName: string;
  productSku: string;
  quantity: string;
  unitPrice: string;
  unitCost: string | null;
  discountPercent: string;
  discountAmount: string;
  taxRate: string;
  taxAmount: string;
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  isRefunded: boolean;
  refundedAt: string | null;
  refundedById: number | null;
  refundReason: string | null;
  batchId: number | null;
  isCustomProduct: boolean;
  prescriptionId: number | null;
}

interface POSPayment {
  id: number;
  transactionId: number;
  paymentMethod: string;
  amount: string;
  referenceNumber: string;
  cardLast4: string | null;
  cardType: string | null;
  receiptUrl: string | null;
  status: string;
  gatewayResponse: string | null;
  createdAt: string;
  refundedAt: string | null;
  refundedById: number | null;
  refundReason: string | null;
  changeAmount: string;
  capturedById: number;
}

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  unitPrice: string;
  taxRate: string;
}

interface CartItem {
  id: number | null;
  inventoryId: number | null;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  isCustomProduct: boolean;
  notes: string | null;
}

interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Pet {
  id: number;
  name: string;
  clientId: number;
  species: string;
  breed: string | null;
  age: number | null;
}

interface TransactionData {
  practiceId: number;
  clientId: number | null;
  petId: number | null;
  appointmentId: number | null;
  cashierId: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes: string | null;
}

// Payment methods available in the system
const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', icon: DollarSign },
  { id: 'credit_card', name: 'Credit Card', icon: CreditCard },
  { id: 'debit_card', name: 'Debit Card', icon: CreditCard },
  { id: 'check', name: 'Check', icon: Check },
];

export default function POSPage() {
  const { toast } = useToast();
  const { practice } = usePractice();
  const queryClient = useQueryClient();
  const { availableFeatures } = useFeatureAccess();
  
  // Check if user has access to point of sale feature
  const hasPointOfSaleAccess = availableFeatures?.includes('point_of_sale');
  
  // State for cart management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [notes, setNotes] = useState("");
  const [customProductName, setCustomProductName] = useState("");
  const [customProductPrice, setCustomProductPrice] = useState("");
  const [customProductSku, setCustomProductSku] = useState("");
  const [customProductTaxRate, setCustomProductTaxRate] = useState("8.5");
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  
  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxTotal = cart.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = subtotal + taxTotal;
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };
  
  // Fetch inventory items
  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/inventory'],
    refetchOnWindowFocus: false
  });
  
  // Fetch clients for search
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/users/clients'],
    refetchOnWindowFocus: false
  });
  
  // Fetch pets for the selected client
  const { data: pets = [], isLoading: petsLoading } = useQuery({
    queryKey: ['/api/pets', selectedClient?.id],
    enabled: !!selectedClient,
    refetchOnWindowFocus: false
  });
  
  // Fetch transactions for history tab
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/pos/transactions'],
    refetchOnWindowFocus: false
  });
  
  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: TransactionData) => {
      const res = await apiRequest("POST", "/api/pos/transactions", transactionData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transaction created",
        description: `Transaction #${data.transactionNumber} has been created.`,
        variant: "default",
      });
      
      // Add items to transaction
      addItemsToTransaction(data.transaction.id);
      
      // Reset the cart
      setCart([]);
      setSelectedClient(null);
      setSelectedPet(null);
      setNotes("");
      
      // Close payment sheet
      setIsPaymentSheetOpen(false);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/pos/transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Create transaction items mutation
  const addItemsToTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, items }: { transactionId: number, items: CartItem[] }) => {
      const promises = items.map(item => {
        return apiRequest("POST", "/api/pos/transaction-items", {
          transactionId,
          inventoryId: item.inventoryId,
          name: item.productName,
          sku: item.productSku,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          taxRate: item.taxRate.toString(),
          taxAmount: item.taxAmount.toString(),
          subtotal: item.subtotal.toString(),
          total: item.total.toString(),
          isCustomProduct: item.isCustomProduct,
          notes: item.notes
        });
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      // After adding items, add payment
      createPayment();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add items to transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async ({ transactionId, paymentMethod, amount }: { transactionId: number, paymentMethod: string, amount: number }) => {
      const res = await apiRequest("POST", "/api/pos/payments", {
        transactionId,
        paymentMethod,
        amount: amount.toString(),
        referenceNumber: `REF-${Date.now()}`
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment processed",
        description: "Payment has been successfully processed.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment processing failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Helper function to add a product to the cart
  const addToCart = (item: InventoryItem) => {
    const existingItemIndex = cart.findIndex(cartItem => 
      cartItem.inventoryId === item.id && !cartItem.isCustomProduct
    );
    
    if (existingItemIndex >= 0) {
      // If item already exists in cart, increase quantity
      const updatedCart = [...cart];
      const existingItem = updatedCart[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      const newSubtotal = newQuantity * existingItem.unitPrice;
      const newTaxAmount = newSubtotal * (existingItem.taxRate / 100);
      
      updatedCart[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        subtotal: newSubtotal,
        taxAmount: newTaxAmount,
        total: newSubtotal + newTaxAmount
      };
      
      setCart(updatedCart);
    } else {
      // Add new item to cart
      const unitPrice = parseFloat(item.unitPrice);
      const taxRate = parseFloat(item.taxRate || "0");
      const subtotal = unitPrice;
      const taxAmount = subtotal * (taxRate / 100);
      
      setCart([...cart, {
        id: null,
        inventoryId: item.id,
        productName: item.name,
        productSku: item.sku,
        quantity: 1,
        unitPrice,
        taxRate,
        taxAmount,
        subtotal,
        total: subtotal + taxAmount,
        isCustomProduct: false,
        notes: null
      }]);
    }
    
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to the cart.`,
    });
  };
  
  // Add custom product to cart
  const addCustomProductToCart = () => {
    if (!customProductName || !customProductPrice) {
      toast({
        title: "Missing information",
        description: "Please provide a name and price for the custom product.",
        variant: "destructive",
      });
      return;
    }
    
    const unitPrice = parseFloat(customProductPrice);
    const taxRate = parseFloat(customProductTaxRate);
    const subtotal = unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    
    setCart([...cart, {
      id: null,
      inventoryId: null,
      productName: customProductName,
      productSku: customProductSku || `CUSTOM-${Date.now()}`,
      quantity: 1,
      unitPrice,
      taxRate,
      taxAmount,
      subtotal,
      total: subtotal + taxAmount,
      isCustomProduct: true,
      notes: "Custom product"
    }]);
    
    // Reset custom product fields
    setCustomProductName("");
    setCustomProductPrice("");
    setCustomProductSku("");
    setCustomProductTaxRate("8.5");
    
    toast({
      title: "Custom product added",
      description: `${customProductName} has been added to the cart.`,
    });
  };
  
  // Remove item from cart
  const removeFromCart = (index: number) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };
  
  // Update item quantity in cart
  const updateCartItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return; // Don't allow quantity less than 1
    
    const updatedCart = [...cart];
    const item = updatedCart[index];
    const newSubtotal = newQuantity * item.unitPrice;
    const newTaxAmount = newSubtotal * (item.taxRate / 100);
    
    updatedCart[index] = {
      ...item,
      quantity: newQuantity,
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      total: newSubtotal + newTaxAmount
    };
    
    setCart(updatedCart);
  };
  
  // Clear the entire cart
  const clearCart = () => {
    setCart([]);
    setSelectedClient(null);
    setSelectedPet(null);
    setNotes("");
  };
  
  // Process the transaction
  const processTransaction = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to the cart before checkout.",
        variant: "destructive",
      });
      return;
    }
    
    setIsPaymentSheetOpen(true);
  };
  
  // Complete the transaction
  const completeTransaction = () => {
    if (!practice) {
      toast({
        title: "Practice not found",
        description: "Unable to determine practice information.",
        variant: "destructive",
      });
      return;
    }
    
    const transactionData: TransactionData = {
      practiceId: practice.id,
      clientId: selectedClient?.id || null,
      petId: selectedPet?.id || null,
      appointmentId: null,
      cashierId: 0, // This will be set by the server based on the logged-in user
      subtotal,
      taxAmount: taxTotal,
      discountAmount: 0,
      totalAmount: total,
      notes: notes || null
    };
    
    createTransactionMutation.mutate(transactionData);
  };
  
  // Add items to a created transaction
  const addItemsToTransaction = (transactionId: number) => {
    addItemsToTransactionMutation.mutate({ 
      transactionId, 
      items: cart 
    });
  };
  
  // Create payment for a transaction
  const createPayment = () => {
    if (!createTransactionMutation.data) return;
    
    const transactionId = createTransactionMutation.data.transaction.id;
    
    createPaymentMutation.mutate({
      transactionId,
      paymentMethod,
      amount: total
    });
  };
  
  // Filter inventory items based on search query
  const filteredInventoryItems = searchQuery 
    ? inventoryItems.filter((item: InventoryItem) => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : inventoryItems;
  
  // Filter clients based on search query
  const filteredClients = searchQuery
    ? clients.filter((client: Client) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (client.phone && client.phone.includes(searchQuery))
      )
    : clients;

  // Check if user has access to Point of Sale feature
  // If user doesn't have access to Point of Sale feature, show it behind a marketplace badge
  if (!hasPointOfSaleAccess) {
    const posContent = (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Point of Sale</h1>
          <p className="text-gray-500">Manage sales, process payments, and track inventory</p>
        </div>
        
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="new">New Sale</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
            <TabsTrigger value="reports">Sales Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="new" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Search</CardTitle>
                    <CardDescription>Search for products to add to the cart</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          type="search"
                          placeholder="Search products..."
                          className="pl-8"
                        />
                      </div>
                      <Button variant="outline" className="gap-2">
                        <Tag className="h-4 w-4" />
                        Categories
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {/* Sample product cards */}
                      {[1, 2, 3, 4, 5, 6].map((item) => (
                        <Card key={item} className="cursor-pointer hover:bg-gray-50">
                          <CardContent className="p-4">
                            <div className="text-sm font-medium">Sample Product {item}</div>
                            <div className="text-sm text-gray-500">SKU: PRD-{item}</div>
                            <div className="flex justify-between items-center mt-2">
                              <div className="font-semibold">${(19.99 * item).toFixed(2)}</div>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Client & Patient</CardTitle>
                    <CardDescription>Attach this sale to a client and patient</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="client">Client</Label>
                        <Select>
                          <SelectTrigger id="client">
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="client1">John Smith</SelectItem>
                            <SelectItem value="client2">Jane Doe</SelectItem>
                            <SelectItem value="client3">Bob Johnson</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="pet">Pet</Label>
                        <Select disabled>
                          <SelectTrigger id="pet">
                            <SelectValue placeholder="Select a pet" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="pet1">Buddy</SelectItem>
                            <SelectItem value="pet2">Max</SelectItem>
                            <SelectItem value="pet3">Bailey</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        <span>Cart</span>
                      </CardTitle>
                      <Badge variant="outline" className="ml-2 font-normal">0 items</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[200px] flex items-center justify-center border border-dashed rounded-md p-8">
                      <div className="text-center">
                        <ShoppingCart className="mx-auto h-8 w-8 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No items in cart</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Start by adding products from the list on the left
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col space-y-3 border-t px-6 py-4">
                    <div className="flex justify-between w-full">
                      <span className="text-gray-500">Subtotal:</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between w-full">
                      <span className="text-gray-500">Tax:</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between w-full font-medium text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>$0.00</span>
                    </div>
                    <Button disabled className="w-full mt-2 gap-2">
                      <CreditCard className="h-4 w-4" />
                      Checkout
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="gap-2 justify-start">
                      <PlusCircle className="h-4 w-4" />
                      Custom Item
                    </Button>
                    <Button variant="outline" className="gap-2 justify-start">
                      <User className="h-4 w-4" />
                      Add Client
                    </Button>
                    <Button variant="outline" className="gap-2 justify-start">
                      <Package className="h-4 w-4" />
                      Inventory
                    </Button>
                    <Button variant="outline" className="gap-2 justify-start">
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>View and manage your recent sales</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">TX-{1000 + i}</TableCell>
                        <TableCell>{new Date().toLocaleDateString()}</TableCell>
                        <TableCell>Client {i}</TableCell>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="text-right">${(49.99 * i).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Completed
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Sales Reports</CardTitle>
                <CardDescription>Analyze your sales performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border border-dashed rounded-md">
                  <div className="text-center p-6">
                    <BarChart4 className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sales Performance</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Sales reporting and analytics would appear here for paid subscribers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
    
    return (
      <MarketplaceFeatureContainer
        featureName="Point of Sale"
        featureId="point_of_sale"
        description="The Point of Sale system allows you to process transactions, manage inventory, and track sales in your practice. Purchase this add-on to enable a complete retail solution integrated with your practice management system."
        addOnId="point-of-sale"
      >
        {posContent}
      </MarketplaceFeatureContainer>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/pos/transactions'] })}
          >
            <BarChart4 className="h-4 w-4 mr-2" />
            Refresh Transactions
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="pos" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="pos">POS Terminal</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>
        
        {/* POS Terminal Tab */}
        <TabsContent value="pos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Cart */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Shopping Cart</span>
                    {cart.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearCart}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {cart.length === 0 ? (
                      "Your cart is empty"
                    ) : (
                      `${cart.length} item${cart.length > 1 ? 's' : ''} in cart`
                    )}
                  </CardDescription>
                  
                  {/* Client and Pet Selection */}
                  <div className="mt-4 space-y-2">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <User className="h-4 w-4 mr-2" />
                          {selectedClient ? selectedClient.name : "Select Client"}
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right">
                        <SheetHeader>
                          <SheetTitle>Select Client</SheetTitle>
                          <SheetDescription>
                            Choose a client for this transaction
                          </SheetDescription>
                        </SheetHeader>
                        <div className="py-4">
                          <Input
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="mb-4"
                          />
                          <ScrollArea className="h-[60vh]">
                            <div className="space-y-2">
                              {clientsLoading ? (
                                <p className="text-center text-muted-foreground">Loading clients...</p>
                              ) : filteredClients.length === 0 ? (
                                <p className="text-center text-muted-foreground">No clients found</p>
                              ) : (
                                filteredClients.map((client: Client) => (
                                  <SheetClose key={client.id} asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-between"
                                      onClick={() => {
                                        setSelectedClient(client);
                                        setSelectedPet(null);
                                        setSearchQuery("");
                                      }}
                                    >
                                      <div className="flex items-center">
                                        <Avatar className="h-6 w-6 mr-2">
                                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                          <p className="text-sm font-medium">{client.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {client.email || client.phone || "No contact info"}
                                          </p>
                                        </div>
                                      </div>
                                      {selectedClient?.id === client.id && (
                                        <Check className="h-4 w-4 text-primary" />
                                      )}
                                    </Button>
                                  </SheetClose>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </SheetContent>
                    </Sheet>
                    
                    {selectedClient && (
                      <Select
                        value={selectedPet?.id.toString() || ""}
                        onValueChange={(value) => {
                          const pet = pets.find((p: Pet) => p.id.toString() === value);
                          setSelectedPet(pet || null);
                        }}
                      >
                        <SelectTrigger>
                          <div className="flex items-center">
                            <PawPrint className="h-4 w-4 mr-2" />
                            {selectedPet ? selectedPet.name : "Select Pet"}
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No pet selected</SelectItem>
                          {petsLoading ? (
                            <SelectItem value="" disabled>Loading pets...</SelectItem>
                          ) : pets.length === 0 ? (
                            <SelectItem value="" disabled>No pets found</SelectItem>
                          ) : (
                            pets.map((pet: Pet) => (
                              <SelectItem key={pet.id} value={pet.id.toString()}>
                                {pet.name} ({pet.species})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mb-2" />
                      <p>Add products to your cart</p>
                      <p className="text-sm">Use the product catalog or create a custom item</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {cart.map((item, index) => (
                          <div key={index} className="flex justify-between items-start border-b pb-2">
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <p className="font-medium">{item.productName}</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0"
                                  onClick={() => removeFromCart(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.productSku} {item.isCustomProduct && <Badge variant="outline">Custom</Badge>}
                              </div>
                              <div className="flex items-center mt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                >
                                  -
                                </Button>
                                <span className="mx-2">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                >
                                  +
                                </Button>
                                <span className="ml-4">
                                  {formatCurrency(item.unitPrice)} each
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(item.total)}</p>
                              <p className="text-xs text-muted-foreground">
                                Tax: {formatCurrency(item.taxAmount)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(taxTotal)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex-col space-y-4">
                  <Input
                    placeholder="Add notes to this transaction"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button 
                    className="w-full" 
                    size="lg"
                    disabled={cart.length === 0}
                    onClick={processTransaction}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Checkout ({formatCurrency(total)})
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Right Column - Product Catalog */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Product Catalog</CardTitle>
                  <CardDescription>
                    Search for products to add to the cart
                  </CardDescription>
                  
                  <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Custom Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Custom Product</DialogTitle>
                          <DialogDescription>
                            Create a custom product that's not in your inventory
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                              id="name"
                              placeholder="Enter product name"
                              value={customProductName}
                              onChange={(e) => setCustomProductName(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="sku">Product SKU (Optional)</Label>
                            <Input
                              id="sku"
                              placeholder="Enter product SKU"
                              value={customProductSku}
                              onChange={(e) => setCustomProductSku(e.target.value)}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="price">Price</Label>
                              <Input
                                id="price"
                                placeholder="0.00"
                                value={customProductPrice}
                                onChange={(e) => setCustomProductPrice(e.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="tax">Tax Rate %</Label>
                              <Input
                                id="tax"
                                placeholder="8.5"
                                value={customProductTaxRate}
                                onChange={(e) => setCustomProductTaxRate(e.target.value)}
                                type="number"
                                min="0"
                                step="0.1"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button variant="outline" type="button" onClick={() => {
                            setCustomProductName("");
                            setCustomProductPrice("");
                            setCustomProductSku("");
                            setCustomProductTaxRate("8.5");
                          }}>
                            Cancel
                          </Button>
                          <Button type="button" onClick={addCustomProductToCart}>
                            Add to Cart
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {inventoryLoading ? (
                    <div className="flex justify-center items-center h-[400px]">
                      <p>Loading products...</p>
                    </div>
                  ) : filteredInventoryItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center">
                      <Package className="h-12 w-12 mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">No products found</p>
                      {searchQuery && (
                        <p className="text-sm text-muted-foreground">
                          Try a different search term or add a custom product
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredInventoryItems.map((item: InventoryItem) => (
                        <Card key={item.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => addToCart(item)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium">{item.name}</h3>
                                <p className="text-xs text-muted-foreground">{item.sku}</p>
                                {item.category && (
                                  <Badge variant="outline" className="mt-1">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {item.category}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(parseFloat(item.unitPrice))}</p>
                                {item.taxRate && (
                                  <p className="text-xs text-muted-foreground">
                                    +{item.taxRate}% tax
                                  </p>
                                )}
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Transaction History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                View and manage your recent transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex justify-center items-center h-[400px]">
                  <p>Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <BarChart4 className="h-12 w-12 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No transactions found</p>
                  <p className="text-sm text-muted-foreground">
                    Completed transactions will appear here
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: POSTransaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.transactionNumber}
                        </TableCell>
                        <TableCell>{transaction.clientId || "Walk-in"}</TableCell>
                        <TableCell>Item count will go here</TableCell>
                        <TableCell>{formatCurrency(parseFloat(transaction.totalAmount))}</TableCell>
                        <TableCell>
                          <Badge
                            variant={transaction.status === "COMPLETED" ? "default" : 
                                    transaction.status === "VOIDED" ? "destructive" : 
                                    "secondary"}
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
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
      
      {/* Payment Sheet */}
      <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Complete Payment</SheetTitle>
            <SheetDescription>
              Select payment method and complete the transaction
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex flex-col justify-between h-full py-4">
            <div>
              <div className="space-y-4 mt-4">
                <h3 className="font-medium">Payment Summary</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(taxTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="font-medium">Payment Method</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <Button
                        key={method.id}
                        variant={paymentMethod === method.id ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <method.icon className="h-4 w-4 mr-2" />
                        {method.name}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {selectedClient && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <h3 className="font-medium mb-2">Customer Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {selectedClient.name}</p>
                      {selectedClient.email && <p><strong>Email:</strong> {selectedClient.email}</p>}
                      {selectedClient.phone && <p><strong>Phone:</strong> {selectedClient.phone}</p>}
                      {selectedPet && (
                        <p><strong>Pet:</strong> {selectedPet.name} ({selectedPet.species})</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <SheetFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
              <Button
                className="w-full"
                disabled={createTransactionMutation.isPending}
                onClick={completeTransaction}
              >
                {createTransactionMutation.isPending ? (
                  <>Processing...</>
                ) : (
                  <>Complete Transaction</>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsPaymentSheetOpen(false)}
                disabled={createTransactionMutation.isPending}
              >
                Cancel
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}