/**
 * ID Mapping Storage
 * Manages temporary ID to real ID mappings
 */

import type { IdMapping } from '../types/sync-engine.types';
import { indexedDBManager } from '../db/manager';
import { STORES } from '../db/schema';

export async function saveIdMapping(mapping: IdMapping): Promise<void> {
  await indexedDBManager.add(STORES.ID_MAPPINGS, mapping);
  console.log('🔗 ID mapping saved:', { temp: mapping.tempId, real: mapping.realId });
}

export async function getRealId(tempId: string): Promise<number | null> {
  const mappings = await indexedDBManager.queryByIndex<IdMapping>(STORES.ID_MAPPINGS, 'tempId', tempId);
  return mappings.length > 0 ? mappings[0].realId : null;
}

export async function getTempId(realId: number, entityType: string): Promise<string | null> {
  const all = await indexedDBManager.getAll<IdMapping>(STORES.ID_MAPPINGS);
  const mapping = all.find(m => m.realId === realId && m.entityType === entityType);
  return mapping ? mapping.tempId : null;
}

export async function getMappingsByEntityType(entityType: string): Promise<IdMapping[]> {
  return await indexedDBManager.queryByIndex<IdMapping>(STORES.ID_MAPPINGS, 'entityType', entityType);
}

export async function bulkSaveIdMappings(mappings: IdMapping[]): Promise<void> {
  for (const mapping of mappings) {
    await saveIdMapping(mapping);
  }
  console.log(`🔗 Bulk saved ${mappings.length} ID mappings`);
}

export async function hasTempId(tempId: string): Promise<boolean> {
  const realId = await getRealId(tempId);
  return realId !== null;
}

export async function deleteIdMapping(tempId: string): Promise<void> {
  const mappings = await indexedDBManager.queryByIndex<IdMapping>(STORES.ID_MAPPINGS, 'tempId', tempId);
  if (mappings.length > 0 && mappings[0].id) {
    await indexedDBManager.delete(STORES.ID_MAPPINGS, mappings[0].id);
  }
}

export async function clearAllIdMappings(): Promise<void> {
  await indexedDBManager.clear(STORES.ID_MAPPINGS);
}

export async function getIdMappingStats() {
  const all = await indexedDBManager.getAll<IdMapping>(STORES.ID_MAPPINGS);
  const stats = {
    total: all.length,
    byEntityType: {} as Record<string, number>
  };
  for (const m of all) {
    stats.byEntityType[m.entityType] = (stats.byEntityType[m.entityType] || 0) + 1;
  }
  return stats;
}
