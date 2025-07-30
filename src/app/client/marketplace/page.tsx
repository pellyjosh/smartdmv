"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ArrowLeft, 
  CreditCard, 
  Check, 
  Star, 
  ShoppingCart, 
  Zap, 
  Shield, 
  Users, 
  MessageSquare, 
  Calendar,
  BarChart3,
  Smartphone,
  Brain,
  DollarSign,
  Heart
} from "lucide-react";
import Link from "next/link";
import { ClientHeader } from "@/components/client/ClientHeader";
import { cn } from "@/lib/utils";

const categoryIcons = {
  'CLIENT_PORTAL': Smartphone,
  'AI': Brain,
  'ADMINISTRATIVE': BarChart3,
  'COMMUNICATION': MessageSquare,
  'FINANCIAL': DollarSign,
};

const subscriptionTiers = [
  {
    id: 'BASIC',
    name: 'Basic',
    description: 'Essential features for small practices',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: ['Up to 100 clients', 'Basic reporting', 'Email support'],
    popular: false
  },
  {
    id: 'STANDARD',
    name: 'Standard',
    description: 'Advanced features for growing practices',
    monthlyPrice: 59,
    yearlyPrice: 590,
    features: ['Up to 500 clients', 'Advanced reporting', 'Priority support', 'API access'],
    popular: true
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    description: 'Complete solution for large practices',
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: ['Unlimited clients', 'Custom reporting', '24/7 support', 'White-label options'],
    popular: false
  }
];

