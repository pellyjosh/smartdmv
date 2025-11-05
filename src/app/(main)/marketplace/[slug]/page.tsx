"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Check,
  Star,
  DollarSign,
  Shield,
  Users,
  Clock,
  BarChart3,
  Brain,
  Smartphone,
  MessageSquare,
  Heart,
  CreditCard,
} from "lucide-react";
import Link from "next/link";

// Icon mapping for add-ons
const iconMap = {
  BarChart3: BarChart3,
  Brain: Brain,
  Smartphone: Smartphone,
  MessageSquare: MessageSquare,
  DollarSign: DollarSign,
  Heart: Heart,
};

interface Addon {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  price: string;
  icon: string;
  features: string[];
  isPopular: boolean;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AddonDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userPracticeId } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] =
    useState<string>("monthly");
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);

  const slug = params.slug as string;

  // Fetch specific add-on by slug
  const {
    data: addon,
    isLoading: addonLoading,
    error,
  } = useQuery<Addon>({
    queryKey: [`/api/marketplace/addons/${slug}`],
    queryFn: async () => {
      const response = await fetch(`/api/marketplace/addons/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Add-on not found");
        }
        throw new Error("Failed to fetch add-on details");
      }
      return response.json();
    },
  });

  // Fetch practice add-ons (subscriptions)
  const { data: practiceAddons } = useQuery({
    queryKey: ["/api/marketplace/practice"],
    queryFn: async () => {
      const response = await fetch("/api/marketplace/practice");
      if (!response.ok)
        throw new Error("Failed to fetch practice subscriptions");
      return response.json();
    },
    enabled: !!user && !!userPracticeId,
  });

  // Check if already subscribed
  const isSubscribed =
    practiceAddons?.some(
      (subscription: any) =>
        subscription.addon?.slug === slug && subscription.isActive
    ) || false;

  // Subscribe to add-on mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!userPracticeId || !addon) {
        throw new Error("Missing practice ID or add-on information");
      }

      const response = await fetch(
        `/api/marketplace/practice/${userPracticeId}/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            addonId: addon.id,
            tier: "STANDARD",
            billingCycle: selectedBillingCycle,
          }),
        }
      );

      const data = await response.json();

      // If payment requires redirect (Paystack, etc)
      if (response.status === 202 && data.paymentUrl) {
        return { requiresRedirect: true, paymentUrl: data.paymentUrl, data };
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to subscribe to add-on");
      }

      return { requiresRedirect: false, data };
    },
    onSuccess: (result) => {
      // Handle payment redirect
      if (result.requiresRedirect && result.paymentUrl) {
        toast({
          title: "Redirecting to Payment",
          description: "You'll be redirected to complete your payment...",
        });

        // Redirect to payment gateway
        setTimeout(() => {
          window.location.href = result.paymentUrl;
        }, 1500);
        return;
      }

      // Payment succeeded immediately
      toast({
        title: "Subscription Successful",
        description: `You've successfully subscribed to ${addon?.name} with ${selectedBillingCycle} billing!`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/marketplace/practice"],
      });
      setIsSubscribing(false);
      setIsSubscribeDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSubscribing(false);
      setIsSubscribeDialogOpen(false);
    },
  });

  const handleSubscribe = () => {
    setIsSubscribing(true);
    setIsSubscribeDialogOpen(false);
    subscribeMutation.mutate();
  };

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!userPracticeId || !addon) {
        throw new Error("Missing practice ID or add-on information");
      }

      const response = await fetch(
        `/api/marketplace/practice/${userPracticeId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            addonId: addon.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: `You've successfully cancelled your subscription to ${addon?.name}.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/marketplace/practice"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCancel = () => {
    cancelMutation.mutate();
  };

  if (addonLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !addon) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Add-on Not Found</CardTitle>
            <CardDescription className="text-center">
              The requested add-on could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/marketplace">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const IconComponent = iconMap[addon.icon as keyof typeof iconMap] || Heart;
  const features = Array.isArray(addon.features)
    ? addon.features
    : JSON.parse(addon.features || "[]");

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/marketplace"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Link>

        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center">
              <IconComponent className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{addon.name}</h1>
              {addon.isPopular && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800"
                >
                  <Star className="mr-1 h-3 w-3" />
                  Popular
                </Badge>
              )}
              {isSubscribed && (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Subscribed
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-lg mb-4">
              {addon.shortDescription}
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-muted-foreground mr-1" />
                <span className="text-2xl font-bold">${addon.price}</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <Badge variant="outline">
                {addon.category.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About This Add-on</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {addon.description}
                  </p>
                </CardContent>
              </Card>

              {addon.coverImage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={addon.coverImage}
                      alt={`${addon.name} preview`}
                      className="w-full rounded-lg border"
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="features" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Features</CardTitle>
                  <CardDescription>
                    Everything included with this add-on
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Details</CardTitle>
                  <CardDescription>
                    Simple, transparent pricing for your practice
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-4 border rounded-lg px-4">
                    <div>
                      <h3 className="font-semibold">{addon.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Monthly subscription
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${addon.price}</div>
                      <div className="text-sm text-muted-foreground">
                        per month
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Cancel anytime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Unlimited users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>24/7 support included</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Add this feature to your practice today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubscribed ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold text-green-700">
                      Already Subscribed
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      You have access to this add-on
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cancelling...
                      </>
                    ) : (
                      "Cancel Subscription"
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center py-2">
                    <div className="text-3xl font-bold">${addon.price}</div>
                    <div className="text-muted-foreground">per month</div>
                  </div>

                  <Dialog
                    open={isSubscribeDialogOpen}
                    onOpenChange={setIsSubscribeDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={isSubscribing || subscribeMutation.isPending}
                      >
                        {isSubscribing || subscribeMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Subscribing...
                          </>
                        ) : (
                          "Subscribe Now"
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Choose Billing Cycle</DialogTitle>
                        <DialogDescription>
                          Select how you'd like to be billed for {addon.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <RadioGroup
                          value={selectedBillingCycle}
                          onValueChange={setSelectedBillingCycle}
                          className="space-y-3"
                        >
                          <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
                            <RadioGroupItem value="monthly" id="monthly" />
                            <Label
                              htmlFor="monthly"
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">Monthly</div>
                                  <div className="text-sm text-muted-foreground">
                                    Billed every month
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">
                                    ${addon.price}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    /month
                                  </div>
                                </div>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
                            <RadioGroupItem value="yearly" id="yearly" />
                            <Label
                              htmlFor="yearly"
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    Yearly
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Save 17%
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Billed annually
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">
                                    ${(parseFloat(addon.price) * 10).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    /year
                                  </div>
                                </div>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>

                        <div className="rounded-lg bg-muted p-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="font-medium">Secure Payment</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Your payment information is encrypted and secure.
                            Cancel anytime.
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleSubscribe}
                          disabled={
                            isSubscribing || subscribeMutation.isPending
                          }
                          className="w-full"
                        >
                          {isSubscribing || subscribeMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Continue to Payment
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span>{addon.category.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Features:</span>
                  <span>{features.length} included</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Have questions about this add-on? Our support team is here to
                help.
              </p>
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
