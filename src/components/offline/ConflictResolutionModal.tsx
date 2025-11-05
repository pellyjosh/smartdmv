/**
 * ConflictResolutionModal Component
 * Modal for resolving sync conflicts with various strategies
 */

"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConflictDiffViewer } from "./ConflictDiffViewer";
import { mergeWithStrategy } from "@/lib/offline/utils/diff-utils";
import type {
  Conflict,
  ConflictStrategy,
} from "@/lib/offline/types/sync-engine.types";
import {
  Server,
  Laptop,
  GitMerge,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface ConflictResolutionModalProps {
  conflict: Conflict | null;
  open: boolean;
  onResolve: (strategy: ConflictStrategy, mergedData?: any) => Promise<void>;
  onDismiss: () => void;
}

export function ConflictResolutionModal({
  conflict,
  open,
  onResolve,
  onDismiss,
}: ConflictResolutionModalProps) {
  const [selectedStrategy, setSelectedStrategy] =
    useState<ConflictStrategy>("manual");
  const [selectedFields, setSelectedFields] = useState<
    Record<string, "local" | "server">
  >({});
  const [resolving, setResolving] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  if (!conflict) return null;

  const handleFieldSelect = (field: string, source: "local" | "server") => {
    setSelectedFields((prev) => ({ ...prev, [field]: source }));
    setSelectedStrategy("merge");

    // Update preview
    const merged = mergeWithStrategy(conflict.localData, conflict.serverData, {
      ...selectedFields,
      [field]: source,
    });
    setPreview(merged);
  };

  const handleQuickResolve = async (
    strategy: "server-wins" | "client-wins" | "last-write-wins"
  ) => {
    setResolving(true);
    try {
      await onResolve(strategy);
      onDismiss();
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    } finally {
      setResolving(false);
    }
  };

  const handleManualResolve = async () => {
    if (Object.keys(selectedFields).length === 0) {
      alert("Please select values for conflicting fields");
      return;
    }

    setResolving(true);
    try {
      const mergedData = mergeWithStrategy(
        conflict.localData,
        conflict.serverData,
        selectedFields
      );
      await onResolve("merge", mergedData);
      onDismiss();
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    } finally {
      setResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-blue-500";
      case "medium":
        return "text-yellow-500";
      case "high":
        return "text-orange-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onDismiss}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className={`h-5 w-5 ${getSeverityColor(conflict.severity)}`}
            />
            Resolve Sync Conflict
          </DialogTitle>
          <DialogDescription>
            A conflict was detected for {conflict.operation.entityType} entity.
            Choose how to resolve it.
          </DialogDescription>
        </DialogHeader>

        {/* Conflict Info */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">{conflict.conflictType}</Badge>
          <Badge
            variant={
              conflict.severity === "critical" ? "destructive" : "secondary"
            }
          >
            {conflict.severity} severity
          </Badge>
          {conflict.autoResolvable && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Auto-resolvable
            </Badge>
          )}
        </div>

        {/* Quick Resolution Options */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => handleQuickResolve("server-wins")}
            disabled={resolving}
          >
            <Server className="h-5 w-5" />
            <span className="text-sm">Use Server Version</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => handleQuickResolve("client-wins")}
            disabled={resolving}
          >
            <Laptop className="h-5 w-5" />
            <span className="text-sm">Keep Local Version</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => handleQuickResolve("last-write-wins")}
            disabled={resolving}
          >
            <Clock className="h-5 w-5" />
            <span className="text-sm">Most Recent Wins</span>
          </Button>
        </div>

        {/* Manual Merge Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            <h3 className="text-sm font-medium">Manual Merge</h3>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              Click on fields to select which version to keep. Selected fields
              will be highlighted.
            </AlertDescription>
          </Alert>

          <ConflictDiffViewer
            localData={conflict.localData}
            serverData={conflict.serverData}
            entityType={conflict.operation.entityType}
            onFieldSelect={handleFieldSelect}
            selectedFields={selectedFields}
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Merged Preview</h4>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onDismiss} disabled={resolving}>
            Cancel
          </Button>
          <Button
            onClick={handleManualResolve}
            disabled={resolving || Object.keys(selectedFields).length === 0}
          >
            {resolving ? "Resolving..." : "Apply Manual Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Conflict List Component for bulk operations
 */
interface ConflictListProps {
  conflicts: Conflict[];
  onResolve: (conflictId: number) => void;
  onBulkResolve?: (strategy: ConflictStrategy) => Promise<void>;
}

export function ConflictList({
  conflicts,
  onResolve,
  onBulkResolve,
}: ConflictListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkResolve = async (strategy: ConflictStrategy) => {
    if (selectedIds.size === 0) return;
    await onBulkResolve?.(strategy);
    setSelectedIds(new Set());
  };

  if (conflicts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
        <p>No conflicts to resolve</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded">
          <span className="text-sm">{selectedIds.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkResolve("server-wins")}
          >
            Use Server for All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkResolve("client-wins")}
          >
            Keep Local for All
          </Button>
        </div>
      )}

      {conflicts.map((conflict) => (
        <div
          key={conflict.id}
          className="border rounded-lg p-4 hover:border-blue-300 cursor-pointer"
          onClick={() => onResolve(conflict.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(conflict.id)}
                onChange={() => toggleSelection(conflict.id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded"
              />
              <span className="font-medium">
                {conflict.operation.entityType}
              </span>
              <Badge variant="outline">{conflict.conflictType}</Badge>
            </div>
            <Badge
              variant={
                conflict.severity === "critical" ? "destructive" : "secondary"
              }
            >
              {conflict.severity}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            {conflict.affectedFields.length} fields affected
          </p>
        </div>
      ))}
    </div>
  );
}
