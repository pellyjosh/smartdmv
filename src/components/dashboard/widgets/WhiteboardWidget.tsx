import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, Activity } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';

interface WhiteboardWidgetProps {
  widget: WidgetConfig;
}

// Mock whiteboard data - replace with real API call
const mockWhiteboardItems = [
  {
    id: 1,
    roomName: 'Room 1',
    petName: 'Buddy',
    ownerName: 'John Smith',
    status: 'in-examination',
    timeIn: '09:00 AM',
    veterinarian: 'Dr. Wilson'
  },
  {
    id: 2,
    roomName: 'Room 2',
    petName: 'Luna',
    ownerName: 'Sarah Johnson',
    status: 'waiting',
    timeIn: '10:15 AM',
    veterinarian: 'Dr. Smith'
  },
  {
    id: 3,
    roomName: 'Surgery',
    petName: 'Max',
    ownerName: 'Mike Davis',
    status: 'in-surgery',
    timeIn: '11:00 AM',
    veterinarian: 'Dr. Brown'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'in-examination':
      return 'default';
    case 'waiting':
      return 'secondary';
    case 'in-surgery':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export const WhiteboardWidget: React.FC<WhiteboardWidgetProps> = ({ widget }) => {
  return (
    <div className="space-y-3">
      {mockWhiteboardItems.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Activity className="mx-auto h-8 w-8 mb-2" />
          <p>No active patients</p>
        </div>
      ) : (
        mockWhiteboardItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm font-medium">
                <MapPin className="h-4 w-4 mr-1" />
                {item.roomName}
              </div>
              <div>
                <p className="font-medium">{item.petName}</p>
                <p className="text-sm text-muted-foreground flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {item.ownerName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={getStatusColor(item.status)}>
                {item.status.replace('-', ' ')}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {item.veterinarian} • {item.timeIn}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
