/**
 * Authentication storage for offline functionality
 * Handles token and session management
 */

import { indexedDBManager } from '../db/manager';
import { STORES } from '../db/schema';
import type {
  OfflineAuthToken,
  OfflineSession,
  TokenValidation,
  AuthStorageResult,
} from '../types/auth.types';
import { obfuscateToken, deobfuscateToken, generateTempId } from '../utils/encryption';
import { InvalidTokenError, DatabaseError } from '../utils/error-handlers';

/**
 * Save authentication token
 */
export async function saveAuthToken(
  userId: number,
  tenantId: string,
  practiceId: number,
  token: string,
  refreshToken?: string,
  expiresIn?: number
): Promise<OfflineAuthToken> {
  try {
    const now = Date.now();
    const expiresAt = expiresIn ? now + expiresIn * 1000 : now + 24 * 60 * 60 * 1000; // Default 24h

    const authToken: OfflineAuthToken = {
      id: generateTempId('auth'),
      userId,
      tenantId,
      practiceId,
      encryptedToken: obfuscateToken(token),
      encryptedRefreshToken: refreshToken ? obfuscateToken(refreshToken) : undefined,
      expiresAt,
      refreshExpiresAt: refreshToken ? expiresAt + 7 * 24 * 60 * 60 * 1000 : undefined, // 7 days
      createdAt: now,
      lastValidated: now,
    };

    await indexedDBManager.put(STORES.AUTH_TOKENS, authToken);
    return authToken;
  } catch (error) {
    throw new DatabaseError('Failed to save auth token', error as Error);
  }
}

/**
 * Get authentication token for user
 */
export async function getAuthToken(
  userId: number,
  tenantId: string
): Promise<OfflineAuthToken | null> {
  try {
    const tokens = await indexedDBManager.queryByIndex<OfflineAuthToken>(
      STORES.AUTH_TOKENS,
      'userId',
      userId
    );

    // Find token for this tenant
    const token = tokens.find((t) => t.tenantId === tenantId);
    return token || null;
  } catch (error) {
    throw new DatabaseError('Failed to get auth token', error as Error);
  }
}

/**
 * Get decrypted token string
 */
export async function getDecryptedToken(
  userId: number,
  tenantId: string
): Promise<string | null> {
  const authToken = await getAuthToken(userId, tenantId);
  if (!authToken) return null;

  return deobfuscateToken(authToken.encryptedToken);
}

/**
 * Validate token
 */
export async function validateToken(
  userId: number,
  tenantId: string
): Promise<TokenValidation> {
  const authToken = await getAuthToken(userId, tenantId);

  if (!authToken) {
    return {
      isValid: false,
      isExpired: true,
      needsRefresh: false,
      reason: 'Token not found',
    };
  }

  const now = Date.now();
  const isExpired = authToken.expiresAt < now;
  const needsRefresh = authToken.expiresAt - now < 5 * 60 * 1000; // Less than 5 minutes left
  const expiresIn = authToken.expiresAt - now;

  return {
    isValid: !isExpired,
    isExpired,
    needsRefresh: needsRefresh && !isExpired,
    expiresIn: isExpired ? 0 : expiresIn,
  };
}

/**
 * Update token last validated timestamp
 */
export async function updateTokenValidation(
  userId: number,
  tenantId: string
): Promise<void> {
  try {
    const authToken = await getAuthToken(userId, tenantId);
    if (!authToken) {
      throw new InvalidTokenError('Token not found');
    }

    authToken.lastValidated = Date.now();
    await indexedDBManager.put(STORES.AUTH_TOKENS, authToken);
  } catch (error) {
    throw new DatabaseError('Failed to update token validation', error as Error);
  }
}

/**
 * Save user session
 */
export async function saveSession(session: Omit<OfflineSession, 'id' | 'createdAt' | 'lastActivity'>): Promise<OfflineSession> {
  try {
    const now = Date.now();
    const fullSession: OfflineSession = {
      ...session,
      id: generateTempId('session'),
      createdAt: now,
      lastActivity: now,
    };

    await indexedDBManager.put(STORES.SESSIONS, fullSession);
    
    // Store in localStorage for quick access with all user data for offline mode
    if (typeof window !== 'undefined') {
      const localStorageData = {
        tenantId: session.tenantId,
        practiceId: session.practiceId,
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role || 'UNKNOWN', // Ensure role is never undefined
        roles: session.roles || [],
        currentPracticeId: session.currentPracticeId,
        accessiblePracticeIds: session.accessiblePracticeIds || [],
        assignedLocations: session.assignedLocations || [],
        assignedDepartments: session.assignedDepartments || [],
        preferences: session.preferences || { offlineEnabled: true, autoSync: false },
        subdomain: typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : '',
        savedAt: Date.now(), // Add timestamp to track when it was saved
      };
      localStorage.setItem('offline_session', JSON.stringify(localStorageData));
      console.log('[saveSession] 💾 Saved to localStorage:', {
        role: localStorageData.role,
        roles: localStorageData.roles,
        savedAt: new Date(localStorageData.savedAt).toISOString()
      });
    }

    return fullSession;
  } catch (error) {
    throw new DatabaseError('Failed to save session', error as Error);
  }
}

/**
 * Get user session
 */
export async function getSession(
  userId: number,
  tenantId: string
): Promise<OfflineSession | null> {
  try {
    const sessions = await indexedDBManager.queryByIndex<OfflineSession>(
      STORES.SESSIONS,
      'userId',
      userId
    );

    const session = sessions.find((s) => s.tenantId === tenantId);
    return session || null;
  } catch (error) {
    throw new DatabaseError('Failed to get session', error as Error);
  }
}

/**
 * Update session activity
 */
export async function updateSessionActivity(
  userId: number,
  tenantId: string
): Promise<void> {
  try {
    const session = await getSession(userId, tenantId);
    if (!session) return;

    session.lastActivity = Date.now();
    await indexedDBManager.put(STORES.SESSIONS, session);
  } catch (error) {
    throw new DatabaseError('Failed to update session activity', error as Error);
  }
}

/**
 * Clear authentication data (logout)
 */
export async function clearAuth(userId?: number, tenantId?: string): Promise<void> {
  try {
    if (userId && tenantId) {
      // Clear specific user/tenant
      const authToken = await getAuthToken(userId, tenantId);
      if (authToken) {
        await indexedDBManager.delete(STORES.AUTH_TOKENS, authToken.id);
      }

      const session = await getSession(userId, tenantId);
      if (session) {
        await indexedDBManager.delete(STORES.SESSIONS, session.id);
      }
    } else {
      // Clear all auth data
      await indexedDBManager.clear(STORES.AUTH_TOKENS);
      await indexedDBManager.clear(STORES.SESSIONS);
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('offline_session');
    }
  } catch (error) {
    throw new DatabaseError('Failed to clear auth data', error as Error);
  }
}

/**
 * Get all sessions (for admin/debugging)
 */
export async function getAllSessions(): Promise<OfflineSession[]> {
  try {
    return await indexedDBManager.getAll<OfflineSession>(STORES.SESSIONS);
  } catch (error) {
    throw new DatabaseError('Failed to get all sessions', error as Error);
  }
}

/**
 * Check if user is authenticated offline
 */
export async function isAuthenticatedOffline(
  userId: number,
  tenantId: string
): Promise<boolean> {
  const validation = await validateToken(userId, tenantId);
  const session = await getSession(userId, tenantId);
  
  return validation.isValid && session !== null;
}
