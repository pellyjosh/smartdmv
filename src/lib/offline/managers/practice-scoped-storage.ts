/**
 * Practice-Scoped Offline Storage Wrapper
 * 
 * Wraps existing offline data managers to provide practice-specific data isolation.
 * Ensures data from different practices doesn't conflict when syncing.
 */

import { getPracticeStoreName } from '../db/schema';
import { indexedDBManager } from '../db/manager';
import type { OfflineEntity } from '../types/storage.types';

/**
 * Get current practice context from session
 */
function getCurrentPracticeFromSession(): { practiceId: string; tenantId: string } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const sessionData = sessionStorage.getItem('smartdmv_session');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    const practiceId = session.currentPracticeId || session.practiceId;
    const tenantId = session.tenantId || 'default';
    
    if (practiceId) {
      return { practiceId: practiceId.toString(), tenantId };
    }
  } catch (error) {
    console.error('[PracticeScopedStorage] Error getting practice context:', error);
  }
  
  return null;
}

/**
 * Save entity with practice isolation
 */
export async function saveOfflineEntity<T extends OfflineEntity>(
  storeName: string,
  entity: T,
  practiceId?: string
): Promise<void> {
  const context = getCurrentPracticeFromSession();
  const targetPracticeId = practiceId || context?.practiceId;
  
  if (!targetPracticeId) {
    console.warn('[PracticeScopedStorage] No practice context available, using base store');
    await indexedDBManager.put(storeName, entity);
    return;
  }

  // Ensure metadata includes practice ID
  const enrichedEntity = {
    ...entity,
    metadata: {
      ...entity.metadata,
      practiceId: targetPracticeId,
      tenantId: context?.tenantId || entity.metadata?.tenantId,
    },
  };

  // Use practice-specific store if tenant ID is available
  if (context?.tenantId) {
    const practiceStoreName = getPracticeStoreName(
      targetPracticeId,
      storeName
    );
    
    console.log(`[PracticeScopedStorage] Saving to practice store: ${practiceStoreName}`);
    await indexedDBManager.put(practiceStoreName, enrichedEntity);
  } else {
    // Fallback to base store with practice metadata
    await indexedDBManager.put(storeName, enrichedEntity);
  }
}

/**
 * Get entity with practice isolation
 */
export async function getOfflineEntity<T extends OfflineEntity>(
  storeName: string,
  id: string | number,
  practiceId?: string
): Promise<T | null> {
  const context = getCurrentPracticeFromSession();
  const targetPracticeId = practiceId || context?.practiceId;
  
  if (!targetPracticeId || !context?.tenantId) {
    // No practice context, use base store
    return indexedDBManager.get(storeName, id) as Promise<T | null>;
  }

  const practiceStoreName = getPracticeStoreName(
    targetPracticeId,
    storeName
  );

  return indexedDBManager.get(practiceStoreName, id) as Promise<T | null>;
}

/**
 * Get all entities for current practice
 */
export async function getAllOfflineEntities<T extends OfflineEntity>(
  storeName: string,
  practiceId?: string
): Promise<T[]> {
  const context = getCurrentPracticeFromSession();
  const targetPracticeId = practiceId || context?.practiceId;
  
  if (!targetPracticeId || !context?.tenantId) {
    // No practice context, get all from base store
    const allEntities = await indexedDBManager.getAll(storeName);
    return allEntities as T[];
  }

  const practiceStoreName = getPracticeStoreName(
    targetPracticeId,
    storeName
  );

  const entities = await indexedDBManager.getAll(practiceStoreName);
  return entities as T[];
}

/**
 * Delete entity with practice isolation
 */
export async function deleteOfflineEntity(
  storeName: string,
  id: string | number,
  practiceId?: string
): Promise<void> {
  const context = getCurrentPracticeFromSession();
  const targetPracticeId = practiceId || context?.practiceId;
  
  if (!targetPracticeId || !context?.tenantId) {
    await indexedDBManager.delete(storeName, id);
    return;
  }

  const practiceStoreName = getPracticeStoreName(
    targetPracticeId,
    storeName
  );

  await indexedDBManager.delete(practiceStoreName, id);
}

/**
 * Query entities by practice with filters
 */
export async function queryOfflineEntities<T extends OfflineEntity>(
  storeName: string,
  filter: (entity: T) => boolean,
  practiceId?: string
): Promise<T[]> {
  const allEntities = await getAllOfflineEntities<T>(storeName, practiceId);
  return allEntities.filter(filter);
}

/**
 * Batch save entities with practice isolation
 */
export async function batchSaveOfflineEntities<T extends OfflineEntity>(
  storeName: string,
  entities: T[],
  practiceId?: string
): Promise<void> {
  const context = getCurrentPracticeFromSession();
  const targetPracticeId = practiceId || context?.practiceId;
  
  if (!targetPracticeId || !context?.tenantId) {
    // No practice context, use base store
    for (const entity of entities) {
      await indexedDBManager.put(storeName, entity);
    }
    return;
  }

  const practiceStoreName = getPracticeStoreName(
    targetPracticeId,
    storeName
  );

  // Enrich entities with practice metadata
  const enrichedEntities = entities.map(entity => ({
    ...entity,
    metadata: {
      ...entity.metadata,
      practiceId: targetPracticeId,
      tenantId: context.tenantId,
    },
  }));

  // Save all entities
  for (const entity of enrichedEntities) {
    await indexedDBManager.put(practiceStoreName, entity);
  }

  console.log(`[PracticeScopedStorage] Batch saved ${entities.length} entities to ${practiceStoreName}`);
}

/**
 * Clear all data for a specific practice
 */
export async function clearPracticeData(
  practiceId: string,
  tenantId: string
): Promise<void> {
  try {
    const stores = [
      'pets', 'appointments', 'clients', 'soapNotes', 'invoices',
      'inventory', 'prescriptions', 'labResults', 'medicalRecords', 'vaccinations'
    ];

    for (const storeName of stores) {
      const practiceStoreName = getPracticeStoreName(practiceId, storeName);
      try {
        // Get all entities and delete them
        const entities = await indexedDBManager.getAll(practiceStoreName);
        for (const entity of entities) {
          await indexedDBManager.delete(practiceStoreName, (entity as any).id);
        }
        console.log(`[PracticeScopedStorage] Cleared ${practiceStoreName}`);
      } catch (error) {
        console.warn(`[PracticeScopedStorage] Failed to clear ${practiceStoreName}:`, error);
      }
    }

    console.log(`[PracticeScopedStorage] Cleared all data for practice ${practiceId}`);
  } catch (error) {
    console.error('[PracticeScopedStorage] Failed to clear practice data:', error);
    throw error;
  }
}

/**
 * Get data statistics for a practice
 */
export async function getPracticeDataStats(
  practiceId: string,
  tenantId: string
): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  
  const stores = [
    'pets', 'appointments', 'clients', 'soapNotes', 'invoices',
    'inventory', 'prescriptions', 'labResults', 'medicalRecords', 'vaccinations'
  ];

  for (const storeName of stores) {
    try {
      const entities = await getAllOfflineEntities(storeName, practiceId);
      stats[storeName] = entities.length;
    } catch (error) {
      console.warn(`[PracticeScopedStorage] Failed to get stats for ${storeName}:`, error);
      stats[storeName] = 0;
    }
  }

  return stats;
}
