"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { WifiOff, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNetworkStatus } from "@/hooks/use-network-status";

interface OfflineUnavailablePageProps {
  featureName: string;
  message?: string;
  onRetry?: () => void;
}

export function OfflineUnavailablePage({
  featureName,
  message = "This feature requires an internet connection and cannot be accessed offline.",
  onRetry,
}: OfflineUnavailablePageProps) {
  const router = useRouter();
  const { isOnline, isTransitioning } = useNetworkStatus();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      router.refresh();
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Feature Unavailable Offline
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {featureName}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">{message}</AlertDescription>
          </Alert>

          <div className="pt-2">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
              What you can do:
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Connect to the internet to access this feature</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>
                  Use offline-compatible features from the sidebar menu
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>
                  Any changes you make elsewhere will sync when you're back
                  online
                </span>
              </li>
            </ul>
          </div>

          {isOnline && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <AlertDescription className="text-green-800 dark:text-green-300 text-sm">
                ✓ You're now online! You can retry accessing this feature.
              </AlertDescription>
            </Alert>
          )}

          {isTransitioning && (
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
                ⚡ Connection status changing...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleGoBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button
            onClick={handleRetry}
            disabled={!isOnline && !isTransitioning}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isOnline ? "Retry" : "Waiting for connection..."}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
