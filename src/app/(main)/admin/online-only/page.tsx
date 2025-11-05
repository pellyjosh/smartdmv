"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  WifiOff,
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle,
  Globe,
  ArrowLeft,
  Calendar,
  FileEdit,
  Users,
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnlineOnlyPage() {
  const { isOnline } = useNetworkStatus();
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptedRoute = searchParams.get("route") || "";
  const [featureName, setFeatureName] = useState("");

  useEffect(() => {
    // Extract feature name from route
    // Check both query parameter and injected window variable (from service worker)
    let route = attemptedRoute;

    // If service worker injected the route, use that
    if (
      typeof window !== "undefined" &&
      (window as any).__OFFLINE_ATTEMPTED_ROUTE__
    ) {
      route = (window as any).__OFFLINE_ATTEMPTED_ROUTE__;
    }

    if (route) {
      const pathParts = route.split("/");
      const lastPart =
        pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
      const name = lastPart
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      setFeatureName(name);
    }
  }, [attemptedRoute]);

  // Auto-redirect when back online
  useEffect(() => {
    if (isOnline && attemptedRoute) {
      // Small delay to show the success message
      setTimeout(() => {
        router.push(attemptedRoute);
      }, 1500);
    }
  }, [isOnline, attemptedRoute, router]);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push("/administrator");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex justify-start">
          <Button
            onClick={handleGoBack}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Header */}
        <div className="text-center">
          {isOnline ? (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <Globe className="w-8 h-8 text-orange-600" />
            </div>
          )}

          {isOnline ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Connection Restored!
              </h1>
              <p className="text-gray-600">
                Great! You're back online. Redirecting you to{" "}
                {featureName || "your page"}...
              </p>
            </>
          ) : (
            <>
              <Badge variant="destructive" className="mb-4">
                <WifiOff className="w-4 h-4 mr-2" />
                Internet Connection Required
              </Badge>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {featureName || "This Feature"} Requires Internet Connection
              </h1>
              <p className="text-gray-600">
                This feature needs a real-time connection to work properly and
                cannot be accessed offline.
              </p>
            </>
          )}
        </div>

        {!isOnline && (
          <>
            {/* Explanation Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Why This Feature Requires Internet
                </CardTitle>
                <CardDescription>
                  {featureName || "This feature"} relies on services that need
                  an active internet connection
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <Alert>
                  <Globe className="h-4 w-4" />
                  <AlertTitle>Online-Only Feature</AlertTitle>
                  <AlertDescription>
                    This tool integrates with external systems, requires
                    real-time data processing, or uses cloud-based services that
                    aren't available in your offline cache.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Common reasons a feature requires internet:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>
                      External API integrations (lab systems, imaging providers)
                    </li>
                    <li>Real-time data aggregation and reporting</li>
                    <li>Payment processing and financial transactions</li>
                    <li>Cloud-based AI and machine learning features</li>
                    <li>Multi-user collaboration and live updates</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Offline Features Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Features Available Offline
                </CardTitle>
                <CardDescription>
                  You can still access these sections while offline
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">Appointments</p>
                    <p className="text-sm text-green-700">
                      View and create appointments
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">Patient Care</p>
                    <p className="text-sm text-green-700">
                      Clients, pets, health plans, and vaccinations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <FileEdit className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">
                      Medical Records
                    </p>
                    <p className="text-sm text-green-700">
                      SOAP notes, patient timeline, and checklists
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  💡 Use the sidebar to navigate to offline-supported features
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleRetry}
                className="flex-1"
                size="lg"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Reconnecting
              </Button>

              <Button onClick={handleGoBack} variant="outline" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>

              <Button onClick={handleGoHome} variant="outline" size="lg">
                Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
