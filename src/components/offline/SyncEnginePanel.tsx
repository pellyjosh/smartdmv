/**
 * Sync Engine Control Panel
 * Manual sync trigger, progress monitoring, and conflict resolution
 */

"use client";

import { useState } from "react";
import { useSyncEngine } from "@/hooks/offline/use-sync-engine";
import { useNetworkStatus as useOfflineNetworkStatus } from "@/hooks/offline/use-network-status";
import { useToast } from "@/hooks/use-toast";
import { useOfflineAuth } from "@/hooks/offline/use-offline-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  XCircle,
  GitMerge,
  Server,
  Monitor,
  Clock,
  AlertTriangle,
  Database,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Conflict } from "@/lib/offline/types/sync-engine.types";
import { pullFreshDataIfNeeded } from "@/lib/sync-service";

export function SyncEnginePanel() {
  const {
    sync,
    isSyncing,
    status,
    progress,
    lastResult,
    conflicts,
    unresolvedConflicts,
    resolveConflict,
    refreshConflicts,
    isAutoSyncEnabled,
    setAutoSyncEnabled,
  } = useSyncEngine();

  const { isOnline, isOffline, isSlow } = useOfflineNetworkStatus();
  const { toast } = useToast();
  const { isAuthenticated } = useOfflineAuth();

  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(
    null
  );
  const [resolutionStrategy, setResolutionStrategy] = useState<string>("");

  const handleSync = async () => {
    try {
      if (!isAuthenticated) {
        toast({ title: "Authentication required", description: "Please log in to sync.", variant: "destructive" });
        return;
      }
      console.log("[SyncEnginePanel] Starting sync...");
      const result = await sync();
      if (result) {
        console.log("[SyncEnginePanel] Sync completed:", result);
        toast({
          title: "Sync completed",
          description: `Synced: ${result.synced}, Failed: ${result.failed}, Conflicts: ${result.conflicts}`,
        });
      } else {
        console.warn("[SyncEnginePanel] Sync returned null");
        toast({
          title: "Sync already in progress",
          description: "Please wait for the current sync to complete.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("[SyncEnginePanel] Sync error:", error);
      toast({
        title: "Sync failed",
        description:
          error instanceof Error ? error.message : "Failed to sync operations",
        variant: "destructive",
      });
    }
  };

  const handleResolveConflict = async () => {
    if (!selectedConflict || !resolutionStrategy) return;

    try {
      await resolveConflict(selectedConflict.id, {
        strategy: resolutionStrategy as any,
        appliedAt: Date.now(),
        appliedBy: "user",
      });
      setSelectedConflict(null);
      setResolutionStrategy("");
      await refreshConflicts();
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    }
  };

  const handlePullFreshData = async () => {
    try {
      if (!isAuthenticated) {
        toast({ title: "Authentication required", description: "Please log in to refresh.", variant: "destructive" });
        return;
      }
      console.log("[SyncEnginePanel] Pulling fresh data from server...");

      // Get practice context from cached tenant information
      const { getOfflineTenantContext } = await import('@/lib/offline/core/tenant-context');
      const context = await getOfflineTenantContext();

      if (!context) {
        throw new Error('No tenant context available - user may not be logged in');
      }

      // Always pull data to populate empty databases
      const result = await fetch(`/api/sync/pull?practiceId=${context.practiceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!result.ok) {
        throw new Error(`API call failed: ${result.status} ${result.statusText}`);
      }

      const data = await result.json();
      console.log("[SyncEnginePanel] API Response:", data);

      // If successful, also call the sync service function
      if (data.success && data.changes && data.changes.length > 0) {
        await pullFreshDataIfNeeded();
        toast({
          title: "Data refreshed",
          description: `Pulled ${data.changes.length} records from server`,
        });
      } else {
        toast({
          title: "Data refreshed",
          description: "Checked server - no new data found",
        });
      }
    } catch (error) {
      console.error("[SyncEnginePanel] Fresh data pull error:", error);

      // Try calling the sync service function anyway as fallback
      try {
        await pullFreshDataIfNeeded();
        toast({
          title: "Data refreshed",
          description: "Fallback sync completed",
        });
      } catch (fallbackError) {
        toast({
          title: "Refresh failed",
          description:
            error instanceof Error ? `${error.message}` : "Failed to refresh data",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "syncing":
      case "preparing":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "partial-success":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync Control Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getStatusIcon(status)}
              Sync Engine
            </span>
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className="ml-auto"
            >
              {isOnline ? "Online" : "Offline"}
              {isSlow && " (Slow)"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Bidirectional synchronization with conflict detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-sync toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw
                className={`h-4 w-4 ${
                  isAutoSyncEnabled ? "text-green-500" : "text-muted-foreground"
                }`}
              />
              <div>
                <div className="font-medium text-sm">Auto-Sync</div>
                <div className="text-xs text-muted-foreground">
                  {isAutoSyncEnabled
                    ? "Automatically sync when operations are added"
                    : "Manual sync only"}
                </div>
              </div>
            </div>
            <Button
              variant={isAutoSyncEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoSyncEnabled(!isAutoSyncEnabled)}
            >
              {isAutoSyncEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          {/* Sync Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing || isOffline || !isAuthenticated}
              className="flex-1"
              size="lg"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
            <Button
              onClick={handlePullFreshData}
              variant="outline"
              disabled={isSyncing || isOffline || !isAuthenticated}
              title="Pull fresh data from server even if no local changes"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Refresh</span>
            </Button>
          </div>

          {/* Sync Progress */}
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {status === "preparing" ? "Preparing..." : "Syncing..."}
                </span>
                <span className="font-medium">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {progress.processed} / {progress.total} operations
                </span>
                <span>
                  {progress.successful} ✓ • {progress.failed} ✗ •{" "}
                  {progress.conflicts} ⚠
                </span>
              </div>
            </div>
          )}

          {/* Last Sync Result */}
          {lastResult && !isSyncing && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Last Sync</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(lastResult.timestamp, {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {lastResult.synced}
                  </div>
                  <div className="text-xs text-muted-foreground">Synced</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {lastResult.failed}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {lastResult.conflicts}
                  </div>
                  <div className="text-xs text-muted-foreground">Conflicts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {lastResult.duration}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflicts Card */}
      {unresolvedConflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Unresolved Conflicts ({unresolvedConflicts.length})
            </CardTitle>
            <CardDescription>
              These items have conflicting changes that need resolution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {unresolvedConflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedConflict(conflict)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {conflict.operation.entityType} #
                        {conflict.operation.entityId}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {conflict.conflictType} conflict •{" "}
                        {conflict.affectedFields.join(", ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          conflict.severity === "critical"
                            ? "destructive"
                            : conflict.severity === "high"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {conflict.severity}
                      </Badge>
                      {conflict.autoResolvable && (
                        <Badge variant="outline">Auto-resolvable</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Conflict Resolution Dialog */}
      <Dialog
        open={selectedConflict !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedConflict(null);
            setResolutionStrategy("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Resolve Conflict</DialogTitle>
            <DialogDescription>
              Choose how to resolve this conflict between local and server data
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-4">
              {/* Conflict Info */}
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Entity:</span>
                    <span className="ml-2 font-semibold">
                      {selectedConflict.operation.entityType} #
                      {selectedConflict.operation.entityId}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2">
                      {selectedConflict.conflictType}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Severity:</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedConflict.severity}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fields:</span>
                    <span className="ml-2">
                      {selectedConflict.affectedFields.join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <Monitor className="h-4 w-4" />
                    Local Data
                  </div>
                  <ScrollArea className="h-[200px] rounded-lg border p-3 bg-muted/30">
                    <pre className="text-xs">
                      {JSON.stringify(selectedConflict.localData, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <Server className="h-4 w-4" />
                    Server Data
                  </div>
                  <ScrollArea className="h-[200px] rounded-lg border p-3 bg-muted/30">
                    <pre className="text-xs">
                      {JSON.stringify(selectedConflict.serverData, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>

              {/* Resolution Strategy Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Choose Resolution Strategy
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={
                      resolutionStrategy === "server-wins"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setResolutionStrategy("server-wins")}
                    className="justify-start"
                  >
                    <Server className="h-4 w-4 mr-2" />
                    Server Wins
                  </Button>
                  <Button
                    variant={
                      resolutionStrategy === "client-wins"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setResolutionStrategy("client-wins")}
                    className="justify-start"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Client Wins
                  </Button>
                  <Button
                    variant={
                      resolutionStrategy === "merge" ? "default" : "outline"
                    }
                    onClick={() => setResolutionStrategy("merge")}
                    className="justify-start"
                    disabled={!selectedConflict.autoResolvable}
                  >
                    <GitMerge className="h-4 w-4 mr-2" />
                    Merge
                  </Button>
                  <Button
                    variant={
                      resolutionStrategy === "last-write-wins"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setResolutionStrategy("last-write-wins")}
                    className="justify-start"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Last Write Wins
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedConflict(null);
                setResolutionStrategy("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolveConflict}
              disabled={!resolutionStrategy}
            >
              Apply Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
