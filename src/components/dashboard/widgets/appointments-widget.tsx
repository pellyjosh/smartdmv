import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { WidgetConfig } from "@/hooks/use-dashboard-config";
import { Loader2, Calendar, Clock, User } from "lucide-react";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Practitioner {
  id: string;
  name: string;
}

interface DashboardAppointment {
  id: string;
  title: string;
  description?: string;
  date: number;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "confirmed";
  pet: Pet | null;
  client: Client | null;
  practitioner: Practitioner | null;
}

interface AppointmentsWidgetProps {
  widget: WidgetConfig;
}

// Format timestamp to readable date string
function formatAppointmentDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow =
    date.toDateString() ===
    new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (isTomorrow) {
    return `Tomorrow, ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

export function AppointmentsWidget({ widget }: AppointmentsWidgetProps) {
  const {
    data: appointments,
    isLoading,
    error,
  } = useQuery<DashboardAppointment[]>({
    queryKey: ["dashboard-appointments"],
    queryFn: async () => {
      const response = await fetch(
        "/api/dashboard/appointments?limit=25&days=7"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
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

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load appointments
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No upcoming appointments</p>
      </div>
    );
  }

  const visible = appointments;

  return (
    <div className={containerClass}>
      {visible.map((appointment) => (
        <div
          key={appointment.id}
          className="flex justify-between items-start p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1 truncate">
              {appointment.title}
            </div>

            {appointment.pet && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                <span className="truncate">
                  {appointment.pet.name} ({appointment.pet.species})
                </span>
              </div>
            )}

            {appointment.client && (
              <div className="text-xs text-muted-foreground truncate mb-1">
                Client: {appointment.client.name}
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatAppointmentDate(appointment.date)}</span>
              <span>({appointment.duration}min)</span>
            </div>
          </div>

          <div className="ml-2 flex-shrink-0">
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                appointment.status === "scheduled"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-300"
                  : appointment.status === "confirmed"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/70 dark:text-green-300"
                  : appointment.status === "completed"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-300"
              }`}
            >
              {appointment.status.charAt(0).toUpperCase() +
                appointment.status.slice(1)}
            </div>
          </div>
        </div>
      ))}
      {appointments.length > 5 && (
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
