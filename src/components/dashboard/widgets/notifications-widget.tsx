import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { WidgetConfig } from "@/hooks/use-dashboard-config";
import {
  Loader2,
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  type:
    | "appointment"
    | "healthPlan"
    | "message"
    | "system"
    | "info"
    | "alert"
    | "reminder";
  read: boolean;
  link?: string | null;
  relatedId?: string | null;
  relatedType?: string | null;
  createdAt: number;
  updatedAt: number;
  user?: {
    id: string;
    name: string;
  } | null;
  practice?: {
    id: string;
    name: string;
  } | null;
}

interface NotificationsWidgetProps {
  widget: WidgetConfig;
}

// Get the appropriate icon for notification type
function getNotificationIcon(type: string) {
  switch (type) {
    case "appointment":
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case "alert":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "message":
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case "system":
      return <Info className="h-4 w-4 text-gray-500" />;
    default:
      return <Bell className="h-4 w-4 text-yellow-500" />;
  }
}

// Format timestamp to readable time
function formatNotificationTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );
    return diffInMinutes <= 1 ? "Just now" : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }
}

export function NotificationsWidget({ widget }: NotificationsWidgetProps) {
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    error,
  } = useQuery<DashboardNotification[]>({
    queryKey: ["dashboard-notifications"],
    queryFn: async () => {
      const response = await fetch(
        "/api/dashboard/notifications?limit=25&includeRead=false"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    staleTime: 60 * 1000, // Data is fresh for 1 minute
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

  // Mutation to mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds, markAsRead: true }),
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-notifications"] });
    },
  });

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
        Failed to load notifications
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No new notifications</p>
      </div>
    );
  }

  const visible = notifications;

  return (
    <div className={containerClass}>
      {visible.map((notification) => (
        <div
          key={notification.id}
          className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
            !notification.read
              ? "border-primary/20 bg-primary/5"
              : "border-border"
          }`}
          onClick={() => {
            if (!notification.read) {
              markAsReadMutation.mutate([notification.id]);
            }
            if (notification.link) {
              window.location.href = notification.link;
            }
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm truncate">
                  {notification.title}
                </div>
                {!notification.read && (
                  <Badge
                    variant="default"
                    className="h-2 w-2 rounded-full p-0 bg-primary"
                  />
                )}
              </div>

              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-muted-foreground">
                  {formatNotificationTime(notification.createdAt)}
                </div>

                {notification.type && (
                  <Badge variant="outline" className="text-xs">
                    {notification.type.charAt(0).toUpperCase() +
                      notification.type.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {notifications.some((n) => !n.read) && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              const unreadIds = notifications
                .filter((n) => !n.read)
                .map((n) => n.id);
              if (unreadIds.length > 0) {
                markAsReadMutation.mutate(unreadIds);
              }
            }}
            disabled={markAsReadMutation.isPending}
          >
            {markAsReadMutation.isPending
              ? "Marking as read..."
              : "Mark all as read"}
          </Button>
        </div>
      )}

      {notifications.length > 5 && (
        <div className="pt-2">
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
