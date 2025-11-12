/**
 * Practice Context Manager
 * 
 * Manages practice switching in offline mode with proper data isolation.
 * Ensures data from different practices doesn't conflict when syncing.
 */

import {
  getCachedAccessiblePractices,
  switchPracticeOffline,
  getCurrentPracticeId,
  getCachedPracticeById,
} from '../storage/practice-storage';
import { getPracticeStoreName } from '../db/schema';

/**
 * Practice context for current session
 */
interface PracticeContext {
  userId: string;
  practiceId: string;
  practiceName: string;
  tenantId: string;
  isOffline: boolean;
}

let currentPracticeContext: PracticeContext | null = null;

/**
 * Initialize practice context
 */
export async function initializePracticeContext(
  userId: string,
  practiceId: string,
  tenantId: string
): Promise<PracticeContext> {
  try {
    // Try to get practice from cache
    const practice = await getCachedPracticeById(userId, practiceId);
    
    currentPracticeContext = {
      userId,
      practiceId,
      practiceName: practice?.name || `Practice ${practiceId}`,
      tenantId,
      isOffline: !navigator.onLine,
    };

    console.log('🏥 [PracticeContext] Initialized:', currentPracticeContext);
    return currentPracticeContext;
  } catch (error) {
    console.error('❌ [PracticeContext] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Get current practice context
 */
export function getCurrentPracticeContext(): PracticeContext | null {
  return currentPracticeContext;
}

/**
 * Switch practice (works offline)
 */
export async function switchPractice(
  userId: string,
  newPracticeId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const isOnline = navigator.onLine;

    if (isOnline) {
      console.log('🌐 [PracticeContext] Switching practice online');
      // Online: Use server action
      // This will be handled by the caller (UserContext/switchPracticeAction)
      return true;
    } else {
      console.log('📴 [PracticeContext] Switching practice offline');
      
      // Offline: Use local cache
      const success = await switchPracticeOffline(userId, newPracticeId);
      
      if (success) {
        // Update context
        const practice = await getCachedPracticeById(userId, newPracticeId);
        
        currentPracticeContext = {
          userId,
          practiceId: newPracticeId,
          practiceName: practice?.name || `Practice ${newPracticeId}`,
          tenantId,
          isOffline: true,
        };

        console.log('✅ [PracticeContext] Practice switched offline:', currentPracticeContext);
        
        // Queue sync when back online
        await queuePracticeSwitchSync(userId, newPracticeId);
      }

      return success;
    }
  } catch (error) {
    console.error('❌ [PracticeContext] Failed to switch practice:', error);
    return false;
  }
}

/**
 * Get practice-specific store name for data isolation
 */
export function getPracticeSpecificStoreName(
  baseStoreName: string,
  context?: PracticeContext
): string {
  const ctx = context || currentPracticeContext;
  
  if (!ctx) {
    console.warn('⚠️ [PracticeContext] No context available, using base store');
    return baseStoreName;
  }

  // Use practice ID only since tenant has separate database
  return getPracticeStoreName(ctx.practiceId.toString(), baseStoreName);
}

/**
 * Check if user has access to practice
 */
export async function hasAccessToPractice(
  userId: string,
  practiceId: string
): Promise<boolean> {
  try {
    const cachedPractices = await getCachedAccessiblePractices(userId);
    
    if (!cachedPractices) {
      console.warn('⚠️ [PracticeContext] No cached practices found');
      return false;
    }

    return cachedPractices.practices.some(
      p => p.id.toString() === practiceId.toString()
    );
  } catch (error) {
    console.error('❌ [PracticeContext] Failed to check practice access:', error);
    return false;
  }
}

/**
 * Queue practice switch for sync when back online
 */
async function queuePracticeSwitchSync(
  userId: string,
  practiceId: string
): Promise<void> {
  try {
    const syncItem = {
      id: `practice_switch_${Date.now()}`,
      type: 'practice_switch',
      userId,
      practiceId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      priority: 'high',
    };

    // This will be picked up by the sync manager when online
    const db = await openOfflineDB();
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    await new Promise((resolve, reject) => {
      const request = store.add(syncItem);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
    
    console.log('✅ [PracticeContext] Queued practice switch for sync');
  } catch (error) {
    console.error('❌ [PracticeContext] Failed to queue sync:', error);
  }
}

/**
 * Helper to open offline DB (DEPRECATED - now uses main tenant database)
 */
async function openOfflineDB() {
  // This function is deprecated - we now use the main tenant database via indexedDBManager
  // Kept for backwards compatibility but returns the tenant database instead
  const { indexedDBManager } = await import('../db');
  return indexedDBManager.getDatabase();
}

/**
 * Get all accessible practices for user
 */
export async function getAccessiblePractices(userId: string) {
  return getCachedAccessiblePractices(userId);
}

/**
 * Clear practice context (on logout)
 */
export function clearPracticeContext(): void {
  currentPracticeContext = null;
  console.log('🧹 [PracticeContext] Context cleared');
}
