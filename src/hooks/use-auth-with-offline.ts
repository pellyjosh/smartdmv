/**
 * Authentication hook with offline mode support
 * 
 * This hook wraps the standard user authentication and adds offline fallback:
 * 1. Try to fetch user from server (/api/auth/me)
 * 2. If network error or server unavailable, fall back to offline storage
 * 3. Validate offline session and return cached user data
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { useOfflineAuth } from '@/hooks/offline/use-offline-auth';
import { useNetworkStatus } from './use-network-status';
import { indexedDBManager } from '@/lib/offline/db';
import type { User } from '@/context/UserContext';

export interface UseAuthWithOfflineReturn {
  user: User | null;
  isLoading: boolean;
  isOfflineMode: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuthWithOffline(): UseAuthWithOfflineReturn {
  const { user: onlineUser, isLoading: isOnlineLoading } = useUser();
  const { session, isAuthenticated, isTokenValid, refreshAuth } = useOfflineAuth();
  const { isOnline } = useNetworkStatus();
  
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineUser, setOfflineUser] = useState<User | null>(null);

  // Check for offline API response
  const checkOfflineMode = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      // Check if API returned offline flag
      if (data?.offline === true && data?.useOfflineStorage === true) {
        console.log('[useAuthWithOffline] Server returned offline flag, switching to offline mode');
        setIsOfflineMode(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[useAuthWithOffline] Error checking offline mode:', error);
      return false;
    }
  }, []);

  // Load user from offline storage
  const loadOfflineUser = useCallback(async () => {
    if (!isAuthenticated || !isTokenValid || !session) {
      console.log('[useAuthWithOffline] No valid offline session');
      setOfflineUser(null);
      return;
    }

    try {
      console.log('[useAuthWithOffline] Loading offline user from session:', {
        userId: session.userId,
        tenantId: session.tenantId,
        practiceId: session.practiceId,
      });

      // CRITICAL: Set tenant context in IndexedDB manager first!
      await indexedDBManager.setCurrentTenant(
        session.tenantId,
        session.practiceId?.toString()
      );
      console.log('[useAuthWithOffline] ✅ Tenant context set in IndexedDB manager');

      // Reconstruct user object from offline session
      // This assumes session has user data stored
      const reconstructedUser: User = {
        id: session.userId,
        email: session.email || '',
        name: session.name || '',
        role: session.role as any,
        // Add other fields based on role
        ...(session.practiceId && { practiceId: session.practiceId }),
        ...(session.currentPracticeId && { currentPracticeId: session.currentPracticeId }),
        ...(session.accessiblePracticeIds && { accessiblePracticeIds: session.accessiblePracticeIds }),
        ...(session.assignedLocations && { assignedLocations: session.assignedLocations }),
        ...(session.assignedDepartments && { assignedDepartments: session.assignedDepartments }),
      } as any;
      
      // Check if the role is valid before proceeding
      if (!reconstructedUser.role) {
        console.error('[useAuthWithOffline] ❌ Session has no role, cannot load offline user');
        setOfflineUser(null);
        setError('Invalid offline session role');
        return;
      }
      
      // IMPORTANT: Add roles array for sidebar role checking (cast to any to bypass type check)
      (reconstructedUser as any).roles = session.roles || [session.role];

      console.log('[useAuthWithOffline] ✅ Loaded user from offline storage:', reconstructedUser.email, {
        role: reconstructedUser.role,
        roles: (reconstructedUser as any).roles,
        roleNames: Array.isArray((reconstructedUser as any).roles) 
          ? (reconstructedUser as any).roles.map((r: any) => r?.name || r)
          : 'not-array'
      });
      setOfflineUser(reconstructedUser);
    } catch (error) {
      console.error('[useAuthWithOffline] ❌ Error loading offline user:', error);
      setOfflineUser(null);
      setError('Failed to load offline user data');
    }
  }, [isAuthenticated, isTokenValid, session]);

  // Determine which user to return
  useEffect(() => {
    const initAuth = async () => {
      // If we have an online user, use that
      if (onlineUser) {
        console.log('[useAuthWithOffline] Using online user:', onlineUser.email);
        setIsOfflineMode(false);
        setError(null);
        return;
      }

      // If we're definitely offline, use offline mode immediately
      if (!isOnline) {
        console.log('[useAuthWithOffline] Network is offline, using offline mode');
        setIsOfflineMode(true);
        await loadOfflineUser();
        return;
      }

      // If we're online but no user and still loading, wait
      if (isOnlineLoading) {
        console.log('[useAuthWithOffline] Still loading online user...');
        return;
      }

      // If we're online, not loading, and still no user, check if we should use offline
      if (isOnline && !isOnlineLoading && !onlineUser) {
        // Check if we have a valid offline session
        if (isAuthenticated && isTokenValid && session) {
          console.log('[useAuthWithOffline] Online user unavailable but offline session exists, using offline mode');
          setIsOfflineMode(true);
          await loadOfflineUser();
        } else {
          console.log('[useAuthWithOffline] No online or offline user available');
          setIsOfflineMode(false);
        }
        return;
      }
    };

    initAuth();
  }, [onlineUser, isOnline, isOnlineLoading, isAuthenticated, isTokenValid, session, loadOfflineUser]);

  // Refetch function - tries online first, falls back to offline
  const refetch = useCallback(async () => {
    if (isOnline) {
      try {
        // Force reload by checking auth endpoint
        await checkOfflineMode();
      } catch (error) {
        console.error('[useAuthWithOffline] Online refetch failed, using offline:', error);
        setIsOfflineMode(true);
        await loadOfflineUser();
      }
    } else {
      await loadOfflineUser();
    }
  }, [isOnline, checkOfflineMode, loadOfflineUser]);

  return {
    user: isOfflineMode ? offlineUser : onlineUser,
    isLoading: isOnlineLoading && !isOfflineMode,
    isOfflineMode,
    error,
    refetch,
  };
}
