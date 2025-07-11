import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";

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
  addOnId
}: MarketplaceFeatureMessageProps) {
  const defaultDescription = `${featureName} is available as an add-on in the SmartDVM Marketplace. Purchase this add-on to unlock this feature.`;

  return (
    <Card className="border-yellow-300 bg-yellow-50 shadow-md max-w-3xl mx-auto mt-8">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-xl text-yellow-700">{featureName} Feature</CardTitle>
        </div>
        <CardDescription className="text-yellow-800 text-base mt-1">
          Marketplace Add-on Required
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">
          {description || defaultDescription}
        </p>
      </CardContent>
      <CardFooter>
        <Link href={addOnId ? `/marketplace/${addOnId}` : "/marketplace"}>
          <Button className="gap-2" >
            <ShoppingBag className="h-5 w-5" />
            View in Marketplace
          </Button>
        </Link>
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
  showUI = true
}: MarketplaceFeatureContainerProps) {
  const { user } = useUser();
  
  // Superadmins get full access to all marketplace features
  if (user?.role === 'SUPER_ADMIN') {
    console.log(`[MarketplaceFeatureContainer] SUPER_ADMIN user - bypassing restriction for ${featureId}`);
    return <>{children}</>;
  }
  
  if (!showUI) {
    return <MarketplaceFeatureMessage 
      featureName={featureName} 
      featureId={featureId} 
      description={description} 
      addOnId={addOnId} 
    />;
  }
  
  return (
    <div className={cn("relative", className)}>
      {/* Feature UI with reduced opacity */}
      <div className="opacity-40 pointer-events-none">
        {children}
      </div>
      
      {/* Overlay for message */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
        <div className="w-full max-w-md px-4">
          <Card className="border-yellow-300 bg-yellow-50 shadow-xl relative">
            <div className="absolute -top-3 -left-3 bg-yellow-300 p-2 rounded-full shadow-md">
              <ShoppingBag className="h-6 w-6 text-yellow-800" />
            </div>
            
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-yellow-700 mt-2">{featureName}</CardTitle>
              <CardDescription className="text-yellow-800 text-base mt-1">
                Marketplace Add-on Feature
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <p className="text-gray-700">
                {description || `This feature is available as an add-on in the SmartDVM Marketplace. Get a preview of the interface below, and purchase to unlock full functionality.`}
              </p>
            </CardContent>
            
            <CardFooter>
              <Link href={addOnId ? `/marketplace/${addOnId}` : "/marketplace"}>
                <Button className="gap-2 bg-yellow-500 hover:bg-yellow-600">
                  <ShoppingBag className="h-5 w-5" />
                  View in Marketplace
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
