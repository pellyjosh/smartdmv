// src/components/notifications/notification-wrapper.tsx
'use client';

import React from 'react';
import { NotificationProvider } from './notification-provider';
import { useUser } from '@/context/UserContext';

interface NotificationWrapperProps {
  children: React.ReactNode;
}

export function NotificationWrapper({ children }: NotificationWrapperProps) {
  const { user, isLoading } = useUser();
  // Get practice ID based on user type
  const getPracticeId = () => {
    if (!user) return undefined;
    if ('practiceId' in user && (user as any).practiceId) {
      return (user as any).practiceId.toString();
    }
    if ('currentPracticeId' in user && (user as any).currentPracticeId) {
      return (user as any).currentPracticeId.toString();
    }
    return undefined;
  };

  // Always render the NotificationProvider to ensure useNotifications() is safe to call
  // If user data isn't ready, pass undefined IDs — provider will no-op until userId is provided
  const userId = user?.id ? user.id.toString() : undefined;
  const practiceId = user ? getPracticeId() : undefined;

  return (
    <NotificationProvider 
      userId={userId}
      practiceId={practiceId}
    >
      {children}
    </NotificationProvider>
  );
}
