"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ShoppingCart,
  Star,
  StarHalf,
  Download,
  Check,
  Shield,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import {
  isPracticeAdministrator,
  isVeterinarian,
  isAdmin,
} from "@/lib/rbac-helpers";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AddonCategory } from "@/db/schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const MarketplacePage = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedAddon, setSelectedAddon] = useState<number | null>(null);
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] =
    useState<string>("monthly");
  const [addonToSubscribe, setAddonToSubscribe] = useState<any>(null);

  // Get the practice ID similar to how it's done in UserContext
  const userPracticeId = user
    ? isPracticeAdministrator(user as any) ||
      isVeterinarian(user as any) ||
      (user as any).role === "CLIENT"
      ? (user as any).practiceId &&
        (user as any).practiceId.toString().trim() !== ""
        ? (user as any).practiceId
        : undefined
      : isAdmin(user as any)
      ? (user as any).currentPracticeId &&
        (user as any).currentPracticeId.toString().trim() !== ""
        ? (user as any).currentPracticeId
        : undefined
      : undefined
    : undefined;

  // Fetch all add-ons
  const { data: addons, isLoading: addonsLoading } = useQuery({
    queryKey: ["/api/marketplace/addons"],
    queryFn: async () => {
      const response = await fetch("/api/marketplace/addons", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch add-ons");
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  // Fetch featured add-ons
  const { data: featuredAddons, isLoading: featuredLoading } = useQuery({
    queryKey: ["/api/marketplace/addons/featured"],
    queryFn: async () => {
      const response = await fetch("/api/marketplace/addons/featured", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch featured add-ons");
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  // Fetch practice add-ons (user's subscriptions)
  const { data: practiceAddons, isLoading: practiceAddonsLoading } = useQuery({
    queryKey: ["/api/marketplace/practice"],
    queryFn: async () => {
      const response = await fetch("/api/marketplace/practice");
      if (!response.ok)
        throw new Error("Failed to fetch practice subscriptions");
      return response.json();
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  // Helper to check if practice has subscribed to an add-on
  const hasSubscription = (addonId: number) => {
    const hasActiveSubscription = Array.isArray(practiceAddons)
      ? practiceAddons.some(
          (subscription: any) =>
            subscription.addonId === addonId && subscription.isActive
        )
      : false;

    // Log subscription status for debugging
    console.log(
      `Checking subscription for addon ${addonId}: ${hasActiveSubscription}`
    );
    if (hasActiveSubscription) {
      console.log(`Active subscription found for addon ${addonId}`);
    }

    return hasActiveSubscription;
  };

  // Get pricing for an add-on
  const getAddonPricing = (addon: any) => {
    if (!addon) return { monthly: "0.00", yearly: "0.00" };

    let pricing = { monthly: "0.00", yearly: "0.00" };

    // Check if addon has pricingTiers (new format)
    if (addon.pricingTiers) {
      let pricingTiers;
      if (typeof addon.pricingTiers === "string") {
        try {
          pricingTiers = JSON.parse(addon.pricingTiers);
        } catch (e) {
          pricingTiers = {};
        }
      } else {
        pricingTiers = addon.pricingTiers;
      }

      if (pricingTiers.STANDARD) {
        pricing.monthly =
          pricingTiers.STANDARD.monthlyPrice || addon.price || "0.00";
        pricing.yearly =
          pricingTiers.STANDARD.yearlyPrice ||
          (parseFloat(pricing.monthly) * 10).toFixed(2);
      }
    }
    // Fallback to legacy price
    else if (addon.price) {
      pricing.monthly = addon.price;
      pricing.yearly = (parseFloat(addon.price) * 10).toFixed(2); // 10x monthly for yearly (slight discount)
    }

    return pricing;
  };

  // Open subscription dialog
  const openSubscribeDialog = (addon: any) => {
    if (!userPracticeId) {
      toast({
        title: "Error",
        description:
          "You need to be associated with a practice to subscribe to add-ons.",
        variant: "destructive",
      });
      return;
    }

    // Check if already subscribed
    if (hasSubscription(addon.id)) {
      toast({
        title: "Already Subscribed",
        description: "This add-on is already installed for your practice.",
      });
      return;
    }

    setAddonToSubscribe(addon);
    setSelectedBillingCycle("monthly");
    setIsSubscribeDialogOpen(true);
  };

  // Handle subscribing to an add-on
  const handleSubscribe = async () => {
    if (!userPracticeId || !addonToSubscribe) {
      setIsSubscribeDialogOpen(false);
      return;
    }

    setSelectedAddon(addonToSubscribe.id);
    setIsSubscribeDialogOpen(false);

    try {
      await apiRequest(
        "POST",
        `/api/marketplace/practice/${userPracticeId}/subscribe`,
        {
          addonId: addonToSubscribe.id,
          tier: "STANDARD",
          billingCycle: selectedBillingCycle,
        }
      );

      // Invalidate practice add-ons query to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["/api/marketplace/practice"],
      });

      // Also refresh all add-ons to update UI state
      queryClient.invalidateQueries({
        queryKey: ["/api/marketplace/addons"],
      });

      toast({
        title: "Success",
        description: `Successfully subscribed to the add-on with ${selectedBillingCycle} billing.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe to the add-on.",
        variant: "destructive",
      });
    }

    setSelectedAddon(null);
    setAddonToSubscribe(null);
  };

  // Handle canceling a subscription
  const handleCancel = async (addonId: number) => {
    if (!userPracticeId) {
      return;
    }

    setSelectedAddon(addonId);

    try {
      await apiRequest(
        "POST",
        `/api/marketplace/practice/${userPracticeId}/cancel`,
        {
          addonId,
        }
      );

      // Invalidate practice add-ons query to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["/api/marketplace/practice"],
      });

      // Also refresh all add-ons to update UI state
      queryClient.invalidateQueries({
        queryKey: ["/api/marketplace/addons"],
      });

      toast({
        title: "Success",
        description: "Successfully canceled the add-on subscription.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel the add-on subscription.",
        variant: "destructive",
      });
    }

    setSelectedAddon(null);
  };

  // Helper function to get category label
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case AddonCategory.CLIENT_PORTAL:
        return "Client Portal";
      case AddonCategory.AI:
        return "AI";
      case AddonCategory.ADMINISTRATIVE:
        return "Admin";
      case AddonCategory.COMMUNICATION:
        return "Communication";
      case AddonCategory.FINANCIAL:
        return "Financial";
      default:
        return category;
    }
  };

  // Filter add-ons by category
  const filteredAddons = Array.isArray(addons)
    ? addons.filter((addon: any) => {
        if (activeCategory === "all") return true;
        if (activeCategory === "installed") {
          return hasSubscription(addon.id);
        }
        return addon.category === activeCategory;
      })
    : [];

  // Render stars for rating
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className="w-4 h-4 fill-yellow-400 text-yellow-400"
        />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarHalf
          key="half"
          className="w-4 h-4 fill-yellow-400 text-yellow-400"
        />
      );
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  if (addonsLoading || featuredLoading || practiceAddonsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-4">SmartDVM Marketplace</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Extend your SmartDVM experience with powerful add-ons and integrations
      </p>

      {/* Featured Add-ons */}
      {featuredAddons && featuredAddons.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Featured Add-ons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredAddons.map((addon: any) => {
              const pricing = getAddonPricing(addon);
              return (
                <Card
                  key={addon.id}
                  className="overflow-hidden border-2 border-primary/20"
                >
                  {addon.coverImage && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={addon.coverImage}
                        alt={addon.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{addon.name}</CardTitle>
                      <Badge variant={addon.isPopular ? "default" : "outline"}>
                        {getCategoryLabel(addon.category)}
                      </Badge>
                    </div>
                    <CardDescription>{addon.shortDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-2">
                      {renderRating(4.5)}
                      <span className="ml-2 text-sm text-muted-foreground">
                        4.5 (24 reviews)
                      </span>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm flex justify-between">
                        <span>Monthly:</span>
                        <span className="font-semibold">
                          ${pricing.monthly}
                        </span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span>Yearly:</span>
                        <span className="font-semibold">${pricing.yearly}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {addon.features &&
                        addon.features
                          .slice(0, 3)
                          .map((feature: string, i: number) => (
                            <Badge
                              variant="outline"
                              key={i}
                              className="flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              {feature}
                            </Badge>
                          ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {hasSubscription(addon.id) ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={true}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Subscribed
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => openSubscribeDialog(addon)}
                        disabled={selectedAddon === addon.id}
                      >
                        {selectedAddon === addon.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Subscribe
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Separator className="my-8" />

      {/* All Add-ons with Category Tabs */}
      <Tabs
        defaultValue="all"
        value={activeCategory}
        onValueChange={setActiveCategory}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Browse Add-ons</h2>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="installed">Subscribed</TabsTrigger>
            <TabsTrigger value={AddonCategory.CLIENT_PORTAL}>
              Client Portal
            </TabsTrigger>
            <TabsTrigger value={AddonCategory.AI}>AI</TabsTrigger>
            <TabsTrigger value={AddonCategory.ADMINISTRATIVE}>
              Administrative
            </TabsTrigger>
            <TabsTrigger value={AddonCategory.COMMUNICATION}>
              Communication
            </TabsTrigger>
            <TabsTrigger value={AddonCategory.FINANCIAL}>Financial</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeCategory}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAddons?.length > 0 ? (
              filteredAddons.map((addon: any) => {
                const pricing = getAddonPricing(addon);
                return (
                  <Card key={addon.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>{addon.name}</CardTitle>
                        <Badge variant="outline">
                          {getCategoryLabel(addon.category)}
                        </Badge>
                      </div>
                      <CardDescription>
                        {addon.shortDescription}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center mb-2">
                        {renderRating(4)}
                        <span className="ml-2 text-sm text-muted-foreground">
                          4.0 (16 reviews)
                        </span>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm flex justify-between">
                          <span>Monthly:</span>
                          <span className="font-semibold">
                            ${pricing.monthly}
                          </span>
                        </p>
                        <p className="text-sm flex justify-between">
                          <span>Yearly:</span>
                          <span className="font-semibold">
                            ${pricing.yearly}
                          </span>
                        </p>
                      </div>
                      {addon.features && addon.features.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold mb-2">
                            Key Features
                          </h4>
                          <ul className="text-sm space-y-1">
                            {addon.features
                              .slice(0, 3)
                              .map((feature: string, i: number) => (
                                <li key={i} className="flex items-start">
                                  <Check className="h-4 w-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      {hasSubscription(addon.id) ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={true}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Subscribed
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => openSubscribeDialog(addon)}
                          disabled={selectedAddon === addon.id}
                        >
                          {selectedAddon === addon.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Subscribe
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-3 py-12 flex flex-col items-center justify-center text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No add-ons found</h3>
                <p className="text-muted-foreground mt-1">
                  {activeCategory === "installed"
                    ? "You haven't subscribed to any add-ons yet. Browse the marketplace to find add-ons for your practice."
                    : "No add-ons found in this category. Check back later for new additions."}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Separator className="my-8" />

      {/* Subscription Management Notice */}
      <div className="mt-10 mb-12 flex flex-col md:flex-row items-center justify-between p-6 bg-muted/30 rounded-lg border">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <CreditCard className="h-10 w-10 text-primary" />
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold">Manage Your Subscriptions</h3>
            <p className="text-muted-foreground">
              View and manage your add-on subscriptions in the Practice Billing
              section
            </p>
          </div>
        </div>
        <Button
          className="mt-4 md:mt-0"
          variant="outline"
          onClick={() => (window.location.href = "/practice-billing")}
        >
          Manage Subscriptions
        </Button>
      </div>

      {/* Subscription Dialog */}
      <Dialog
        open={isSubscribeDialogOpen}
        onOpenChange={setIsSubscribeDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Choose Subscription Plan</DialogTitle>
          </DialogHeader>
          {addonToSubscribe && (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">
                  {addonToSubscribe.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {addonToSubscribe.shortDescription}
                </p>
              </div>

              <RadioGroup
                value={selectedBillingCycle}
                onValueChange={setSelectedBillingCycle}
                className="space-y-4"
              >
                <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="font-medium">
                      Monthly
                    </Label>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold">
                      ${getAddonPricing(addonToSubscribe).monthly}
                    </div>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                </div>

                <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <div>
                      <Label htmlFor="yearly" className="font-medium">
                        Yearly
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Save approximately 20%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold">
                      ${getAddonPricing(addonToSubscribe).yearly}
                    </div>
                    <p className="text-xs text-muted-foreground">per year</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubscribeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubscribe}>Subscribe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplacePage;
