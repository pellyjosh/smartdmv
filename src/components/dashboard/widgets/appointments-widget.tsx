import { useQuery } from "@tanstack/react-query";
import type { WidgetConfig } from "@/hooks/use-dashboard-config"; // Assuming this path is correct
import type { Appointment } from "@/schemas/appointment";
import { Loader2 } from "lucide-react";
import { format } from "@/lib/date-utils"; // Assuming you have this utility

interface AppointmentsWidgetProps {
  widget: WidgetConfig; // Note: 'widget' prop is currently unused in the provided logic
}

export function AppointmentsWidget({ widget }: AppointmentsWidgetProps) {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'], // This will fetch data from your /api/appointments endpoint
    // queryFn: async () => { /* Your actual data fetching logic here */ }
    // Ensure you have a queryFn defined or that react-query's default GET behavior is intended
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
        No upcoming appointments
      </div>
    );
  }

  // Sort appointments by date and take the first 5
  const sortedAppointments = [...appointments]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); 

  return (
    <div className="space-y-3">
      {sortedAppointments.map((appointment) => (
        <div
          key={appointment.id}
          className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0"
        >
          <div>
            <div className="font-medium">{appointment.title}</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(appointment.date), "MMM d, h:mm a")}
            </div>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            appointment.status === "scheduled" 
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-300" 
              : appointment.status === "completed"
              ? "bg-green-100 text-green-700 dark:bg-green-900/70 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-300" // Assuming other statuses are 'cancelled' or similar
          }`}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </div>
        </div>
      ))}
    </div>
  );
}