export default function MarketplacePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('addons');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedAddonDetails, setSelectedAddonDetails] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });

  // Cart functions
  const addToCart = (addon: any, tier: string) => {
    const existingItem = cart.find(item => item.addonId === addon.id && item.tier === tier);
    if (existingItem) {
      toast({
        title: 'Already in Cart',
        description: 'This item is already in your cart.',
        variant: 'default'
      });
      return;
    }
    
    const cartItem = {
      addonId: addon.id,
      name: addon.name,
      addon,
      tier,
      price: selectedBilling === 'yearly' ? addon.pricingTiers[tier].price * 10 : addon.pricingTiers[tier].price,
      billing: selectedBilling,
      billingCycle: selectedBilling
    };
    setCart(prev => [...prev, cartItem]);
    toast({
      title: "Added to Cart",
      description: `${addon.name} (${tier}) has been added to your cart.`,
    });
  };

  const removeFromCart = (addonId: string, tier: string) => {
    setCart(prev => prev.filter(item => !(item.addonId === addonId && item.tier === tier)));
    toast({
      title: "Removed from Cart",
      description: "Item has been removed from your cart.",
    });
  };

  // Fetch available addons
  const { data: addons, isLoading: isLoadingAddons, error: addonsError } = useQuery({
    queryKey: ['/api/marketplace/addons'],
    queryFn: async () => {
      const response = await fetch('/api/marketplace/addons', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch addons');
      const data = await response.json();
      console.log('Fetched addons:', data);
      return data;
    },
    enabled: !!user && user.role === 'CLIENT'
  });

  console.log('Addons state:', { addons, isLoadingAddons, addonsError });

  // Fetch current subscriptions
  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useQuery({
    queryKey: ['/api/marketplace/subscriptions'],
    queryFn: async () => {
      const response = await fetch('/api/marketplace/subscriptions', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      return response.json();
    },
    enabled: !!user && user.role === 'CLIENT'
  });



  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => {
    const pricing = item.addon.pricingTiers?.[item.tier];
    if (pricing) {
      const price = selectedBilling === 'yearly' ? pricing.price * 10 : pricing.price; // 2 months free on yearly
      return total + price;
    }
    return total;
  }, 0);

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (cartItems: any[]) => {
      const response = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          items: cartItems,
          billingCycle: selectedBilling
        })
      });
      if (!response.ok) throw new Error('Failed to process checkout');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Subscription Activated!',
        description: 'Your new addons have been activated.',
      });
      setCart([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Failed to process payment. Please try again.',
        variant: 'destructive'
      });
    }
  });

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
        title="Marketplace"
        subtitle="Enhance your veterinary practice with premium addons"
        showBackButton={true}
        backHref="/client"
        backLabel="Back to Portal"
      />
      
      <div className="flex justify-end mb-6">
        {cart.length > 0 && (
          <Card className="w-80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={`${item.addonId}-${item.tier}`} className="flex justify-between items-center text-sm">
                    <span>{item.addon.name} ({item.tier})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.addonId, item.tier)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${cartTotal}/{selectedBilling === 'yearly' ? 'year' : 'month'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => checkoutMutation.mutate(cart)}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? 'Processing...' : 'Checkout'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="addons">Available Addons</TabsTrigger>
          <TabsTrigger value="subscriptions">My Subscriptions</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Available Addons */}
        <TabsContent value="addons">
          <div className="space-y-6">
            {/* Subscription Plans Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Subscription Plans</h2>
              
              {/* Billing Toggle */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant={selectedBilling === 'monthly' ? 'default' : 'outline'}
                      onClick={() => setSelectedBilling('monthly')}
                    >
                      Monthly Billing
                    </Button>
                    <Button
                      variant={selectedBilling === 'yearly' ? 'default' : 'outline'}
                      onClick={() => setSelectedBilling('yearly')}
                    >
                      Yearly Billing
                      <Badge variant="secondary" className="ml-2">2 months free</Badge>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Tiers */}
              <div className="grid gap-6 md:grid-cols-3">
                {subscriptionTiers.map((tier) => {
                  const price = selectedBilling === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
                  const monthlyEquivalent = selectedBilling === 'yearly' ? Math.round(tier.yearlyPrice / 12) : tier.monthlyPrice;
                  
                  return (
                    <Card key={tier.id} className={cn(
                      "relative",
                      tier.popular && "border-primary shadow-lg scale-105"
                    )}>
                      {tier.popular && (
                        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                          Most Popular
                        </Badge>
                      )}
                      
                      <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl">{tier.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{tier.description}</p>
                      </CardHeader>
                      
                      <CardContent className="text-center">
                        <div className="mb-4">
                          <div className="text-4xl font-bold">
                            ${price}
                            <span className="text-lg font-normal text-muted-foreground">
                              /{selectedBilling === 'yearly' ? 'year' : 'month'}
                            </span>
                          </div>
                          {selectedBilling === 'yearly' && (
                            <div className="text-sm text-green-600">
                              Save ${(tier.monthlyPrice * 12) - tier.yearlyPrice} per year!
                            </div>
                          )}
                        </div>
                        
                        <ul className="space-y-3 mb-6 text-sm">
                          {tier.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          variant={tier.popular ? 'default' : 'outline'}
                          onClick={() => {
                            toast({
                              title: "Subscription Started!",
                              description: `You've subscribed to the ${tier.name} plan.`,
                            });
                          }}
                        >
                          Subscribe to {tier.name}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Addons Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Premium Add-ons</h2>
              <p className="text-muted-foreground mb-6">
                Enhance your subscription with these specialized features and tools.
              </p>
            
              {/* Addons Grid */}
              {isLoadingAddons ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-96 w-full" />
                  ))}
                </div>
              ) : addonsError ? (
                <div className="text-center py-12">
                  <p className="text-red-600">Error loading addons: {addonsError.message}</p>
                </div>
              ) : !addons || addons.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No addons available at this time.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {addons?.map((addon: any) => {
                    const IconComponent = categoryIcons[addon.category as keyof typeof categoryIcons] || Heart;
                    
                    return (
                      <Card key={addon.id} className={cn(
                        "relative",
                        addon.isFeatured && "border-primary shadow-lg"
                      )}>
                        {addon.isPopular && (
                          <Badge className="absolute -top-2 left-4 bg-primary">
                            Popular
                          </Badge>
                        )}
                        
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <IconComponent className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{addon.name}</CardTitle>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedAddonDetails(addon)}
                                >
                                  Details
                                </Button>
                              </div>
                              <Badge variant="outline">{addon.category.replace('_', ' ')}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{addon.shortDescription}</p>
                        </CardHeader>
                        
                        <CardContent>
                          <p className="text-sm mb-4">{addon.description}</p>
                          
                          {/* Pricing Tiers */}
                          <div className="space-y-3">
                            {addon.pricingTiers && Object.entries(addon.pricingTiers).map(([tier, pricing]: [string, any]) => {
                              const price = selectedBilling === 'yearly' ? pricing.price * 10 : pricing.price;
                              const isInCart = cart.some(item => item.addonId === addon.id && item.tier === tier);
                              
                              return (
                                <div key={tier} className="border rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">{tier}</span>
                                    <span className="text-lg font-bold">
                                      ${price}/{selectedBilling === 'yearly' ? 'year' : 'month'}
                                    </span>
                                  </div>
                                  <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                                    {pricing.features?.map((feature: string, idx: number) => (
                                      <li key={idx} className="flex items-center gap-1">
                                        <Check className="h-3 w-3 text-green-500" />
                                        {feature}
                                      </li>
                                    ))}
                                  </ul>
                                  <Button
                                    size="sm"
                                    variant={isInCart ? "secondary" : "outline"}
                                    className="w-full"
                                    onClick={() => isInCart ? removeFromCart(addon.id, tier) : addToCart(addon, tier)}
                                  >
                                    {isInCart ? 'Remove from Cart' : 'Add to Cart'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* My Subscriptions */}
        <TabsContent value="subscriptions">
          <div className="space-y-6">
            {isLoadingSubscriptions ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : subscriptions?.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {subscriptions.map((subscription: any) => (
                  <Card key={subscription.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{subscription.addon.name}</CardTitle>
                          <Badge variant={subscription.paymentStatus === 'PAID' ? 'default' : 'destructive'}>
                            {subscription.paymentStatus}
                          </Badge>
                        </div>
                        <Badge variant="outline">{subscription.subscriptionTier}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Billing Cycle:</span>
                          <span className="capitalize">{subscription.billingCycle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start Date:</span>
                          <span>{new Date(subscription.startDate).toLocaleDateString()}</span>
                        </div>
                        {subscription.endDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">End Date:</span>
                            <span>{new Date(subscription.endDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1">
                            Manage Subscription
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manage Subscription</DialogTitle>
                            <DialogDescription>
                              Manage your {subscription.addon.name} subscription
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="p-4 border rounded-lg space-y-2">
                              <h4 className="font-medium">{subscription.addon.name}</h4>
                              <div className="text-sm text-muted-foreground">
                                <div>Plan: {subscription.subscriptionTier}</div>
                                <div>Billing: {subscription.billingCycle}</div>
                                <div>Status: {subscription.paymentStatus}</div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Change Plan</Label>
                              <Select defaultValue={subscription.subscriptionTier}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="BASIC">Basic - $29/month</SelectItem>
                                  <SelectItem value="STANDARD">Standard - $59/month</SelectItem>
                                  <SelectItem value="PREMIUM">Premium - $99/month</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Billing Cycle</Label>
                              <Select defaultValue={subscription.billingCycle}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="yearly">Yearly (2 months free)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <DialogFooter className="flex-col gap-2">
                            <div className="flex gap-2 w-full">
                              <DialogClose asChild>
                                <Button variant="outline" className="flex-1">Cancel</Button>
                              </DialogClose>
                              <Button className="flex-1">Save Changes</Button>
                            </div>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="w-full"
                              onClick={() => {
                                toast({
                                  title: "Subscription Cancelled",
                                  description: `Your ${subscription.addon.name} subscription has been cancelled.`,
                                  variant: "destructive"
                                });
                              }}
                            >
                              Cancel Subscription
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveTab('billing')}
                      >
                        View Billing
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Active Subscriptions</h3>
                  <p className="text-muted-foreground mb-4">
                    Browse our addons to enhance your practice capabilities.
                  </p>
                  <Button onClick={() => setActiveTab('addons')}>
                    Browse Addons
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <CreditCard className="h-4 w-4" />
                      <span>•••• •••• •••• 4242</span>
                      <Badge variant="outline">Expires 12/2026</Badge>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Next Billing Date:</span>
                    <div className="mt-1">August 30, 2025</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Update Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Update Payment Method</DialogTitle>
                      <DialogDescription>
                        Update your payment information for marketplace subscriptions.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Card Information */}
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
                      
                      {/* Billing Address */}
                      <div className="space-y-4 border-t pt-4">
                        <h4 className="font-medium">Billing Address</h4>
                        
                        <div className="space-y-2">
                          <Label htmlFor="street">Street Address</Label>
                          <Input
                            id="street"
                            placeholder="123 Main St"
                            value={paymentForm.billingAddress.street}
                            onChange={(e) => setPaymentForm({
                              ...paymentForm, 
                              billingAddress: {...paymentForm.billingAddress, street: e.target.value}
                            })}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              placeholder="New York"
                              value={paymentForm.billingAddress.city}
                              onChange={(e) => setPaymentForm({
                                ...paymentForm, 
                                billingAddress: {...paymentForm.billingAddress, city: e.target.value}
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Select 
                              value={paymentForm.billingAddress.state}
                              onValueChange={(value) => setPaymentForm({
                                ...paymentForm, 
                                billingAddress: {...paymentForm.billingAddress, state: value}
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CA">California</SelectItem>
                                <SelectItem value="NY">New York</SelectItem>
                                <SelectItem value="TX">Texas</SelectItem>
                                <SelectItem value="FL">Florida</SelectItem>
                                {/* Add more states as needed */}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="zipCode">ZIP Code</Label>
                            <Input
                              id="zipCode"
                              placeholder="10001"
                              value={paymentForm.billingAddress.zipCode}
                              onChange={(e) => setPaymentForm({
                                ...paymentForm, 
                                billingAddress: {...paymentForm.billingAddress, zipCode: e.target.value}
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Select 
                              value={paymentForm.billingAddress.country}
                              onValueChange={(value) => setPaymentForm({
                                ...paymentForm, 
                                billingAddress: {...paymentForm.billingAddress, country: value}
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="GB">United Kingdom</SelectItem>
                                <SelectItem value="AU">Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button 
                        onClick={() => {
                          toast({
                            title: "Payment Method Updated",
                            description: "Your payment method has been successfully updated.",
                          });
                          setShowPaymentDialog(false);
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Update Payment Method
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { id: 'INV-001', date: '2025-07-30', amount: 59, status: 'Paid' },
                    { id: 'INV-002', date: '2025-06-30', amount: 59, status: 'Paid' },
                    { id: 'INV-003', date: '2025-05-30', amount: 59, status: 'Paid' },
                  ].map((invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div>
                        <div className="font-medium">{invoice.id}</div>
                        <div className="text-sm text-muted-foreground">{invoice.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${invoice.amount}</div>
                        <Badge variant="outline" className="text-xs">
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Addon Details Dialog */}
      <Dialog open={!!selectedAddonDetails} onOpenChange={() => setSelectedAddonDetails(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          {selectedAddonDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {(() => {
                      const IconComponent = categoryIcons[selectedAddonDetails.category as keyof typeof categoryIcons] || Heart;
                      return <IconComponent className="h-6 w-6 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedAddonDetails.name}</DialogTitle>
                    <Badge variant="outline">{selectedAddonDetails.category.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{selectedAddonDetails.description}</p>
                </div>
                
                {/* Features */}
                {selectedAddonDetails.features && selectedAddonDetails.features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Key Features</h3>
                    <div className="grid gap-2">
                      {selectedAddonDetails.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Pricing Tiers */}
                {selectedAddonDetails.pricingTiers && Object.keys(selectedAddonDetails.pricingTiers).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Pricing Plans</h3>
                    <div className="grid gap-4">
                      {Object.entries(selectedAddonDetails.pricingTiers).map(([tier, pricing]: [string, any]) => {
                        const price = selectedBilling === 'yearly' ? pricing.price * 10 : pricing.price;
                        const isInCart = cart.some(item => item.addonId === selectedAddonDetails.id && item.tier === tier);
                        
                        return (
                          <div key={tier} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium text-lg">{tier}</h4>
                                <p className="text-2xl font-bold">
                                  ${price}
                                  <span className="text-sm font-normal text-muted-foreground">
                                    /{selectedBilling === 'yearly' ? 'year' : 'month'}
                                  </span>
                                </p>
                                {selectedBilling === 'yearly' && (
                                  <p className="text-sm text-green-600">Save 2 months!</p>
                                )}
                              </div>
                              <Button
                                variant={isInCart ? "secondary" : "default"}
                                onClick={() => isInCart ? removeFromCart(selectedAddonDetails.id, tier) : addToCart(selectedAddonDetails, tier)}
                              >
                                {isInCart ? 'Remove from Cart' : 'Add to Cart'}
                              </Button>
                            </div>
                            
                            {pricing.features && (
                              <div>
                                <h5 className="font-medium text-sm mb-2">What's included:</h5>
                                <ul className="space-y-1">
                                  {pricing.features.map((feature: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Check className="h-3 w-3 text-green-500" />
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                  <Label htmlFor="billing-toggle">Billing Cycle:</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={selectedBilling === 'monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedBilling('monthly')}
                    >
                      Monthly
                    </Button>
                    <Button 
                      variant={selectedBilling === 'yearly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedBilling('yearly')}
                    >
                      Yearly
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
