"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, RefreshCw, WifiOff } from "lucide-react";
import {
  getCachingProgress,
  cacheOfflineSupportedRoutes,
} from "@/lib/offline/cache-manager";

export function OfflineCacheStatus() {
  const [progress, setProgress] = useState({
    total: 0,
    cached: 0,
    percentage: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadProgress = async () => {
    const progressData = await getCachingProgress();
    setProgress(progressData);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadProgress();

    // Listen for cache completion messages from service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "CACHE_ROUTES_COMPLETE") {
          console.log(
            "[OfflineCacheStatus] Received cache completion:",
            event.data.payload
          );
          loadProgress();
        }
      });
    }

    // Refresh progress every 30 seconds
    const interval = setInterval(loadProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRecache = async () => {
    setIsLoading(true);
    try {
      await cacheOfflineSupportedRoutes();
      setTimeout(() => {
        loadProgress();
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error("[OfflineCacheStatus] Failed to trigger caching:", error);
      setIsLoading(false);
    }
  };

  const isComplete = progress.percentage === 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Offline Mode</CardTitle>
          </div>
          {isComplete ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Download className="h-3 w-3 mr-1" />
              Caching
            </Badge>
          )}
        </div>
        <CardDescription>
          {isComplete
            ? "All features are available offline"
            : `Caching features for offline use (${progress.cached}/${progress.total})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}

        <Button
          onClick={handleRecache}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Caching...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Cache
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Cached features include:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Appointments & Scheduling</li>
            <li>Patient Care & Records</li>
            <li>Medical Records & SOAP Notes</li>
            <li>Client Management</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
