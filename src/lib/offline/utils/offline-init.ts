/**
 * Offline Initialization Helper
 * Ensures tenant context is set before any offline operations
 */

import { indexedDBManager } from '../db/manager';
import { storageManager } from '../managers/storage-manager';
import { initializeNetworkMonitoring } from '../core/network-monitor';

/**
 * Initialize offline system with user context
 * Call this immediately after user logs in or session is restored
 */
export async function initializeOfflineSystem(context: {
  tenantId: string;
  practiceId: number | string;
  userId: number | string;
}): Promise<void> {
  try {
    const { tenantId, practiceId, userId } = context;
    
    console.log('[OfflineInit] 🔧 Starting initialization with:', {
      tenantId,
      practiceId,
      userId,
    });

    // Convert to appropriate types
    const practiceIdNum = typeof practiceId === 'string' ? parseInt(practiceId, 10) : practiceId;
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    console.log('[OfflineInit] 📝 Converted types:', {
      practiceIdNum,
      userIdNum,
      practiceIdType: typeof practiceIdNum,
      userIdType: typeof userIdNum,
    });

    // Initialize storage manager (this sets tenant context)
    console.log('[OfflineInit] 🎯 Calling storageManager.initialize...');
    await storageManager.initialize(tenantId, practiceIdNum, userIdNum);

    // Initialize network monitoring for auto-sync
    console.log('[OfflineInit] 📶 Initializing network monitoring...');
    initializeNetworkMonitoring({
      syncOnReconnect: true,
      autoSyncEnabled: true,
    });

    console.log('[OfflineInit] ✅ Offline system initialized successfully');
  } catch (error) {
    console.error('[OfflineInit] ❌ Failed to initialize offline system:', error);
    throw error;
  }
}

/**
 * Switch practice context for offline system
 */
export async function switchOfflinePractice(
  tenantId: string,
  practiceId: number | string
): Promise<void> {
  try {
    console.log('[OfflineInit] Switching practice:', { tenantId, practiceId });

    const practiceIdString = typeof practiceId === 'number' ? practiceId.toString() : practiceId;

    // Set new tenant/practice context
    indexedDBManager.setCurrentTenant(tenantId, practiceIdString);

    // Register practice if not already registered
    await indexedDBManager.registerPractice(practiceIdString, tenantId);

    console.log('[OfflineInit] Practice switched successfully');
  } catch (error) {
    console.error('[OfflineInit] Failed to switch practice:', error);
    throw error;
  }
}

/**
 * Clear offline context on logout
 */
export function clearOfflineSystem(): void {
  try {
    console.log('[OfflineInit] Clearing offline system');
    indexedDBManager.clearCurrentTenant();
    console.log('[OfflineInit] Offline system cleared');
  } catch (error) {
    console.error('[OfflineInit] Failed to clear offline system:', error);
  }
}

/**
 * Check if offline system is initialized
 */
export function isOfflineInitialized(): boolean {
  const { tenantId } = indexedDBManager.getCurrentTenant();
  return tenantId !== null;
}

/**
 * Get current offline context
 */
export function getOfflineContext(): { tenantId: string | null; practiceId: string | null } {
  return indexedDBManager.getCurrentTenant();
}
