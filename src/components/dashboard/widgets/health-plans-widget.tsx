"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import type { WidgetConfig } from "@/hooks/use-dashboard-config"; // Assuming this path is correct
import type { HealthPlan } from "@/db/schema";
import { Loader2, ClipboardCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress"; // Assuming shadcn/ui progress

interface HealthPlansWidgetProps {
  widget: WidgetConfig;
}

export function HealthPlansWidget({ widget }: HealthPlansWidgetProps) {
  // Fetch health plans
  const { data: healthPlans, isLoading: loadingPlans } = useQuery<HealthPlan[]>(
    {
      queryKey: ["/api/health-plans"],
      queryFn: async () => {
        const response = await fetch("/api/health-plans");
        if (!response.ok) throw new Error("Failed to fetch health plans");
        return response.json();
      },
    }
  );

  const [expanded, setExpanded] = React.useState(false);
  const sizeMap: Record<"small" | "medium" | "large", string> = {
    small: "h-48",
    medium: "h-72",
    large: "h-96",
  };
  const containerClass = expanded
    ? "space-y-3"
    : `${sizeMap[widget.size]} overflow-y-auto space-y-3`;

  const isLoading = loadingPlans;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!healthPlans || healthPlans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No health plans found
      </div>
    );
  }

  const activePlans = healthPlans.filter((plan) => plan.status === "active");
  const filteredPlans = activePlans;

  if (filteredPlans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active health plans
      </div>
    );
  }

  const calculateProgress = (plan: HealthPlan) => {
    const anyPlan = plan as any;
    const total = Number(anyPlan?.milestoneCount ?? 0);
    const completed = Number(anyPlan?.milestoneCompletedCount ?? 0);
    if (total > 0) {
      const ratio = completed / total;
      const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
      return percent;
    }
    if (plan.status === "completed") return 100;
    return 0;
  };

  return (
    <div className={containerClass}>
      {filteredPlans.map((plan) => (
        <div
          key={plan.id}
          className="p-2 border rounded-md bg-card text-card-foreground shadow-sm" // Added card styling
        >
          <div className="flex justify-between items-center mb-1">
            <div className="font-medium">{plan.petId}</div>
            <div className="text-xs text-muted-foreground">{plan.planType}</div>
          </div>
          <div className="text-sm mb-2">{plan.name}</div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              {" "}
              {/* Added text-muted-foreground */}
              <span>Progress</span>
              <span>{calculateProgress(plan)}%</span>
            </div>
            <Progress value={calculateProgress(plan)} className="h-2" />
          </div>
        </div>
      ))}
      {activePlans.length > 4 && (
        <div className="pt-2 border-t">
          <button
            className="w-full text-xs text-primary hover:underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}
