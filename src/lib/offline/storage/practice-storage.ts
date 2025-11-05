/**
 * Practice Storage for Offline Mode
 * 
 * Handles caching and retrieval of accessible practices for offline use.
 * Supports practice switching without network connectivity.
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'SmartDMV_OfflineDB';
const DB_VERSION = 2; // Increment version for schema update
const PRACTICES_STORE = 'practices';
const CURRENT_PRACTICE_STORE = 'current_practice';

export interface CachedPractice {
  id: string | number;
  name: string;
  subdomain: string;
  companyId: string;
  isActive: boolean;
  cached_at: string;
}

export interface AccessiblePractices {
  userId: string;
  practices: CachedPractice[];
  currentPracticeId: string | null;
  cached_at: string;
}

/**
 * Open IndexedDB with practice stores
 */
async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(PRACTICES_STORE)) {
        const practiceStore = db.createObjectStore(PRACTICES_STORE, { keyPath: 'userId' });
        practiceStore.createIndex('by_user', 'userId', { unique: true });
      }
      
      if (!db.objectStoreNames.contains(CURRENT_PRACTICE_STORE)) {
        db.createObjectStore(CURRENT_PRACTICE_STORE, { keyPath: 'userId' });
      }

      console.log('🏥 [PracticeStorage] Database upgraded from version', oldVersion, 'to', newVersion);
    },
  });
}

/**
 * Cache accessible practices for a user
 */
export async function cacheAccessiblePractices(
  userId: string,
  practices: Array<{
    id: string | number;
    name: string;
    subdomain?: string;
    companyId?: string;
    isActive?: boolean;
  }>,
  currentPracticeId?: string | null
): Promise<void> {
  try {
    const db = await getDB();
    
    const cachedPractices: CachedPractice[] = practices.map(p => ({
      id: p.id,
      name: p.name,
      subdomain: p.subdomain || '',
      companyId: p.companyId || '',
      isActive: p.isActive ?? true,
      cached_at: new Date().toISOString(),
    }));

    const data: AccessiblePractices = {
      userId,
      practices: cachedPractices,
      currentPracticeId: currentPracticeId || null,
      cached_at: new Date().toISOString(),
    };

    await db.put(PRACTICES_STORE, data);
    
    console.log(`✅ [PracticeStorage] Cached ${practices.length} practices for user ${userId}`);
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to cache practices:', error);
    throw error;
  }
}

/**
 * Get cached accessible practices for a user
 */
export async function getCachedAccessiblePractices(userId: string): Promise<AccessiblePractices | null> {
  try {
    const db = await getDB();
    const data = await db.get(PRACTICES_STORE, userId);
    
    if (data) {
      console.log(`✅ [PracticeStorage] Retrieved ${data.practices.length} cached practices for user ${userId}`);
    }
    
    return data || null;
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to get cached practices:', error);
    return null;
  }
}

/**
 * Switch current practice offline
 */
export async function switchPracticeOffline(
  userId: string,
  newPracticeId: string
): Promise<boolean> {
  try {
    const db = await getDB();
    
    // Verify practice exists in cached practices
    const cachedData = await db.get(PRACTICES_STORE, userId);
    if (!cachedData) {
      console.error('❌ [PracticeStorage] No cached practices found for user');
      return false;
    }

    const practice = cachedData.practices.find(
      (p: any) => p.id.toString() === newPracticeId.toString()
    );

    if (!practice) {
      console.error('❌ [PracticeStorage] Practice not found in cached practices');
      return false;
    }

    // Update current practice
    cachedData.currentPracticeId = newPracticeId;
    await db.put(PRACTICES_STORE, cachedData);

    // Store in separate current_practice store for quick access
    await db.put(CURRENT_PRACTICE_STORE, {
      userId,
      practiceId: newPracticeId,
      practiceName: practice.name,
      switched_at: new Date().toISOString(),
    });

    console.log(`✅ [PracticeStorage] Switched to practice ${newPracticeId} (${practice.name}) offline`);
    return true;
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to switch practice offline:', error);
    return false;
  }
}

/**
 * Get current practice ID
 */
export async function getCurrentPracticeId(userId: string): Promise<string | null> {
  try {
    const db = await getDB();
    const current = await db.get(CURRENT_PRACTICE_STORE, userId);
    return current?.practiceId || null;
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to get current practice:', error);
    return null;
  }
}

/**
 * Clear cached practices for a user
 */
export async function clearCachedPractices(userId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(PRACTICES_STORE, userId);
    await db.delete(CURRENT_PRACTICE_STORE, userId);
    console.log(`✅ [PracticeStorage] Cleared cached practices for user ${userId}`);
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to clear cached practices:', error);
  }
}

/**
 * Get practice by ID from cache
 */
export async function getCachedPracticeById(
  userId: string,
  practiceId: string
): Promise<CachedPractice | null> {
  try {
    const data = await getCachedAccessiblePractices(userId);
    if (!data) return null;

    return data.practices.find(p => p.id.toString() === practiceId.toString()) || null;
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to get practice by ID:', error);
    return null;
  }
}
