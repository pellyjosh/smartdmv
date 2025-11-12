/**
 * Entity storage for offline functionality
 * Handles CRUD operations for all entity types with tenant isolation
 */

import { indexedDBManager } from '../db/manager';
import { getPracticeStoreName } from '../db/schema';
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
 * Normalize entity type to plural store name
 * Maps singular entity type to plural store name
 */
function normalizeEntityType(entityType: string): string {
  const mapping: Record<string, string> = {
    'pet': 'pets',
    'appointment': 'appointments',
    'client': 'clients',
    'soapNote': 'soapNotes',
    'invoice': 'invoices',
    'practitioner': 'practitioners',
    'prescription': 'prescriptions',
    'labResult': 'labResults',
    'medicalRecord': 'medicalRecords',
    'vaccination': 'vaccinations',
  };
  
  return mapping[entityType] || entityType;
}

/**
 * Get store name with entity type normalization
 */
function getStoreName(practiceId: string, entityType: string): string {
  const normalizedEntityType = normalizeEntityType(entityType);
  return getPracticeStoreName(practiceId, normalizedEntityType);
}

/**
 * Save entity with metadata
 */
export async function saveEntity<T extends { id?: number | string }>(
  entityType: string,
  data: T,
  syncStatus: SyncStatus = 'pending'
): Promise<OfflineEntity<T>> {
  try {
    console.log('[EntityStorage] Attempting to save:', entityType);
    const context = await getOfflineTenantContext();
    console.log('[EntityStorage] Tenant context:', context);
    
    if (!context) {
      throw new TenantMismatchError('', 'No tenant context');
    }

    // Normalize entity type to plural
    const storeName = getStoreName(context.practiceId.toString(), entityType);
    console.log('[EntityStorage] Target store name:', storeName, '(from entityType:', entityType, ')');

    // Ensure practice is registered with tenant database
    console.log('[EntityStorage] Registering practice:', context.practiceId, 'for tenant:', context.tenantId);
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    console.log('[EntityStorage] Practice registered successfully');

    // Get fresh database connection after registration
    // Re-initialize to ensure we have the updated database with new stores
    console.log('[EntityStorage] Re-initializing database for tenant:', context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    console.log('[EntityStorage] Database:', db.name, 'version:', db.version);
    
    // Convert DOMStringList to array for easier debugging
    const availableStores = Array.from(db.objectStoreNames);
    console.log('[EntityStorage] Available stores:', availableStores);
    console.log('[EntityStorage] Looking for store:', storeName);
    console.log('[EntityStorage] Store exists?:', availableStores.includes(storeName));
    
    if (!availableStores.includes(storeName)) {
      const errorMsg = `Store "${storeName}" not found in database after registration. Available stores: ${availableStores.join(', ')}`;
      console.error('[EntityStorage]', errorMsg);
      throw new DatabaseError(errorMsg);
    }
    
    console.log('[EntityStorage] ✅ Store verified, proceeding with save');

    // Generate temp ID if not provided
    const entityId = data.id || generateTempId(entityType);
    
    // Use tenantId from data if available (from server sync), otherwise use context
    // This ensures server-synced data has the correct tenant DB ID
    const effectiveTenantId = (data as any).tenantId || context.tenantId;
    
    const metadata: EntityMetadata = {
      tenantId: effectiveTenantId,
      practiceId: context.practiceId,
      userId: context.userId,
      createdAt: Date.now(),
      lastModified: Date.now(),
      syncStatus,
      version: 1,
    };

    console.log('[EntityStorage] Generated metadata:', metadata);

    const entity: OfflineEntity<T> = {
      id: entityId,
      data: sanitizeData({ ...data, id: entityId }),
      metadata,
    };

    console.log('[EntityStorage] Entity to validate:', JSON.stringify(entity, null, 2));

    // Validate entity structure
    const validation = validateEntity(entity);
    if (!validation.valid) {
      console.error('[EntityStorage] Validation failed:', validation.errors);
      console.error('[EntityStorage] Entity:', JSON.stringify(entity, null, 2));
      throw new ValidationError(validation.errors);
    }
    
    // Use the same db connection we verified for the put operation
    // This prevents race conditions with cached connections
    console.log('[EntityStorage] Saving to store:', storeName, 'using verified db connection');
    await new Promise<IDBValidKey>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(entity);

        request.onsuccess = () => {
          console.log('[EntityStorage] Put operation successful');
          resolve(request.result);
        };
        request.onerror = () => {
          console.error('[EntityStorage] Put operation failed:', request.error);
          reject(request.error);
        };
        
        tx.onerror = () => {
          console.error('[EntityStorage] Transaction failed:', tx.error);
          reject(tx.error);
        };
      } catch (err) {
        console.error('[EntityStorage] Failed to create transaction:', err);
        reject(err);
      }
    });

    console.log(`[EntityStorage] Saved ${entityType} ${entityId} (${syncStatus})`);
    return entity;
  } catch (error) {
    console.error('[EntityStorage] Save error:', error);
    console.error('[EntityStorage] Error type:', error?.constructor?.name);
    console.error('[EntityStorage] Error message:', (error as Error).message);
    console.error('[EntityStorage] Error stack:', (error as Error).stack);
    
    if (error instanceof ValidationError || error instanceof TenantMismatchError) {
      throw error;
    }
    
    // Preserve original error message when wrapping
    const originalMessage = (error as Error).message || 'Unknown error';
    throw new DatabaseError(
      `Failed to save ${entityType}: ${originalMessage}`,
      error as Error
    );
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

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      console.warn(`[EntityStorage] Store "${storeName}" not found for getEntity`);
      return null;
    }
    
    // Use verified db connection
    const entity = await new Promise<OfflineEntity<T> | undefined>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(entityId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

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
    console.error('[EntityStorage] Get entity error:', error);
    throw new DatabaseError(`Failed to get ${entityType} ${entityId}: ${(error as Error).message}`, error as Error);
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

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      console.warn(`[EntityStorage] Store "${storeName}" not found, returning empty array`);
      return [];
    }
    
    // Use verified db connection for getAll
    let entities = await new Promise<OfflineEntity<T>[]>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    // Apply filters
    if (query) {
      entities = applyFilters(entities, query, context.tenantId);
    }

    return entities.map((e) => e.data);
  } catch (error) {
    console.error('[EntityStorage] Get all error:', error);
    throw new DatabaseError(`Failed to get all ${entityType}: ${(error as Error).message}`, error as Error);
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

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      throw new DatabaseError(`Store "${storeName}" not found for update`);
    }
    
    // Get existing entity using verified connection
    const existing = await new Promise<OfflineEntity<T> | undefined>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(entityId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

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

    // Put using verified connection
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(existing);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    console.log(`[EntityStorage] Updated ${entityType} ${entityId}`);
    return existing;
  } catch (error) {
    if (error instanceof EntityNotFoundError || error instanceof TenantMismatchError) {
      throw error;
    }
    console.error('[EntityStorage] Update error:', error);
    throw new DatabaseError(`Failed to update ${entityType} ${entityId}: ${(error as Error).message}`, error as Error);
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

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      throw new DatabaseError(`Store "${storeName}" not found for delete`);
    }
    
    // Get existing entity using verified connection
    const existing = await new Promise<OfflineEntity<any> | undefined>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(entityId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

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

    // Put using verified connection
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(existing);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    console.log(`[EntityStorage] Deleted ${entityType} ${entityId} (tombstone)`);
  } catch (error) {
    if (error instanceof EntityNotFoundError || error instanceof TenantMismatchError) {
      throw error;
    }
    console.error('[EntityStorage] Delete error:', error);
    throw new DatabaseError(`Failed to delete ${entityType} ${entityId}: ${(error as Error).message}`, error as Error);
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

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      throw new DatabaseError(`Store "${storeName}" not found for hard delete`);
    }

    // Delete using verified connection
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(entityId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    console.log(`[EntityStorage] Hard deleted ${entityType} ${entityId}`);
  } catch (error) {
    console.error('[EntityStorage] Hard delete error:', error);
    throw new DatabaseError(`Failed to hard delete ${entityType} ${entityId}: ${(error as Error).message}`, error as Error);
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
export async function queryEntities<T = any>(
  entityType: string,
  syncStatus: SyncStatus
): Promise<T[]> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      return [];
    }

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      return [];
    }

    // Query by index using verified connection
    const entities = await new Promise<OfflineEntity<T>[]>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index('syncStatus');
        const request = index.getAll(syncStatus);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    return entities.map((e) => e.data);
  } catch (error) {
    console.error('[EntityStorage] Get by status error:', error);
    throw new DatabaseError(`Failed to get ${entityType} by status: ${(error as Error).message}`, error as Error);
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

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      console.log(`[EntityStorage] Store "${storeName}" not found, nothing to clear`);
      return;
    }

    // Clear using verified connection
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    console.log(`[EntityStorage] Cleared all ${entityType}`);
  } catch (error) {
    console.error('[EntityStorage] Clear error:', error);
    throw new DatabaseError(`Failed to clear ${entityType}: ${(error as Error).message}`, error as Error);
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

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      return null;
    }

    // Get entity using verified connection
    const entity = await new Promise<OfflineEntity<any> | undefined>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(entityId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    return entity?.metadata || null;
  } catch (error) {
    console.error('[EntityStorage] Get metadata error:', error);
    throw new DatabaseError(`Failed to get metadata for ${entityType} ${entityId}: ${(error as Error).message}`, error as Error);
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

    const storeName = getStoreName(context.practiceId.toString(), entityType);
    
    // Ensure practice is registered and get fresh database connection
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    const db = await indexedDBManager.initialize(context.tenantId);
    
    // Verify store exists
    if (!Array.from(db.objectStoreNames).includes(storeName)) {
      throw new DatabaseError(`Store "${storeName}" not found for sync status update`);
    }

    // Get entity using verified connection
    const entity = await new Promise<OfflineEntity<any> | undefined>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(entityId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });

    if (!entity) {
      throw new EntityNotFoundError(entityType, entityId);
    }

    entity.metadata.syncStatus = syncStatus;
    entity.metadata.lastSyncedAt = Date.now();
    
    if (serverVersion) {
      entity.metadata.serverVersion = serverVersion;
    }

    // Put using verified connection
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(entity);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (error) {
    console.error('[EntityStorage] Update sync status error:', error);
    throw new DatabaseError(`Failed to update sync status for ${entityType} ${entityId}: ${(error as Error).message}`, error as Error);
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
