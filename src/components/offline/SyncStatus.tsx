/**
 * Sync Status Component
 * Detailed view of sync queue and operations
 */

"use client";

import { useState, useEffect } from "react";
import { useSyncQueue } from "@/hooks/offline/use-sync-queue";
import { indexedDBManager } from "@/lib/offline/db";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function SyncStatus() {
  const {
    stats,
    pendingOperations,
    failedOperations,
    conflictedOperations,
    isLoading,
    retryFailed,
    clearCompleted,
    refresh,
  } = useSyncQueue();
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Check if offline system is initialized
  useEffect(() => {
    const checkInit = () => {
      const { tenantId } = indexedDBManager.getCurrentTenant();
      setIsInitialized(!!tenantId);
    };

    checkInit();
    const interval = setInterval(checkInit, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryFailed = async () => {
    try {
      console.log("[SyncStatus] Retrying failed operations...");
      const count = await retryFailed();
      console.log(`[SyncStatus] Retried ${count} failed operations`);

      toast({
        title: "Retry initiated",
        description: `${count} failed operation(s) queued for retry.`,
      });
    } catch (error) {
      console.error("[SyncStatus] Retry failed error:", error);
      toast({
        title: "Retry failed",
        description:
          error instanceof Error ? error.message : "Failed to retry operations",
        variant: "destructive",
      });
    }
  };

  const handleClearCompleted = async () => {
    try {
      console.log("[SyncStatus] Clearing completed operations...");
      const count = await clearCompleted();
      console.log(`[SyncStatus] Cleared ${count} completed operations`);

      toast({
        title: "Completed operations cleared",
        description: `${count} completed operation(s) removed from queue.`,
      });
    } catch (error) {
      console.error("[SyncStatus] Clear completed error:", error);
      toast({
        title: "Clear failed",
        description:
          error instanceof Error ? error.message : "Failed to clear operations",
        variant: "destructive",
      });
    }
  };

  // Don't render until initialized
  if (!isInitialized) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No sync queue data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Operations</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending
            </CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {stats.pending}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Failed
            </CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {stats.failed}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Conflicts
            </CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {stats.conflicted}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button
          onClick={handleRetryFailed}
          variant="outline"
          size="sm"
          disabled={stats.failed === 0}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Failed ({stats.failed})
        </Button>
        <Button onClick={handleClearCompleted} variant="outline" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Completed
        </Button>
      </div>

      {/* By Entity Type */}
      {Object.keys(stats.byEntityType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Operations by Entity Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEntityType).map(([entityType, count]) => (
                <Badge key={entityType} variant="secondary">
                  {entityType}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Operations */}
      {pendingOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Operations</CardTitle>
            <CardDescription>Waiting to be synced</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {pendingOperations.slice(0, 10).map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {op.operation}
                      </Badge>
                      <span>{op.entityType}</span>
                      <span className="text-muted-foreground">
                        #{op.entityId}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(op.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                ))}
                {pendingOperations.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    And {pendingOperations.length - 10} more...
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Failed Operations */}
      {failedOperations.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Failed Operations
            </CardTitle>
            <CardDescription>Need attention or retry</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {failedOperations.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-start justify-between p-2 bg-destructive/5 rounded-md text-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {op.operation}
                        </Badge>
                        <span>{op.entityType}</span>
                        <span className="text-muted-foreground">
                          #{op.entityId}
                        </span>
                      </div>
                      {op.lastError && (
                        <p className="text-xs text-destructive">
                          {op.lastError}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Retry {op.retryCount}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Conflicted Operations */}
      {conflictedOperations.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-base text-orange-600">
              Conflicted Operations
            </CardTitle>
            <CardDescription>Require manual resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {conflictedOperations.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-start justify-between p-2 bg-orange-50 rounded-md text-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs border-orange-500"
                        >
                          {op.operation}
                        </Badge>
                        <span>{op.entityType}</span>
                        <span className="text-muted-foreground">
                          #{op.entityId}
                        </span>
                      </div>
                      {op.conflictData && (
                        <p className="text-xs text-orange-600">
                          Conflicts in:{" "}
                          {op.conflictData.conflictFields.join(", ")}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Estimated Sync Time */}
      {stats.estimatedSyncTime && stats.pending > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Estimated sync time:
              </span>
              <Badge variant="secondary">
                ~{Math.ceil(stats.estimatedSyncTime / 1000)}s
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
