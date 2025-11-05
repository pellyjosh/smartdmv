"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  WifiOff,
  RefreshCw,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Cloud,
  ArrowLeft
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const { isOnline, wasOnline } = useNetworkStatus();
  const router = useRouter();
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetry, setLastRetry] = useState<Date | null>(null);

  // Auto-redirect when back online
  useEffect(() => {
    if (isOnline && wasOnline === false) {
      // Small delay to show the success message
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  }, [isOnline, wasOnline, router]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLastRetry(new Date());

    // Force a page reload to try connecting again
    window.location.reload();
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Connection Status */}
        <div className="text-center">
          {isOnline ? (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <WifiOff className="w-8 h-8 text-red-600" />
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isOnline ? "Connection Restored!" : "You're Offline"}
          </h1>

          <p className="text-gray-600">
            {isOnline
              ? "Great! Your connection is back. Redirecting you shortly..."
              : "SmartDVM works offline, but some features require an internet connection."
            }
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Offline Features Available
            </CardTitle>
            <CardDescription>
              You can continue working with cached data and sync when back online
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Available Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900">View Cached Data</p>
                  <p className="text-sm text-green-700">Access previously loaded client records, appointments, and medical records</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900">Create New Records</p>
                  <p className="text-sm text-green-700">Add SOAP notes, treatments, and other data (will sync when online)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-900">Sync Queue Active</p>
                  <p className="text-sm text-yellow-700">Changes will be saved locally and synced automatically when connection returns</p>
                </div>
              </div>
            </div>

            {/* Connection Info */}
            {!isOnline && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Limited Features</AlertTitle>
                <AlertDescription>
                  Some features like lab integration, payment processing, and cloud storage require an internet connection.
                  You'll see an offline indicator when these features aren't available.
                </AlertDescription>
              </Alert>
            )}

            {/* Retry Info */}
            {retryCount > 0 && (
              <div className="text-center text-sm text-gray-500">
                <p>Last retry: {lastRetry?.toLocaleTimeString()}</p>
                <p>Retry attempts: {retryCount}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isOnline ? (
            <Button
              onClick={() => router.push('/')}
              className="w-full"
              size="lg"
            >
              <Cloud className="w-4 h-4 mr-2" />
              Continue to SmartDVM
            </Button>
          ) : (
            <>
              <Button
                onClick={handleRetry}
                className="w-full"
                size="lg"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button
                onClick={handleGoBack}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <Smartphone className="w-4 h-4" />
            SmartDVM PWA - Works Offline
          </p>
          <p className="mt-1">
            Version 1.0.0 • Built for veterinary practices
          </p>
        </div>
      </div>
    </div>
  );
}
