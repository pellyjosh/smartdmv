/**
 * Conflict Storage
 * Manages sync conflict storage in IndexedDB
 * PRACTICE SCOPED: Each practice has its own conflicts store
 */

import type { Conflict, ConflictResolution, ConflictType, ConflictSeverity } from '../types/sync-engine.types';
import { indexedDBManager } from '../db/manager';
import { STORES, getPracticeStoreName } from '../db/schema';
import { getOfflineTenantContext } from '../core/tenant-context';

/**
 * Get practice-specific conflicts store name
 */
async function getConflictsStoreName(): Promise<string | null> {
  const context = await getOfflineTenantContext();
  if (!context) {
    return null;
  }
  return getPracticeStoreName(context.practiceId.toString(), STORES.CONFLICTS);
}

export async function saveConflict(conflict: Conflict): Promise<number> {
  const storeName = await getConflictsStoreName();
  if (!storeName) {
    throw new Error('No tenant context for saving conflict');
  }
  const id = await indexedDBManager.add(storeName, conflict);
  console.log('💥 Conflict saved:', { id, type: conflict.conflictType, store: storeName });
  return id as number;
}

export async function getConflict(id: number): Promise<Conflict | null> {
  const storeName = await getConflictsStoreName();
  if (!storeName) {
    return null;
  }
  return await indexedDBManager.get<Conflict>(storeName, id);
}

export async function getAllConflicts(): Promise<Conflict[]> {
  try {
    const storeName = await getConflictsStoreName();
    if (!storeName) {
      console.log('[ConflictStorage] No tenant context, returning empty conflicts');
      return [];
    }

    // Now each practice has its own conflicts store - no filtering needed!
    return await indexedDBManager.getAll<Conflict>(storeName);
  } catch (error) {
    console.error('[ConflictStorage] Error getting conflicts:', error);
    return [];
  }
}

export async function getUnresolvedConflicts(): Promise<Conflict[]> {
  const all = await getAllConflicts();
  return all.filter(c => !c.resolved);
}

export async function getConflictsByEntityType(entityType: string): Promise<Conflict[]> {
  const all = await getAllConflicts();
  return all.filter(c => c.operation.entityType === entityType);
}

export async function getConflictsByType(type: ConflictType): Promise<Conflict[]> {
  const storeName = await getConflictsStoreName();
  if (!storeName) {
    return [];
  }
  return await indexedDBManager.queryByIndex<Conflict>(storeName, 'conflictType', type);
}

export async function resolveConflict(id: number, resolution: ConflictResolution): Promise<void> {
  const conflict = await getConflict(id);
  if (!conflict) throw new Error(`Conflict ${id} not found`);
  
  conflict.resolved = true;
  conflict.resolvedAt = Date.now();
  conflict.resolution = resolution;
  
  const storeName = await getConflictsStoreName();
  if (!storeName) {
    throw new Error('No tenant context for resolving conflict');
  }
  
  await indexedDBManager.put(storeName, conflict);
  console.log('✅ Conflict resolved:', { id, strategy: resolution.strategy });
}

export async function bulkResolveConflicts(ids: number[], strategy: ConflictResolution['strategy']): Promise<void> {
  for (const id of ids) {
    await resolveConflict(id, { strategy, appliedAt: Date.now() });
  }
}

export async function deleteConflict(id: number): Promise<void> {
  const storeName = await getConflictsStoreName();
  if (!storeName) {
    throw new Error('No tenant context for deleting conflict');
  }
  await indexedDBManager.delete(storeName, id);
}

export async function clearAllConflicts(): Promise<void> {
  try {
    const storeName = await getConflictsStoreName();
    if (!storeName) {
      console.log('[ConflictStorage] No tenant context, cannot clear conflicts');
      return;
    }

    // Clear all conflicts in the practice-specific store
    await indexedDBManager.clear(storeName);
    
    console.log(`🗑️ Cleared all conflicts from ${storeName}`);
  } catch (error) {
    console.error('[ConflictStorage] Error clearing conflicts:', error);
  }
}

/**
 * Clear ALL conflicts globally across all practices (use with caution - for debugging)
 */
export async function clearAllConflictsGlobally(): Promise<void> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      console.log('[ConflictStorage] No tenant context');
      return;
    }

    // This is now more complex - we'd need to iterate through all practice stores
    // For now, just log a warning
    console.warn('⚠️ clearAllConflictsGlobally is deprecated - conflicts are now practice-scoped');
    console.warn('⚠️ Delete the entire IndexedDB database to clear all conflicts');
  } catch (error) {
    console.error('[ConflictStorage] Error:', error);
  }
}

export async function getConflictStats() {
  const all = await getAllConflicts();
  const stats = {
    total: all.length,
    unresolved: all.filter(c => !c.resolved).length,
    resolved: all.filter(c => c.resolved).length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  };
  for (const c of all) {
    stats.byType[c.conflictType] = (stats.byType[c.conflictType] || 0) + 1;
    stats.bySeverity[c.severity] = (stats.bySeverity[c.severity] || 0) + 1;
  }
  return stats;
}
