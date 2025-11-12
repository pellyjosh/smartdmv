/**
 * Practice Storage for Offline Mode
 * 
 * Handles caching and retrieval of accessible practices for offline use.
 * Supports practice switching without network connectivity.
 * 
 * NOTE: Uses the main tenant database 'cache' store instead of a separate database
 */

import { indexedDBManager } from '../db';

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
    const cachedPractices: CachedPractice[] = practices.map(p => ({
      id: p.id,
      name: p.name,
      subdomain: p.subdomain || '',
      companyId: p.companyId || '',
      isActive: p.isActive ?? true,
      cached_at: new Date().toISOString(),
    }));

    const data = {
      id: `accessible_practices_${userId}`,
      userId,
      practices: cachedPractices,
      currentPracticeId: currentPracticeId || null,
      cached_at: new Date().toISOString(),
    };

    await indexedDBManager.put('cache', data);
    
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
    const data = await indexedDBManager.get('cache', `accessible_practices_${userId}`) as any;
    
    if (!data) {
      console.log(`⚠️ [PracticeStorage] No cached practices found for user ${userId}`);
      return null;
    }

    console.log(`✅ [PracticeStorage] Retrieved ${data.practices?.length || 0} cached practices for user ${userId}`);
    return data;
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to retrieve cached practices:', error);
    return null;
  }
}

/**
 * Update current practice for a user
 */
export async function updateCurrentPractice(userId: string, practiceId: string): Promise<void> {
  try {
    const cachedData = await indexedDBManager.get('cache', `accessible_practices_${userId}`) as any;
    
    if (!cachedData) {
      console.warn(`⚠️ [PracticeStorage] No cached practices found for user ${userId}`);
      return;
    }

    // Update current practice
    cachedData.currentPracticeId = practiceId;
    cachedData.cached_at = new Date().toISOString();
    
    await indexedDBManager.put('cache', cachedData);
    
    console.log(`✅ [PracticeStorage] Updated current practice to ${practiceId} for user ${userId}`);
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to update current practice:', error);
    throw error;
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
    const cachedData = await indexedDBManager.get('cache', `accessible_practices_${userId}`) as any;
    
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
    await updateCurrentPractice(userId, newPracticeId);

    console.log(`✅ [PracticeStorage] Switched to practice ${newPracticeId} (${practice.name}) offline`);
    return true;
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to switch practice offline:', error);
    return false;
  }
}

/**
 * Get current practice ID for a user
 */
export async function getCurrentPracticeId(userId: string): Promise<string | null> {
  try {
    const data = await indexedDBManager.get('cache', `accessible_practices_${userId}`) as any;
    return data?.currentPracticeId || null;
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to get current practice:', error);
    return null;
  }
}

/**
 * Get a specific practice by ID from cached practices
 */
export async function getCachedPracticeById(
  userId: string,
  practiceId: string
): Promise<CachedPractice | null> {
  try {
    const data = await indexedDBManager.get('cache', `accessible_practices_${userId}`) as any;
    
    if (!data || !data.practices) {
      return null;
    }

    const practice = data.practices.find(
      (p: CachedPractice) => p.id.toString() === practiceId.toString()
    );

    return practice || null;
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to get practice by ID:', error);
    return null;
  }
}

/**
 * Clear all cached practices for a user
 */
export async function clearCachedPractices(userId: string): Promise<void> {
  try {
    await indexedDBManager.delete('cache', `accessible_practices_${userId}`);
    console.log(`✅ [PracticeStorage] Cleared cached practices for user ${userId}`);
  } catch (error) {
    console.error('❌ [PracticeStorage] Failed to clear cached practices:', error);
    throw error;
  }
}
