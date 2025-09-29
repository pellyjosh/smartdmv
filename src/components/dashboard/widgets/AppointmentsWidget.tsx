import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, User } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';
import { useQuery } from '@tanstack/react-query';

interface AppointmentsWidgetProps {
  widget: WidgetConfig;
}

interface Appointment {
  id: number;
  time: string;
  petName: string;
  ownerName: string;
  type: string;
  status: string;
}

// Memoize widget to prevent unnecessary re-renders
export const AppointmentsWidget: React.FC<AppointmentsWidgetProps> = React.memo(({ widget }) => {
  // Fetch appointments from API
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', 'today'],
    queryFn: async () => {
      const response = await fetch('/api/appointments/today');
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    placeholderData: []
  });

  return (
    <div className="space-y-3">
      {appointments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <CalendarDays className="mx-auto h-8 w-8 mb-2" />
          <p>No appointments scheduled</p>
        </div>
      ) : (
        appointments.map((appointment: Appointment) => (
          <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {appointment.time}
              </div>
              <div>
                <p className="font-medium">{appointment.petName}</p>
                <p className="text-sm text-muted-foreground flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {appointment.ownerName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={appointment.status === 'in-progress' ? 'default' : 'secondary'}>
                {appointment.status}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">{appointment.type}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
});
