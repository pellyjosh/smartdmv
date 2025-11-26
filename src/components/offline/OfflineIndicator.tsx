/**
 * Offline Indicator Component
 * Shows global offline/online status with sync information
 */

"use client";

import { useState, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSyncQueue } from "@/hooks/offline/use-sync-queue";
import { useSyncEngine } from "@/hooks/offline/use-sync-engine";
import { indexedDBManager } from "@/lib/offline/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline, wasOnline, isTransitioning } = useNetworkStatus();
  const { stats } = useSyncQueue();
  const { sync, isSyncing } = useSyncEngine();
  const [show, setShow] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncJustCompleted, setSyncJustCompleted] = useState(false);
  const [lastPending, setLastPending] = useState<number | null>(null);

  // Check if offline system is initialized
  useEffect(() => {
    const checkInit = () => {
      const { tenantId } = indexedDBManager.getCurrentTenant();
      setIsInitialized(!!tenantId);
    };

    checkInit();
    // Recheck every second until initialized
    const interval = setInterval(checkInit, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track when a sync completes (pending transitions from >0 to 0)
  useEffect(() => {
    if (!stats) return;
    const prev = lastPending ?? stats.pending;
    const current = stats.pending;
    const completed = prev > 0 && current === 0;
    setSyncJustCompleted(completed);
    setLastPending(current);
  }, [stats, lastPending]);

  // Display logic: show only when offline, recently came online, or a sync just completed, or there are pending changes
  useEffect(() => {
    if (!isInitialized) return;

    if (!isOnline) {
      setShow(true);
      return;
    }

    const hasPending = !!stats && stats.pending > 0;
    const recentlyCameOnline = wasOnline === false;
    const shouldShow = hasPending || recentlyCameOnline || syncJustCompleted;

    if (shouldShow) {
      setShow(true);
      if (!hasPending) {
        const timer = setTimeout(() => setShow(false), 5000);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [isInitialized, isOnline, wasOnline, stats, syncJustCompleted]);

  // Don't render until offline system is initialized
  if (!isInitialized) {
    return null;
  }

  // Don't hide when offline - always show the offline indicator
  if (!show && isOnline && (!stats || stats.pending === 0)) {
    return null;
  }

  const handleSyncNow = async () => {
    console.log("🔄 Manual sync triggered from OfflineIndicator");
    await sync();
  };

  return (
    <div
      className={cn(
        "fixed top-20 right-4 z-50 transition-all duration-300",
        isTransitioning && "scale-105"
      )}
    >
      {isOnline ? (
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="gap-2 px-3 py-2 bg-background border shadow-lg"
          >
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Online</span>

            {stats && stats.pending > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                {isSyncing ? (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                ) : (
                  <Cloud className="h-3 w-3 text-blue-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {stats.pending} pending
                </span>
              </>
            )}

            {stats && stats.pending === 0 && (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">Synced</span>
              </>
            )}
          </Badge>

          {/* Manual Sync Button - show when online with pending operations */}
          {stats && stats.pending > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="h-8 gap-1.5 shadow-lg"
              title="Sync pending changes now"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
              />
              <span className="text-xs">Sync Now</span>
            </Button>
          )}
        </div>
      ) : (
        <Badge variant="destructive" className="gap-2 px-3 py-2 shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline Mode</span>

          {stats && stats.pending > 0 && (
            <>
              <span className="text-white/60">•</span>
              <CloudOff className="h-3 w-3" />
              <span className="text-xs text-white/80">
                {stats.pending} changes pending
              </span>
            </>
          )}
        </Badge>
      )}
    </div>
  );
}
