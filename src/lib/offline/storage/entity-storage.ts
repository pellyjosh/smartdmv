/**
 * Entity storage for offline functionality
 * Handles CRUD operations for all entity types with tenant isolation
 */

import { indexedDBManager } from '../db/manager';
import { getTenantStoreName } from '../db/schema';
import { getOfflineTenantContext, ensureTenantIsolation } from '../core/tenant-context';
import type {
  OfflineEntity,
  EntityMetadata,
  SyncStatus,
  EntityQuery,
  StorageOperationResult,
  BatchOperationResult,
} from '../types/storage.types';
import { validateEntity, validateMetadata, sanitizeData, estimateSize } from '../utils/validation';
import { generateTempId, isTempId } from '../utils/encryption';
import {
  ValidationError,
  EntityNotFoundError,
  DatabaseError,
  TenantMismatchError,
} from '../utils/error-handlers';

/**
 * Save entity with metadata
 */
export async function saveEntity<T extends { id?: number | string }>(
  entityType: string,
  data: T,
  syncStatus: SyncStatus = 'pending'
): Promise<OfflineEntity<T>> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new TenantMismatchError('', 'No tenant context');
    }

    // Ensure practice is registered with tenant database
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);

    // Generate temp ID if not provided
    const entityId = data.id || generateTempId(entityType);
    
    const metadata: EntityMetadata = {
      tenantId: context.tenantId,
      practiceId: context.practiceId,
      userId: context.userId,
      createdAt: Date.now(),
      lastModified: Date.now(),
      syncStatus,
      version: 1,
    };

    const entity: OfflineEntity<T> = {
      id: entityId,
      data: sanitizeData({ ...data, id: entityId }),
      metadata,
    };

    // Validate entity structure
    const validation = validateEntity(entity);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    await indexedDBManager.put(storeName, entity);

    console.log(`[EntityStorage] Saved ${entityType} ${entityId} (${syncStatus})`);
    return entity;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof TenantMismatchError) {
      throw error;
    }
    throw new DatabaseError(`Failed to save ${entityType}`, error as Error);
  }
}

/**
 * Get entity by ID
 */
export async function getEntity<T>(
  entityType: string,
  entityId: number | string
): Promise<T | null> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      return null;
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    const entity = await indexedDBManager.get<OfflineEntity<T>>(storeName, entityId);

    if (!entity) {
      return null;
    }

    // Verify tenant isolation
    if (entity.metadata.tenantId !== context.tenantId) {
      throw new TenantMismatchError(context.tenantId, entity.metadata.tenantId);
    }

    return entity.data;
  } catch (error) {
    if (error instanceof TenantMismatchError) {
      throw error;
    }
    throw new DatabaseError(`Failed to get ${entityType} ${entityId}`, error as Error);
  }
}

/**
 * Get all entities with optional filters
 */
export async function getAllEntities<T>(
  entityType: string,
  query?: EntityQuery
): Promise<T[]> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      return [];
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    let entities = await indexedDBManager.getAll<OfflineEntity<T>>(storeName);

    // Apply filters
    if (query) {
      entities = applyFilters(entities, query, context.tenantId);
    }

    return entities.map((e) => e.data);
  } catch (error) {
    throw new DatabaseError(`Failed to get all ${entityType}`, error as Error);
  }
}

/**
 * Update entity
 */
