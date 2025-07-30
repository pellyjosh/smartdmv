'use client';

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
  
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [cart, setCart] = useState<any[]>([]);

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

  // Add to cart
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
    
    setCart([...cart, {
      addonId: addon.id,
      addon,
      tier,
      billingCycle: selectedBilling
    }]);
    
    toast({
      title: 'Added to Cart',
      description: `${addon.name} (${tier}) added to cart.`,
    });
  };

  // Remove from cart
  const removeFromCart = (addonId: string, tier: string) => {
    setCart(cart.filter(item => !(item.addonId === addonId && item.tier === tier)));
  };

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

      <Tabs defaultValue="addons" className="space-y-6">
        <TabsList>
          <TabsTrigger value="addons">Available Addons</TabsTrigger>
          <TabsTrigger value="subscriptions">My Subscriptions</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Available Addons */}
        <TabsContent value="addons">
          <div className="space-y-6">
            {/* Billing Toggle */}
            <Card>
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
                          <div>
                            <CardTitle className="text-lg">{addon.name}</CardTitle>
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
                    <CardFooter>
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Subscription
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
                  <Button onClick={() => (document.querySelector('[value="addons"]') as HTMLElement)?.click()}>
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
                <Button variant="outline" className="w-full">
                  Update Payment Method
                </Button>
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
    </div>
  );
}
