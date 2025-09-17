// src/components/notifications/notification-provider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
  practiceId?: string;
}

export function NotificationProvider({ children, userId, practiceId }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (practiceId) params.append('practiceId', practiceId);
      params.append('limit', '50');

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedNotifications = data.notifications || [];
        setNotifications(fetchedNotifications);
        setUnreadCount(fetchedNotifications.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Add new notification (for real-time updates)
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification for new notifications
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      });
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications?markAllRead=true', {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Remove notification
  const removeNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Initial fetch and periodic polling
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, practiceId]);

  // WebSocket connection for real-time notifications (if available)
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPort = window.location.port === '3000' ? '3001' : '3001'; // Adjust based on your websocket server port
        const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔌 WebSocket connected for notifications');
          // Subscribe to user-specific notifications
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: `notifications:${userId}`,
            practiceId: practiceId
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', data);
            
            if (data.type === 'notification' && data.notification) {
              console.log('🔔 New notification received via WebSocket:', data.notification);
              addNotification(data.notification);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.warn('⚠️ WebSocket error (falling back to polling):', error);
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
        };

        return () => {
          ws.close();
        };
      } catch (error) {
        console.warn('Failed to connect to WebSocket (using polling only):', error);
      }
    }
  }, [userId, practiceId]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
