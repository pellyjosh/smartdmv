/**
 * ConflictDiffViewer Component
 * Displays side-by-side comparison of local vs server data with visual diff highlighting
 */

"use client";

import React from "react";
import { generateFieldDiffs } from "@/lib/offline/utils/diff-utils";
import type {
  FieldDiff,
  DiffType,
} from "@/lib/offline/types/sync-engine.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Plus, Minus, Edit2 } from "lucide-react";

interface ConflictDiffViewerProps {
  localData: any;
  serverData: any;
  entityType: string;
  onFieldSelect?: (field: string, source: "local" | "server") => void;
  selectedFields?: Record<string, "local" | "server">;
}

export function ConflictDiffViewer({
  localData,
  serverData,
  entityType,
  onFieldSelect,
  selectedFields = {},
}: ConflictDiffViewerProps) {
  const diffs = generateFieldDiffs(localData, serverData);

  const getDiffIcon = (type: DiffType) => {
    switch (type) {
      case "added":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "removed":
        return <Minus className="h-4 w-4 text-red-500" />;
      case "modified":
        return <Edit2 className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getDiffColor = (type: DiffType) => {
    switch (type) {
      case "added":
        return "bg-green-50 border-green-200";
      case "removed":
        return "bg-red-50 border-red-200";
      case "modified":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Local Version
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              Server Version
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-2">
        {diffs.map((diff) => (
          <Card
            key={diff.field}
            className={`border ${getDiffColor(diff.type)}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-2">
                {getDiffIcon(diff.type)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{diff.field}</span>
                    <Badge
                      variant={diff.conflicting ? "destructive" : "secondary"}
                    >
                      {diff.type}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                {/* Local value */}
                <div
                  className={`p-3 rounded border ${
                    selectedFields[diff.field] === "local"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white cursor-pointer hover:border-blue-300"
                  }`}
                  onClick={() => onFieldSelect?.(diff.field, "local")}
                >
                  <div className="text-xs text-gray-500 mb-1">Local</div>
                  <pre className="text-xs font-mono overflow-auto max-h-32">
                    {formatValue(diff.localValue)}
                  </pre>
                </div>

                {/* Server value */}
                <div
                  className={`p-3 rounded border ${
                    selectedFields[diff.field] === "server"
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 bg-white cursor-pointer hover:border-purple-300"
                  }`}
                  onClick={() => onFieldSelect?.(diff.field, "server")}
                >
                  <div className="text-xs text-gray-500 mb-1">Server</div>
                  <pre className="text-xs font-mono overflow-auto max-h-32">
                    {formatValue(diff.serverValue)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {diffs.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p>No differences detected</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Compact diff viewer for lists
 */
export function CompactDiffViewer({
  localData,
  serverData,
}: {
  localData: any;
  serverData: any;
}) {
  const diffs = generateFieldDiffs(localData, serverData);
  const conflicting = diffs.filter((d) => d.conflicting);

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-xs">
        {diffs.length} changes
      </Badge>
      {conflicting.length > 0 && (
        <Badge variant="destructive" className="text-xs">
          {conflicting.length} conflicts
        </Badge>
      )}
    </div>
  );
}
