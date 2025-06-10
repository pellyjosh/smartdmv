import { useQuery } from "@tanstack/react-query";
import { WidgetConfig } from "@/hooks/use-dashboard-config";
import { Pet } from "@/schemas/pet";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface PetStatsWidgetProps {
  widget: WidgetConfig;
}

export function PetStatsWidget({ widget }: PetStatsWidgetProps) {
  const { data: pets, isLoading } = useQuery<Pet[]>({
    queryKey: ['/api/pets'],
  });

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
  
  pets.forEach(pet => {
    const species = pet.species || 'Unknown';
    speciesCount[species] = (speciesCount[species] || 0) + 1;
  });

  const speciesData = Object.entries(speciesCount).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
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
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {speciesData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}