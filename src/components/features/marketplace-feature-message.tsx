import React, { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { useQuery } from "@tanstack/react-query";
import { useRoles } from "@/hooks/use-roles";

// Hook to fetch addon slug dynamically from the database
const useAddonSlug = (addOnId: string | undefined) => {
  return useQuery({
    queryKey: ["addon-slug", addOnId],
    queryFn: async () => {
      if (!addOnId) return null;

      try {
        const response = await fetch(`/api/marketplace/addons`);
        if (!response.ok) {
          throw new Error("Failed to fetch addons");
        }

        const addons = await response.json();

        // Find the addon by ID or slug
        const addon = addons.find(
          (a: any) =>
            a.id?.toString() === addOnId ||
            a.slug === addOnId ||
            a.name?.toLowerCase().replace(/\s+/g, "-") === addOnId
        );

        return addon?.slug || addOnId;
      } catch (error) {
        console.error("Error fetching addon slug:", error);
        return addOnId; // Fallback to original ID
      }
    },
    enabled: !!addOnId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false,
  });
};

interface MarketplaceFeatureMessageProps {
  featureName: string;
  featureId: string;
  description?: string;
  addOnId?: string; // Optional ID to link directly to a specific add-on in marketplace
}

/**
 * A consistent UI component for displaying marketplace add-on restriction messages
 * Shows a message explaining the feature is only available as an add-on and
 * provides a direct link to the marketplace
 */
export function MarketplaceFeatureMessage({
  featureName,
  featureId,
  description,
  addOnId,
}: MarketplaceFeatureMessageProps) {
  const defaultDescription = `${featureName} is available as an add-on in the SmartDVM Marketplace. Purchase this add-on to unlock this feature.`;

  // Fetch the correct slug for navigation
  const { data: addonSlug, isLoading: isLoadingSlug } = useAddonSlug(addOnId);

  return (
    <Card className="border-yellow-300 bg-yellow-50 shadow-md max-w-3xl mx-auto mt-8">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-xl text-yellow-700">
            {featureName} Feature
          </CardTitle>
        </div>
        <CardDescription className="text-yellow-800 text-base mt-1">
          Marketplace Add-on Required
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">{description || defaultDescription}</p>
      </CardContent>
      <CardFooter>
        {isLoadingSlug ? (
          <Button disabled className="gap-2 bg-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Loading...
          </Button>
        ) : (
          <Link href={addonSlug ? `/marketplace/${addonSlug}` : "/marketplace"}>
            <Button className="gap-2">
              <ShoppingBag className="h-5 w-5" />
              View in Marketplace
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

interface MarketplaceFeatureContainerProps {
  featureName: string;
  featureId: string;
  description?: string;
  addOnId?: string;
  children: ReactNode;
  className?: string;
  showUI?: boolean; // Whether to show the UI behind the overlay
}

/**
 * A container component that shows marketplace feature content with reduced opacity
 * and an overlay message inviting users to purchase from marketplace
 */
export function MarketplaceFeatureContainer({
  featureName,
  featureId,
  description,
  addOnId,
  children,
  className,
  showUI = true,
}: MarketplaceFeatureContainerProps) {
  const { user } = useUser();

  // Get practiceId for the hook (coerce to number)
  const practiceId =
    Number(
      (user as any)?.practiceId || (user as any)?.currentPracticeId || 0
    ) || 0;
  const {
    isClient,
    isPracticeAdmin,
    isVeterinarian,
    isSuperAdminAssigned,
    isPracticeAdminAssigned,
  } = useRoles(practiceId);

  // Fetch the correct slug for navigation
  const { data: addonSlug, isLoading: isLoadingSlug } = useAddonSlug(addOnId);

  // Get the practice ID using dynamic role checks
  const assignedRoles =
    user && "roles" in user ? (user as any).roles : undefined;

  const hasPracticeRole = user
    ? isClient((user as any).role) ||
      isPracticeAdmin((user as any).role) ||
      isPracticeAdminAssigned(assignedRoles) ||
      isVeterinarian((user as any).role) ||
      (user as any).role === "PRACTICE_MANAGER" // Fallback for now as this role check isn't in hook yet
    : false;

  const hasAdminRole = user
    ? (user as any).role === "ADMINISTRATOR" ||
      (user as any).role === "SUPER_ADMIN" || // Both ADMINISTRATOR and SUPER_ADMIN have same access
      isSuperAdminAssigned(assignedRoles)
    : false;

  const userPracticeId = user
    ? hasPracticeRole
      ? (user as any).practiceId &&
        (user as any).practiceId.toString().trim() !== ""
        ? (user as any).practiceId
        : undefined
      : hasAdminRole
      ? (user as any).currentPracticeId &&
        (user as any).currentPracticeId.toString().trim() !== ""
        ? (user as any).currentPracticeId
        : undefined
      : undefined
    : undefined;

  // Fetch practice add-ons (user's subscriptions) to check if this addon is subscribed
  const {
    data: practiceAddons,
    isLoading: practiceAddonsLoading,
    error: practiceAddonsError,
  } = useQuery({
    queryKey: ["/api/marketplace/practice"],
    queryFn: async () => {
      const response = await fetch("/api/marketplace/practice");
      if (!response.ok)
        throw new Error("Failed to fetch practice subscriptions");
      return response.json();
    },
    enabled: !!user && !!userPracticeId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper to check if practice has subscribed to this specific add-on
  const hasSubscription = () => {
    console.log(
      `[MarketplaceFeatureContainer] Checking subscription for addOnId: ${addOnId}`
    );
    console.log(
      `[MarketplaceFeatureContainer] practiceAddons data:`,
      practiceAddons
    );
    console.log(
      `[MarketplaceFeatureContainer] isLoading:`,
      practiceAddonsLoading
    );
    console.log(`[MarketplaceFeatureContainer] error:`, practiceAddonsError);

    // If we don't have an addOnId, always deny access
    if (!addOnId) {
      console.log(
        `[MarketplaceFeatureContainer] No addOnId provided - returning false`
      );
      return false;
    }

    // If data is still loading or there's an error, deny access (fail closed)
    if (practiceAddonsLoading || practiceAddonsError) {
      console.log(
        `[MarketplaceFeatureContainer] Still loading or error - returning false`
      );
      return false;
    }

    // If there's no practice addons data or it's empty, deny access
    if (
      !practiceAddons ||
      !Array.isArray(practiceAddons) ||
      practiceAddons.length === 0
    ) {
      console.log(
        `[MarketplaceFeatureContainer] No practice addons found - returning false`
      );
      return false;
    }

    const hasActiveSubscription = practiceAddons.some((subscription: any) => {
      console.log(
        `[MarketplaceFeatureContainer] ===== Checking subscription:`,
        JSON.stringify(subscription, null, 2)
      );

      // Ensure we have a valid subscription object
      if (!subscription || !subscription.addon) {
        console.log(
          `[MarketplaceFeatureContainer] Invalid subscription object - skipping`
        );
        return false;
      }

      // Check if subscription is active
      if (!subscription.isActive) {
        console.log(
          `[MarketplaceFeatureContainer] Subscription not active (isActive: ${subscription.isActive}) - skipping`
        );
        return false;
      }

      // Check by addon slug/id - be more flexible with matching
      const addonSlug = subscription.addon.slug;
      const addonId = subscription.addon.id;
      const addonName = subscription.addon.name;

      const slugMatches = addonSlug === addOnId;
      const idMatches = addonId?.toString() === addOnId;
      const nameMatches =
        addonName?.toLowerCase().replace(/\s+/g, "-") === addOnId;

      const addonMatches = slugMatches || idMatches || nameMatches;

      console.log(`[MarketplaceFeatureContainer] ===== MATCHING DETAILS =====`);
      console.log(`[MarketplaceFeatureContainer] Addon slug: "${addonSlug}"`);
      console.log(`[MarketplaceFeatureContainer] Addon ID: "${addonId}"`);
      console.log(`[MarketplaceFeatureContainer] Addon name: "${addonName}"`);
      console.log(`[MarketplaceFeatureContainer] Looking for: "${addOnId}"`);
      console.log(`[MarketplaceFeatureContainer] Slug matches: ${slugMatches}`);
      console.log(`[MarketplaceFeatureContainer] ID matches: ${idMatches}`);
      console.log(`[MarketplaceFeatureContainer] Name matches: ${nameMatches}`);
      console.log(
        `[MarketplaceFeatureContainer] Overall match: ${addonMatches}`
      );
      console.log(
        `[MarketplaceFeatureContainer] Is active: ${subscription.isActive}`
      );
      console.log(`[MarketplaceFeatureContainer] ============================`);

      return addonMatches && subscription.isActive;
    });

    console.log(
      `[MarketplaceFeatureContainer] Final subscription result: ${hasActiveSubscription}`
    );
    return hasActiveSubscription;
  };

  console.log(`[MarketplaceFeatureContainer] User role: ${user?.role}`);
  console.log(
    `[MarketplaceFeatureContainer] Feature: ${featureName} (${featureId})`
  );
  console.log(
    `[MarketplaceFeatureContainer] userPracticeId: ${userPracticeId}`
  );

  // If no user, always show restriction
  if (!user) {
    console.log(`[MarketplaceFeatureContainer] No user - showing restriction`);
    return (
      <MarketplaceFeatureMessage
        featureName={featureName}
        featureId={featureId}
        description={description}
        addOnId={addOnId}
      />
    );
  }

  // If no practice ID, always show restriction
  if (!userPracticeId) {
    console.log(
      `[MarketplaceFeatureContainer] No practice ID - showing restriction`
    );
    return (
      <MarketplaceFeatureMessage
        featureName={featureName}
        featureId={featureId}
        description={description}
        addOnId={addOnId}
      />
    );
  }

  // Show loading state while checking subscriptions
  if (practiceAddonsLoading) {
    console.log(
      `[MarketplaceFeatureContainer] Still loading subscription data for ${featureId}`
    );
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  // Superadmins get full access to all marketplace features
  // TEMPORARILY DISABLED FOR TESTING
  // if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMINISTRATOR') {
  //   console.log(`[MarketplaceFeatureContainer] SUPER_ADMIN/ADMIN user - bypassing restriction for ${featureId}`);
  //   return <>{children}</>;
  // }

  // If user has subscribed to this addon, show the full functionality
  if (hasSubscription()) {
    console.log(
      `[MarketplaceFeatureContainer] User has subscription for ${featureId} - showing full functionality`
    );
    return <>{children}</>;
  }

  if (!showUI) {
    return (
      <MarketplaceFeatureMessage
        featureName={featureName}
        featureId={featureId}
        description={description}
        addOnId={addOnId}
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Feature UI with reduced opacity */}
      <div className="opacity-40 pointer-events-none">{children}</div>

      {/* Overlay for message */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
        <div className="w-full max-w-md px-4">
          <Card className="border-yellow-300 bg-yellow-50 shadow-xl relative">
            <div className="absolute -top-3 -left-3 bg-yellow-300 p-2 rounded-full shadow-md">
              <ShoppingBag className="h-6 w-6 text-yellow-800" />
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-yellow-700 mt-2">
                {featureName}
              </CardTitle>
              <CardDescription className="text-yellow-800 text-base mt-1">
                Marketplace Add-on Feature
              </CardDescription>
            </CardHeader>

            <CardContent>
              <p className="text-gray-700">
                {description ||
                  `This feature is available as an add-on in the SmartDVM Marketplace. Get a preview of the interface below, and purchase to unlock full functionality.`}
              </p>
            </CardContent>

            <CardFooter>
              {isLoadingSlug ? (
                <Button disabled className="gap-2 bg-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </Button>
              ) : (
                <Link
                  href={
                    addonSlug ? `/marketplace/${addonSlug}` : "/marketplace"
                  }
                >
                  <Button className="gap-2 bg-yellow-500 hover:bg-yellow-600">
                    <ShoppingBag className="h-5 w-5" />
                    View in Marketplace
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
