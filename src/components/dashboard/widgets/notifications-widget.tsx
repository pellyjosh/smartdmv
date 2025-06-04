import { useQuery } from "@tanstack/react-query";
import { WidgetConfig } from "@/hooks/use-dashboard-config";
import { Notification } from "@shared/schema";
import { Loader2, Bell } from "lucide-react";
import { format, formatDistanceToNow } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";

interface NotificationsWidgetProps {
  widget: WidgetConfig;
}

export function NotificationsWidget({ widget }: NotificationsWidgetProps) {
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No notifications
      </div>
    );
  }

  // Filter to show only unread or recent notifications
  const filteredNotifications = notifications
    .filter(n => !n.read || new Date(n.createdAt as unknown as string).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
    .slice(0, 5); // Show only the first 5

  if (filteredNotifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recent notifications
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-2 rounded-md ${!notification.read ? 'bg-primary/5' : ''}`}
        >
          <div className="flex items-start gap-2">
            {!notification.read && (
              <Badge variant="outline" className="bg-primary text-primary-foreground h-2 w-2 rounded-full p-0" />
            )}
            <div className="flex-1">
              <div className="font-medium">{notification.title}</div>
              <div className="text-sm text-muted-foreground">{notification.message}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(notification.createdAt as unknown as string), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}