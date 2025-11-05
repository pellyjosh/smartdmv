/**
 * Temporary ID Resolver
 * 
 * Manages generation, mapping, and resolution of temporary IDs.
 * Critical for maintaining entity relationships during offline operations.
 */

import type { IdMapping, RelationshipMap } from '../types/sync-engine.types';
import * as idMappingStorage from '../storage/id-mapping-storage';
import { isTempId } from '../utils/diff-utils';
import { indexedDBManager } from '../db/manager';
import { STORES } from '../db/schema';

/**
 * Generate a unique temporary ID
 * Format: temp_<timestamp>_<random>_<entityType>
 */
export function generateTempId(entityType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `temp_${timestamp}_${random}_${entityType}`;
}

/**
 * Check if an ID is temporary
 */
export function isTempIdValue(id: string | number): boolean {
  return isTempId(id);
}

/**
 * Map a temporary ID to a real ID from server
 */
export async function mapTempToReal(
  tempId: string,
  realId: number,
  entityType: string,
  operationId: number
): Promise<void> {
  const mapping: IdMapping = {
    tempId,
    realId,
    entityType,
    createdAt: Date.now(),
    syncedAt: Date.now(),
    operationId
  };
  
  await idMappingStorage.saveIdMapping(mapping);
  console.log(`🔗 Mapped temp ID: ${tempId} → ${realId}`);
  
  // Update all references to this temp ID
  await updateReferencesInDatabase(entityType, tempId, realId);
}

/**
 * Resolve a temporary ID to its real ID
 */
export async function resolveTempId(tempId: string): Promise<number | null> {
  if (!isTempIdValue(tempId)) {
    return typeof tempId === 'number' ? tempId : parseInt(tempId, 10);
  }
  return await idMappingStorage.getRealId(tempId);
}

/**
 * Resolve all temporary IDs in an object
 */
export async function resolveAllTempIds(data: any): Promise<any> {
  if (!data || typeof data !== 'object') return data;
  
  const resolved = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in resolved) {
    const value = resolved[key];
    
    if (isTempIdValue(value)) {
      const realId = await resolveTempId(value);
      if (realId !== null) {
        resolved[key] = realId;
      }
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = await resolveAllTempIds(value);
    }
  }
  
  return resolved;
}

/**
 * Bulk map temporary IDs from server response
 */
export async function bulkMapTempIds(mappings: IdMapping[]): Promise<void> {
  await idMappingStorage.bulkSaveIdMappings(mappings);
  
  // Update all references for each mapping
  for (const mapping of mappings) {
    await updateReferencesInDatabase(mapping.entityType, mapping.tempId, mapping.realId);
  }
  
  console.log(`🔗 Bulk mapped ${mappings.length} temp IDs`);
}

/**
 * Update all references to a temp ID across all stores
 */
