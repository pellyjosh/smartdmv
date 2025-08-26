import { useQuery } from "@tanstack/react-query";
import { WidgetConfig } from "@/hooks/use-dashboard-config";
import { SelectAppointment } from "@/db/schemas/appointmentsSchema";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { startOfWeek, addDays, format } from "@/lib/date-utils";

interface PracticeStatsWidgetProps {
  widget: WidgetConfig;
}

export function PracticeStatsWidget({ widget }: PracticeStatsWidgetProps) {
  const { data: appointments, isLoading } = useQuery<SelectAppointment[]>({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const response = await fetch('/api/appointments');
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No appointment data available
      </div>
    );
  }

  // Generate data for the current week
  const startOfCurrentWeek = startOfWeek(new Date());
  const dayLabels = Array.from({ length: 7 }, (_, i) => 
    format(addDays(startOfCurrentWeek, i), 'EEE')
  );

  // Initialize data with 0 counts for each day
  const appointmentsPerDay = dayLabels.map(day => ({
    name: day,
    value: 0
  }));

  // Count appointments per day
  appointments.forEach(appointment => {
    const appointmentDate = new Date(appointment.date);
    const dayOfWeek = format(appointmentDate, 'EEE');
    const dayIndex = dayLabels.indexOf(dayOfWeek);
    
    if (dayIndex >= 0) {
      appointmentsPerDay[dayIndex].value += 1;
    }
  });

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={appointmentsPerDay}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" name="Appointments" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}