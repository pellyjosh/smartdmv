"use client";

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
  const { data: healthPlans, isLoading: loadingPlans } = useQuery<HealthPlan[]>({
    queryKey: ['/api/health-plans'],
    queryFn: async () => {
      const response = await fetch('/api/health-plans');
      if (!response.ok) throw new Error('Failed to fetch health plans');
      return response.json();
    },
  });

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

  // Filter to show only active plans and limit the number displayed
  const filteredPlans = healthPlans
    .filter(plan => plan.status === "active")
    .slice(0, 4); // Show only first 4 active plans

  if (filteredPlans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active health plans
      </div>
    );
  }

 
  // TODO: Implement actual progress calculation based on plan milestones
  const calculateProgress = (plan: HealthPlan) => {
    // In a real implementation, this would be calculated based on completed milestones
    // For now, return a random value between 0-100 as per the original code
    return Math.floor(Math.random() * 100);
  };

  return (
    <div className="space-y-3">
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
            <div className="flex justify-between text-xs text-muted-foreground"> {/* Added text-muted-foreground */}
              <span>Progress</span>
              <span>{calculateProgress(plan)}%</span>
            </div>
            <Progress value={calculateProgress(plan)} className="h-2" />
          </div>
        </div>
      ))}
    </div>
  );
}