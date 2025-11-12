/**
 * React hook for offline authentication
 */

import { useState, useEffect, useCallback } from 'react';
import { indexedDBManager } from '@/lib/offline/db';
import { STORES } from '@/lib/offline/db/schema';
import { clearOfflineTenantContext } from '@/lib/offline/core/tenant-context';
import type { OfflineSession, TokenValidation } from '@/lib/offline/types/auth.types';

export interface UseOfflineAuthReturn {
  session: OfflineSession | null;
  isAuthenticated: boolean;
  isTokenValid: boolean;
  isLoading: boolean;
  tokenValidation: TokenValidation | null;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export function useOfflineAuth(): UseOfflineAuthReturn {
  const [session, setSession] = useState<OfflineSession | null>(null);
  const [tokenValidation, setTokenValidation] = useState<TokenValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First: check for a cached offline_session in localStorage (fast path)
      if (typeof window !== 'undefined') {
        const sessionStr = localStorage.getItem('offline_session');
        if (sessionStr) {
          try {
            const stored = JSON.parse(sessionStr);
            console.log('[useOfflineAuth] ⚡ Found offline_session in localStorage:', {
              hasRole: !!stored.role,
              role: stored.role,
              hasRoles: !!stored.roles,
              roles: stored.roles,
              savedAt: stored.savedAt ? new Date(stored.savedAt).toISOString() : 'no timestamp',
              keys: Object.keys(stored),
            });

            // Only use localStorage if it has a valid role (not UNKNOWN and not empty)
            if (stored.role && stored.role !== 'UNKNOWN') {
              const fallbackSession: OfflineSession = {
                id: 'offline-session',
                userId: String(stored.userId || stored.userId),
                tenantId: stored.tenantId || '',
                practiceId: stored.practiceId?.toString(),
                currentPracticeId: stored.practiceId?.toString(),
                accessiblePracticeIds: stored.accessiblePracticeIds || [],
                email: stored.email || '',
                name: stored.name || '',
                role: stored.role, // Don't default to UNKNOWN here
                // Keep roles as objects array, not strings
                roles: Array.isArray(stored.roles) ? stored.roles : (stored.role ? [{ name: stored.role, displayName: stored.role }] : []),
                assignedLocations: stored.assignedLocations || [],
                assignedDepartments: stored.assignedDepartments || [],
                preferences: stored.preferences || { offlineEnabled: true, autoSync: false },
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                createdAt: Date.now(),
                lastActivity: Date.now(),
              };

              setSession(fallbackSession);
              setTokenValidation({ isValid: true, isExpired: false, needsRefresh: false, expiresIn: 24 * 60 * 60 * 1000 });
              setIsLoading(false);
              console.log('[useOfflineAuth] ✅ Used localStorage session with role:', stored.role);
              return;
            } else {
              console.warn('[useOfflineAuth] ⚠️ localStorage has invalid role, falling back to IndexedDB:', stored.role);
            }
          } catch (err) {
            console.warn('[useOfflineAuth] Failed to parse offline_session, falling back to DB read', err);
          }
        } else {
          console.log('[useOfflineAuth] No offline_session in localStorage, trying IndexedDB');
        }
      }

      // Try to load any session from IndexedDB
      let allSessions;
      try {
        allSessions = await indexedDBManager.getAll<OfflineSession>(STORES.SESSIONS);
      } catch (dbError: any) {
        // If no tenant context is set, offline features are disabled
        if (dbError?.message?.includes('No tenant context')) {
          console.log('[useOfflineAuth] ⚠️ No tenant context - offline features disabled');
          setSession(null);
          setTokenValidation(null);
          setIsLoading(false);
          return;
        }
        throw dbError; // Re-throw other errors
      }
      
      if (!allSessions || allSessions.length === 0) {
        console.log('[useOfflineAuth] No offline sessions found');
        setSession(null);
        setTokenValidation(null);
        return;
      }

      // Get the most recent valid session
      const validSessions = allSessions.filter(s => {
        const expiresAt = new Date(s.expiresAt).getTime();
        return expiresAt > Date.now();
      });

      if (validSessions.length === 0) {
        console.log('[useOfflineAuth] All sessions expired');
        setSession(null);
        setTokenValidation(null);
        return;
      }

      // Sort by last activity and get most recent
      validSessions.sort((a, b) => b.lastActivity - a.lastActivity);
      const userSession = validSessions[0];

      // Check if the session has a valid role
      if (!userSession.role || userSession.role === 'UNKNOWN') {
        console.warn('[useOfflineAuth] ⚠️ IndexedDB session has invalid role:', userSession.role, 'clearing session');
        // Clear the invalid session
        await indexedDBManager.delete(STORES.SESSIONS, userSession.id);
        setSession(null);
        setTokenValidation(null);
        return;
      }

      // Validate token
      const validation: TokenValidation = {
        isValid: true,
        isExpired: false,
        needsRefresh: false,
        expiresIn: new Date(userSession.expiresAt).getTime() - Date.now(),
      };

      console.log('[useOfflineAuth] Loaded session for user:', userSession.email);
      setSession(userSession);
      setTokenValidation(validation);
    } catch (error) {
      console.error('[useOfflineAuth] Load error:', error);
      setSession(null);
      setTokenValidation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Clear all sessions from IndexedDB
      if (session?.id) {
        await indexedDBManager.delete(STORES.AUTH_TOKENS, session.id);
        await indexedDBManager.delete(STORES.SESSIONS, session.id);
      }
      
      clearOfflineTenantContext();
      setSession(null);
      setTokenValidation(null);
      
      console.log('[useOfflineAuth] Logged out and cleared session');
    } catch (error) {
      console.error('[useOfflineAuth] Logout error:', error);
    }
  }, [session]);

  const refreshAuth = useCallback(async () => {
    await loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const isAuthenticated = session !== null && tokenValidation?.isValid === true;
  const isTokenValid = tokenValidation?.isValid === true;

  return {
    session,
    isAuthenticated,
    isTokenValid,
    isLoading,
    tokenValidation,
    logout,
    refreshAuth,
  };
}
