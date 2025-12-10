import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { WidgetConfig } from "@/hooks/use-dashboard-config";
import { Pet } from "@/db/schema";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface PetStatsWidgetProps {
  widget: WidgetConfig;
}

export function PetStatsWidget({ widget }: PetStatsWidgetProps) {
  const { data: pets, isLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const response = await fetch("/api/pets");
      if (!response.ok) throw new Error("Failed to fetch pets");
      return response.json();
    },
  });

  const [expanded, setExpanded] = useState(false);
  const sizeMap: Record<"small" | "medium" | "large", string> = {
    small: "h-48",
    medium: "h-72",
    large: "h-96",
  };
  const containerClass = expanded
    ? "space-y-3"
    : `${sizeMap[widget.size]} overflow-y-auto space-y-3`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pets || pets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pet data available
      </div>
    );
  }

  // Calculate statistics
  const speciesCount: Record<string, number> = {};
  pets.forEach((pet) => {
    const species = pet.species || "Unknown";
    speciesCount[species] = (speciesCount[species] || 0) + 1;
  });

  const speciesDataAll = Object.entries(speciesCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const speciesData = speciesDataAll;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  const totalPets = pets.length;

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between text-sm">
        <div className="font-medium">Total Pets</div>
        <div className="px-2 py-1 rounded bg-muted text-muted-foreground">
          {totalPets}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={speciesData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {speciesData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {speciesDataAll.length > 5 && (
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
