/**
 * Authentication types for offline functionality
 */

/**
 * Encrypted authentication token stored offline
 */
export interface OfflineAuthToken {
  id: string;
  userId: number;
  tenantId: string;
  practiceId: number;
  encryptedToken: string; // JWT token (obfuscated)
  encryptedRefreshToken?: string;
  expiresAt: number;
  refreshExpiresAt?: number;
  createdAt: number;
  lastValidated: number;
}

/**
 * User session stored offline
 */
export interface OfflineSession {
  id: string;
  userId: string;
  tenantId: string;
  practiceId?: string;
  currentPracticeId?: string; // For admins who can switch practices
  accessiblePracticeIds?: string[]; // For admins/super admins
  email: string;
  name?: string;
  role: string; // User role (ADMINISTRATOR, VETERINARIAN, etc.)
  roles: string[]; // Additional assigned roles
  assignedLocations?: number[];
  assignedDepartments?: string[];
  preferences: SessionPreferences;
  expiresAt: string; // ISO timestamp
  createdAt: number;
  lastActivity: number;
}

/**
 * Session preferences
 */
export interface SessionPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  offlineEnabled: boolean;
  autoSync: boolean;
  syncInterval?: number;
}

/**
 * Token validation result
 */
export interface TokenValidation {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  expiresIn?: number; // milliseconds until expiry
  reason?: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  isOffline: boolean;
  session: OfflineSession | null;
  tokenValidation: TokenValidation | null;
  lastSync: number;
}

/**
 * Auth storage operations result
 */
export interface AuthStorageResult {
  success: boolean;
  session?: OfflineSession;
  error?: string;
}
