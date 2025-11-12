/**
 * Conflict Storage
 * Manages sync conflict storage in IndexedDB
 */

import type { Conflict, ConflictResolution, ConflictType, ConflictSeverity } from '../types/sync-engine.types';
import { indexedDBManager } from '../db/manager';
import { STORES } from '../db/schema';

export async function saveConflict(conflict: Conflict): Promise<number> {
  const id = await indexedDBManager.add(STORES.CONFLICTS, conflict);
  console.log('💥 Conflict saved:', { id, type: conflict.conflictType });
  return id as number;
}

export async function getConflict(id: number): Promise<Conflict | null> {
  return await indexedDBManager.get<Conflict>(STORES.CONFLICTS, id);
}

export async function getAllConflicts(): Promise<Conflict[]> {
  try {
    // Check if tenant context is set
    const { tenantId } = indexedDBManager.getCurrentTenant();
    if (!tenantId) {
      console.log('[ConflictStorage] No tenant context, returning empty conflicts');
      return [];
    }
    return await indexedDBManager.getAll<Conflict>(STORES.CONFLICTS);
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
  return await indexedDBManager.queryByIndex<Conflict>(STORES.CONFLICTS, 'conflictType', type);
}

export async function resolveConflict(id: number, resolution: ConflictResolution): Promise<void> {
  const conflict = await getConflict(id);
  if (!conflict) throw new Error(`Conflict ${id} not found`);
  
  conflict.resolved = true;
  conflict.resolvedAt = Date.now();
  conflict.resolution = resolution;
  
  await indexedDBManager.put(STORES.CONFLICTS, conflict);
  console.log('✅ Conflict resolved:', { id, strategy: resolution.strategy });
}

export async function bulkResolveConflicts(ids: number[], strategy: ConflictResolution['strategy']): Promise<void> {
  for (const id of ids) {
    await resolveConflict(id, { strategy, appliedAt: Date.now() });
  }
}

export async function deleteConflict(id: number): Promise<void> {
  await indexedDBManager.delete(STORES.CONFLICTS, id);
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
