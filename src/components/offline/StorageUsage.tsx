/**
 * Storage Usage Component
 * Shows storage quota and usage breakdown
 */

"use client";

import { useState, useEffect } from "react";
import { storageManager } from "@/lib/offline/managers/storage-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, HardDrive, Trash2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function StorageUsage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const storageStats = await storageManager.getStats();
      setStats(storageStats);
    } catch (error) {
      console.error("[StorageUsage] Load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (
      confirm(
        "Are you sure you want to clear all offline data? This cannot be undone."
      )
    ) {
      try {
        await storageManager.clearAllData();
        await loadStats();
      } catch (error) {
        console.error("[StorageUsage] Clear error:", error);
      }
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Loading storage information...
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const isNearLimit = stats.percentUsed > 80;
  const isCritical = stats.percentUsed > 95;

  return (
    <div className="space-y-4">
      {/* Warning Alert */}
      {isNearLimit && (
        <Alert variant={isCritical ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {isCritical
              ? "Storage is critically full! Clear old data to continue using offline features."
              : "Storage is running low. Consider clearing old data."}
          </AlertDescription>
        </Alert>
      )}

      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Usage
              </CardTitle>
              <CardDescription>
                {formatBytes(stats.totalUsage)} of {formatBytes(stats.quota)}{" "}
                used
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadStats} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleClearData} variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Used Space</span>
              <Badge
                variant={
                  isCritical
                    ? "destructive"
                    : isNearLimit
                    ? "secondary"
                    : "outline"
                }
              >
                {stats.percentUsed.toFixed(1)}%
              </Badge>
            </div>
            <Progress
              value={stats.percentUsed}
              className={`h-2 ${
                isCritical ? "bg-destructive" : isNearLimit ? "bg-orange-500" : ""
              }`}
            />
          </div>

          {/* Entity Counts */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Stored Entities</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.entityCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([entityType, count]) => (
                <div
                  key={entityType}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                >
                  <span className="capitalize">
                    {entityType.replace(/([A-Z])/g, ' $1').toLowerCase().replace('soap templates', 'SOAP Templates')}
                  </span>
                  <Badge variant="secondary">{count as number}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Sync Info */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending Operations</span>
              <Badge
                variant={stats.pendingOperations > 0 ? "default" : "secondary"}
              >
                {stats.pendingOperations}
              </Badge>
            </div>
            {stats.lastSyncTime > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Synced</span>
                <span className="text-xs">
                  {new Date(stats.lastSyncTime).toLocaleString()}
                </span>
              </div>
            )}
            {stats.oldestUnsyncedOperation && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Oldest Unsynced</span>
                <span className="text-xs">
                  {new Date(stats.oldestUnsyncedOperation).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage Breakdown</CardTitle>
          <CardDescription>Detailed storage allocation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Total Quota</span>
              <span className="font-medium">{formatBytes(stats.quota)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Used Space</span>
              <span className="font-medium">
                {formatBytes(stats.totalUsage)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Available Space</span>
              <span className="font-medium text-green-600">
                {formatBytes(stats.quota - stats.totalUsage)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
