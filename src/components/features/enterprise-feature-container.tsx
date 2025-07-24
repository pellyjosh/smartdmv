import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser } from '@/context/UserContext';

interface EnterpriseFeatureContainerProps {
  featureName: string;
  featureId: string;
  description?: string;
  children: ReactNode;
  className?: string;
  showUI?: boolean; // Whether to show the UI behind the overlay
}

/**
 * A container component that shows Enterprise tier feature content with reduced opacity
 * and an overlay message inviting users to upgrade to Enterprise tier
 */
export function EnterpriseFeatureContainer({
  featureName,
  featureId,
  description,
  children,
  className,
  showUI = true
}: EnterpriseFeatureContainerProps) {
  const { user, userPracticeId } = useUser();
  
  // TODO: Temporarily bypass all subscription checks during development
  // Just return the children directly - remove this when subscription system is implemented
  return <>{children}</>;
  
  // The code below is preserved for when subscription system is re-enabled
  
  // If loading, show minimal loading state
  // if (isLoading) {
  //   return (
  //     <div className="container py-10 flex items-center justify-center min-h-[60vh]">
  //       <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  //     </div>
  //   );
  // }
  
  // Superadmins get full access to all enterprise features
  // if (user?.role === 'SUPER_ADMIN') {
  //   console.log(`[EnterpriseFeatureContainer] SUPER_ADMIN user - bypassing restriction for ${featureId}`);
  //   return <>{children}</>;
  // }
  
  // If user has Enterprise tier, show the full content
  // if (hasEnterpriseTier()) {
  //   return <>{children}</>;
  // }
  
  // Otherwise show restricted content
  if (!showUI) {
    return (
      <Card className="border-purple-300 bg-purple-50 shadow-md max-w-3xl mx-auto mt-8">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-xl text-purple-700">{featureName} Feature</CardTitle>
          </div>
          <CardDescription className="text-purple-800 text-base mt-1">
            Enterprise Plan Required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            {description || `${featureName} is only available with the Enterprise subscription plan.`}
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/subscriptions">
            <Button className="gap-2">
              <Star className="h-5 w-5" />
              View Subscription Options
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
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
          <Card className="border-purple-300 bg-purple-50 shadow-xl relative">
            <div className="absolute -top-3 -left-3 bg-purple-300 p-2 rounded-full shadow-md">
              <Star className="h-6 w-6 text-purple-800" />
            </div>
            
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-purple-700 mt-2">{featureName}</CardTitle>
              <CardDescription className="text-purple-800 text-base mt-1">
                Enterprise Tier Feature
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <p className="text-gray-700">
                {description || `This feature is exclusively available with the Enterprise subscription plan. Get a preview of the interface below, and upgrade to unlock full functionality.`}
              </p>
            </CardContent>
            
            <CardFooter>
              <Link href="/subscriptions">
                <Button className="gap-2 bg-purple-500 hover:bg-purple-600">
                  <Star className="h-5 w-5" />
                  View Subscription Options
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
