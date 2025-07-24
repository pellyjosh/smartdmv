import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { WidgetConfig } from '@/hooks/use-dashboard-config';

interface NotificationsWidgetProps {
  widget: WidgetConfig;
}

// Mock notification data - replace with real API call
const mockNotifications = [
  {
    id: 1,
    title: 'Low Stock Alert',
    message: 'Vaccination supplies running low',
    type: 'warning',
    time: '5 minutes ago',
    read: false
  },
  {
    id: 2,
    title: 'Appointment Reminder',
    message: 'Luna\'s checkup in 30 minutes',
    type: 'info',
    time: '10 minutes ago',
    read: false
  },
  {
    id: 3,
    title: 'Lab Results Ready',
    message: 'Max\'s blood work completed',
    type: 'success',
    time: '1 hour ago',
    read: true
  }
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getNotificationVariant = (type: string) => {
  switch (type) {
    case 'warning':
      return 'destructive';
    case 'error':
      return 'destructive';
    case 'success':
      return 'default';
    default:
      return 'secondary';
  }
};

export const NotificationsWidget: React.FC<NotificationsWidgetProps> = ({ widget }) => {
  return (
    <div className="space-y-3">
      {mockNotifications.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Bell className="mx-auto h-8 w-8 mb-2" />
          <p>No new notifications</p>
        </div>
      ) : (
        mockNotifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`flex items-start space-x-3 p-3 border rounded-lg ${
              !notification.read ? 'bg-blue-50/50 border-blue-200' : ''
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{notification.title}</p>
                {!notification.read && (
                  <Badge variant={getNotificationVariant(notification.type)} className="text-xs">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