async function updateReferencesInDatabase(
  entityType: string,
  tempId: string,
  realId: number
): Promise<void> {
  // Entity stores that might reference this ID
  const storesToCheck = [
    STORES.APPOINTMENTS,
    STORES.CLIENTS,
    STORES.PETS,
    STORES.SOAP_NOTES,
    STORES.INVOICES,
    STORES.PRESCRIPTIONS,
    STORES.MEDICAL_RECORDS,
  ];
  
  for (const storeName of storesToCheck) {
    try {
      const entities = await indexedDBManager.getAll<any>(storeName);
      
      for (const entity of entities) {
        let updated = false;
        
        // Check all potential relationship fields
        const relationshipFields = [
          'clientId', 'petId', 'appointmentId', 'practitionerId',
          'userId', 'invoiceId', 'medicalRecordId', 'parentId'
        ];
        
        for (const field of relationshipFields) {
          if (entity[field] === tempId) {
            entity[field] = realId;
            updated = true;
          }
        }
        
        // Check nested objects
        if (entity.data && typeof entity.data === 'object') {
          entity.data = await resolveAllTempIds(entity.data);
          updated = true;
        }
        
        if (updated) {
          await indexedDBManager.put(storeName, entity);
          console.log(`🔄 Updated reference in ${storeName}: ${tempId} → ${realId}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to update references in ${storeName}:`, error);
    }
  }
}

/**
 * Extract all temp IDs from an object
 */
export function extractTempIds(data: any): string[] {
  const tempIds: string[] = [];
  
  function extract(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      const value = obj[key];
      if (isTempIdValue(value)) {
        tempIds.push(value as string);
      } else if (typeof value === 'object' && value !== null) {
        extract(value);
      }
    }
  }
  
  extract(data);
  return [...new Set(tempIds)]; // Remove duplicates
}

/**
 * Check if data has any unresolved temp IDs
 */
export async function hasUnresolvedTempIds(data: any): Promise<boolean> {
  const tempIds = extractTempIds(data);
  
  for (const tempId of tempIds) {
    const realId = await resolveTempId(tempId);
    if (realId === null) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get all unresolved temp IDs in data
 */
export async function getUnresolvedTempIds(data: any): Promise<string[]> {
  const tempIds = extractTempIds(data);
  const unresolved: string[] = [];
  
  for (const tempId of tempIds) {
    const realId = await resolveTempId(tempId);
    if (realId === null) {
      unresolved.push(tempId);
    }
  }
  
  return unresolved;
}

/**
 * Resolve dependencies for an operation
 * Returns true if all dependencies are resolved
 */
export async function resolveDependencies(
  operation: any,
  dependencies: string[]
): Promise<boolean> {
  for (const depTempId of dependencies) {
    const realId = await resolveTempId(depTempId);
    if (realId === null) {
      return false; // Dependency not yet resolved
    }
  }
  return true;
}

/**
 * Get mapping for a temp ID
 */
export async function getMapping(tempId: string): Promise<IdMapping | null> {
  const realId = await idMappingStorage.getRealId(tempId);
  if (realId === null) return null;
  
  // Find the full mapping
  const mappings = await idMappingStorage.getMappingsByEntityType(
    tempId.split('_').pop() || ''
  );
  return mappings.find(m => m.tempId === tempId) || null;
}

/**
 * Get all pending temp ID resolutions
 */
export async function getPendingResolutions(): Promise<string[]> {
  // Get all operations in sync queue
  const operations = await indexedDBManager.getAll<any>(STORES.SYNC_QUEUE);
  const allTempIds = new Set<string>();
  
  for (const op of operations) {
    const tempIds = extractTempIds(op);
    tempIds.forEach(id => allTempIds.add(id));
  }
  
  // Check which ones are unresolved
  const pending: string[] = [];
  for (const tempId of allTempIds) {
    const resolved = await idMappingStorage.hasTempId(tempId);
    if (!resolved) {
      pending.push(tempId);
    }
  }
  
  return pending;
}

/**
 * Clean up old resolved temp ID mappings
 */
export async function cleanupResolvedMappings(daysOld: number = 30): Promise<number> {
  const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  const allMappings = await indexedDBManager.getAll<IdMapping>(STORES.ID_MAPPINGS);
  
  let cleaned = 0;
  for (const mapping of allMappings) {
    if (mapping.syncedAt && mapping.syncedAt < cutoffTime) {
      await idMappingStorage.deleteIdMapping(mapping.tempId);
      cleaned++;
    }
  }
  
  console.log(`🧹 Cleaned up ${cleaned} old temp ID mappings`);
  return cleaned;
}

/**
 * Validate temp ID format
 */
export function isValidTempId(tempId: string): boolean {
  const pattern = /^temp_\d+_[a-z0-9]+_[a-z]+$/i;
  return pattern.test(tempId);
}

/**
 * Extract entity type from temp ID
 */
export function getEntityTypeFromTempId(tempId: string): string | null {
  if (!isValidTempId(tempId)) return null;
  const parts = tempId.split('_');
  return parts[parts.length - 1] || null;
}

/**
 * Get timestamp from temp ID
 */
export function getTimestampFromTempId(tempId: string): number | null {
  if (!isValidTempId(tempId)) return null;
  const parts = tempId.split('_');
  const timestamp = parseInt(parts[1], 10);
  return isNaN(timestamp) ? null : timestamp;
}
