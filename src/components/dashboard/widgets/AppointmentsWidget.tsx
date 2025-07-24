import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, User } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';

interface AppointmentsWidgetProps {
  widget: WidgetConfig;
}

// Mock appointment data - replace with real API call
const mockAppointments = [
  {
    id: 1,
    time: '09:00 AM',
    petName: 'Buddy',
    ownerName: 'John Smith',
    type: 'Checkup',
    status: 'scheduled'
  },
  {
    id: 2,
    time: '10:30 AM',
    petName: 'Luna',
    ownerName: 'Sarah Johnson',
    type: 'Vaccination',
    status: 'in-progress'
  },
  {
    id: 3,
    time: '11:15 AM',
    petName: 'Max',
    ownerName: 'Mike Davis',
    type: 'Surgery',
    status: 'scheduled'
  }
];

export const AppointmentsWidget: React.FC<AppointmentsWidgetProps> = ({ widget }) => {
  return (
    <div className="space-y-3">
      {mockAppointments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <CalendarDays className="mx-auto h-8 w-8 mb-2" />
          <p>No appointments scheduled</p>
        </div>
      ) : (
        mockAppointments.map((appointment) => (
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
};
