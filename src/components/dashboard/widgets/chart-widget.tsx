"use client";

import { useQuery } from "@tanstack/react-query";
import type { WidgetConfig } from "@/hooks/use-dashboard-config"; // Assuming this path is correct
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface ChartWidgetProps {
  widget: WidgetConfig;
}

export function ChartWidget({ widget }: ChartWidgetProps) {
  // In a real application, this would be a dynamic data source based on widget.settings
  // For now, we'll just use synthetic data for demonstration
  const chartType = widget.settings?.chartType || 'revenue';
  
  const { data, isLoading } = useQuery<Array<{ name: string; value: number }>>({
    queryKey: ['/api/analytics', chartType],
    queryFn: async () => {
      // TODO: Replace with actual API call to fetch analytics data based on chartType
      // This example is hardcoded for demonstration purposes
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const months = [];
      for (let i = 0; i < 6; i++) {
        const month = (currentMonth - 5 + i + 12) % 12;
        const year = currentMonth - 5 + i < 0 ? currentYear - 1 : currentYear;
        months.push({
          name: new Date(year, month, 1).toLocaleString('default', { month: 'short' }),
          // Generate different data for different chart types
          value: Math.floor(Math.random() * 5000) + 1000 // Synthetic data
        });
      }
      
      return months;
    },
    enabled: chartType !== undefined, // Only fetch if chartType is determined
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  // Get title based on chart type
  const getChartTitle = () => {
    switch (chartType) {
      case 'revenue': return 'Revenue';
      case 'patients': return 'Patient Count';
      case 'appointments': return 'Appointment Count';
      default: return 'Analytics';
    }
  };

  return (
    <div className="h-56 w-full"> {/* Ensure it takes full width */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> {/* Use theme variable */}
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} /> {/* Theme and style */}
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => { /* Add formatter if needed, e.g., for currency */ return value; }} /> {/* Theme and style */}
          <Tooltip
             contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
                fontSize: '12px' 
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{fontSize: '12px'}} />
          <Line
            type="monotone"
            dataKey="value"
            name={getChartTitle()}
            stroke="hsl(var(--primary))" // Use theme variable
            strokeWidth={2}
            dot={{ r: 4, fill: 'hsl(var(--primary))' }} // Use theme variable
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}