export async function updateEntity<T extends { id: number | string }>(
  entityType: string,
  entityId: number | string,
  updates: Partial<T>,
  syncStatus: SyncStatus = 'pending'
): Promise<OfflineEntity<T>> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new TenantMismatchError('', 'No tenant context');
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    const existing = await indexedDBManager.get<OfflineEntity<T>>(storeName, entityId);

    if (!existing) {
      throw new EntityNotFoundError(entityType, entityId);
    }

    // Verify tenant isolation
    if (existing.metadata.tenantId !== context.tenantId) {
      throw new TenantMismatchError(context.tenantId, existing.metadata.tenantId);
    }

    // Merge updates
    const updatedData = { ...existing.data, ...updates, id: entityId };
    
    existing.data = sanitizeData(updatedData);
    existing.metadata.lastModified = Date.now();
    existing.metadata.syncStatus = syncStatus;
    existing.metadata.version += 1;
    existing.metadata.modifiedBy = context.userId;

    await indexedDBManager.put(storeName, existing);

    console.log(`[EntityStorage] Updated ${entityType} ${entityId}`);
    return existing;
  } catch (error) {
    if (error instanceof EntityNotFoundError || error instanceof TenantMismatchError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update ${entityType} ${entityId}`, error as Error);
  }
}

/**
 * Delete entity (soft delete)
 */
export async function deleteEntity(
  entityType: string,
  entityId: number | string
): Promise<void> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new TenantMismatchError('', 'No tenant context');
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    const existing = await indexedDBManager.get<OfflineEntity<any>>(storeName, entityId);

    if (!existing) {
      throw new EntityNotFoundError(entityType, entityId);
    }

    // Verify tenant isolation
    if (existing.metadata.tenantId !== context.tenantId) {
      throw new TenantMismatchError(context.tenantId, existing.metadata.tenantId);
    }

    // Mark as deleted (tombstone) instead of hard delete
    existing.metadata.syncStatus = 'pending';
    existing.metadata.lastModified = Date.now();
    (existing.data as any)._deleted = true;

    await indexedDBManager.put(storeName, existing);

    console.log(`[EntityStorage] Deleted ${entityType} ${entityId} (tombstone)`);
  } catch (error) {
    if (error instanceof EntityNotFoundError || error instanceof TenantMismatchError) {
      throw error;
    }
    throw new DatabaseError(`Failed to delete ${entityType} ${entityId}`, error as Error);
  }
}

/**
 * Hard delete entity (remove from storage)
 */
export async function hardDeleteEntity(
  entityType: string,
  entityId: number | string
): Promise<void> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new TenantMismatchError('', 'No tenant context');
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    await indexedDBManager.delete(storeName, entityId);

    console.log(`[EntityStorage] Hard deleted ${entityType} ${entityId}`);
  } catch (error) {
    throw new DatabaseError(`Failed to hard delete ${entityType} ${entityId}`, error as Error);
  }
}

/**
 * Bulk save entities
 */
export async function bulkSaveEntities<T extends { id?: number | string }>(
  entityType: string,
  entities: T[],
  syncStatus: SyncStatus = 'synced'
): Promise<BatchOperationResult> {
  const result: BatchOperationResult = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const entity of entities) {
    try {
      await saveEntity(entityType, entity, syncStatus);
      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        entityId: entity.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log(
    `[EntityStorage] Bulk save ${entityType}: ${result.successful} successful, ${result.failed} failed`
  );
  return result;
}

/**
 * Count entities
 */
export async function countEntities(
  entityType: string,
  query?: EntityQuery
): Promise<number> {
  const entities = await getAllEntities(entityType, query);
  return entities.length;
}

/**
 * Get entities by sync status
 */
export async function getEntitiesByStatus<T>(
  entityType: string,
  syncStatus: SyncStatus
): Promise<T[]> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      return [];
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    const entities = await indexedDBManager.queryByIndex<OfflineEntity<T>>(
      storeName,
      'syncStatus',
      syncStatus
    );

    return entities.map((e) => e.data);
  } catch (error) {
    throw new DatabaseError(`Failed to get ${entityType} by status`, error as Error);
  }
}

/**
 * Clear all entities for entity type
 */
export async function clearEntityType(entityType: string): Promise<void> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new TenantMismatchError('', 'No tenant context');
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    await indexedDBManager.clear(storeName);

    console.log(`[EntityStorage] Cleared all ${entityType}`);
  } catch (error) {
    throw new DatabaseError(`Failed to clear ${entityType}`, error as Error);
  }
}

/**
 * Get entity metadata
 */
export async function getEntityMetadata(
  entityType: string,
  entityId: number | string
): Promise<EntityMetadata | null> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      return null;
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    const entity = await indexedDBManager.get<OfflineEntity<any>>(storeName, entityId);

    return entity?.metadata || null;
  } catch (error) {
    throw new DatabaseError(`Failed to get metadata for ${entityType} ${entityId}`, error as Error);
  }
}

/**
 * Update entity sync status
 */
export async function updateEntitySyncStatus(
  entityType: string,
  entityId: number | string,
  syncStatus: SyncStatus,
  serverVersion?: number
): Promise<void> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new TenantMismatchError('', 'No tenant context');
    }

    const storeName = getTenantStoreName(context.tenantId, entityType);
    const entity = await indexedDBManager.get<OfflineEntity<any>>(storeName, entityId);

    if (!entity) {
      throw new EntityNotFoundError(entityType, entityId);
    }

    entity.metadata.syncStatus = syncStatus;
    entity.metadata.lastSyncedAt = Date.now();
    
    if (serverVersion) {
      entity.metadata.serverVersion = serverVersion;
    }

    await indexedDBManager.put(storeName, entity);
  } catch (error) {
    throw new DatabaseError(`Failed to update sync status for ${entityType} ${entityId}`, error as Error);
  }
}

/**
 * Helper: Apply filters to entities
 */
function applyFilters<T>(
  entities: OfflineEntity<T>[],
  query: EntityQuery,
  currentTenantId: string
): OfflineEntity<T>[] {
  let filtered = entities;

  // Tenant filter (always enforce)
  filtered = filtered.filter((e) => e.metadata.tenantId === currentTenantId);

  // Practice filter
  if (query.practiceId) {
    filtered = filtered.filter((e) => e.metadata.practiceId === query.practiceId);
  }

  // Sync status filter
  if (query.syncStatus) {
    filtered = filtered.filter((e) => e.metadata.syncStatus === query.syncStatus);
  }

  // Time filter
  if (query.since) {
    filtered = filtered.filter((e) => e.metadata.lastModified >= query.since!);
  }

  // Sort
  if (query.sortBy) {
    const order = query.sortOrder === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      const aVal = (a.metadata as any)[query.sortBy!] || 0;
      const bVal = (b.metadata as any)[query.sortBy!] || 0;
      return (aVal - bVal) * order;
    });
  }

  // Pagination
  if (query.offset !== undefined) {
    filtered = filtered.slice(query.offset);
  }
  if (query.limit !== undefined) {
    filtered = filtered.slice(0, query.limit);
  }

  return filtered;
}
