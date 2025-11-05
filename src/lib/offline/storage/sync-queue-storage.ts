/**
 * Sync queue storage for offline functionality
 * Manages operation queue for synchronization
 */

import { indexedDBManager } from '../db/manager';
import { STORES } from '../db/schema';
import { getOfflineTenantContext } from '../core/tenant-context';
import type {
  SyncOperation,
  SyncOperationType,
  SyncPriority,
  SyncOperationStatus,
  SyncQueueStats,
  IdMapping,
  RelationshipMap,
} from '../types/sync.types';
import { validateSyncOperation } from '../utils/validation';
import { ValidationError, DatabaseError } from '../utils/error-handlers';

/**
 * Add operation to sync queue
 */
export async function queueOperation(
  operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>
): Promise<number> {
  try {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    const syncOperation: Omit<SyncOperation, 'id'> = {
      ...operation,
      tenantId: operation.tenantId || context.tenantId,
      practiceId: operation.practiceId || context.practiceId,
      userId: operation.userId || context.userId,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      priority: operation.priority || 'normal',
      maxRetries: operation.maxRetries || 3,
    };

    // Validate operation
    const validation = validateSyncOperation(syncOperation);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    const id = await indexedDBManager.add(STORES.SYNC_QUEUE, syncOperation);
    
    console.log(`[SyncQueue] Queued ${operation.operation} for ${operation.entityType} ${operation.entityId}`);
    return id as number;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError('Failed to queue operation', error as Error);
  }
}

/**
 * Get pending operations
 */
export async function getPendingOperations(
  tenantId?: string,
  limit?: number
): Promise<SyncOperation[]> {
  try {
    // Check if tenant context is set before attempting database access
    const { tenantId: currentTenantId } = indexedDBManager.getCurrentTenant();
    
    const context = await getOfflineTenantContext();
    const targetTenantId = tenantId || context?.tenantId || currentTenantId;

    if (!targetTenantId) {
      console.log('[SyncQueue] No tenant context available for getPendingOperations');
      return [];
    }

    let operations = await indexedDBManager.queryByIndex<SyncOperation>(
      STORES.SYNC_QUEUE,
      'status',
      'pending'
    );

    // Filter by tenant
    operations = operations.filter((op) => op.tenantId === targetTenantId);

    // Sort by priority and timestamp
    operations.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    if (limit) {
      operations = operations.slice(0, limit);
    }

    return operations;
  } catch (error) {
    console.error('[SyncQueue] Failed to get pending operations:', error);
    // Return empty array instead of throwing to prevent cascading errors
    return [];
  }
}

/**
 * Get all operations for tenant
 */
export async function getAllOperations(tenantId?: string): Promise<SyncOperation[]> {
  try {
    const context = await getOfflineTenantContext();
    const targetTenantId = tenantId || context?.tenantId;

    if (!targetTenantId) {
      return [];
    }

    const operations = await indexedDBManager.queryByIndex<SyncOperation>(
      STORES.SYNC_QUEUE,
      'tenantId',
      targetTenantId
    );

    return operations;
  } catch (error) {
    throw new DatabaseError('Failed to get all operations', error as Error);
  }
}

/**
 * Get operation by ID
 */
export async function getOperation(operationId: number): Promise<SyncOperation | null> {
  try {
    return await indexedDBManager.get<SyncOperation>(STORES.SYNC_QUEUE, operationId);
  } catch (error) {
    throw new DatabaseError(`Failed to get operation ${operationId}`, error as Error);
  }
}

/**
 * Update operation status
 */
export async function updateOperationStatus(
  operationId: number,
  status: SyncOperationStatus,
  error?: string
): Promise<void> {
  try {
    const operation = await getOperation(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    operation.status = status;
    
    if (status === 'failed') {
      operation.retryCount += 1;
      operation.lastError = error;
    }

    if (status === 'completed') {
      operation.lastError = undefined;
    }

    await indexedDBManager.put(STORES.SYNC_QUEUE, operation);
  } catch (error) {
    throw new DatabaseError(`Failed to update operation ${operationId}`, error as Error);
  }
}

/**
 * Mark operation as in progress
 */
export async function markOperationInProgress(operationId: number): Promise<void> {
  await updateOperationStatus(operationId, 'in_progress');
}

/**
 * Mark operation as completed
 */
export async function markOperationCompleted(operationId: number): Promise<void> {
  await updateOperationStatus(operationId, 'completed');
}

/**
 * Mark operation as failed
 */
export async function markOperationFailed(
  operationId: number,
  error: string
): Promise<void> {
  await updateOperationStatus(operationId, 'failed', error);
}

/**
 * Mark operation as conflicted
 */
export async function markOperationConflicted(
  operationId: number,
  serverData: any,
  localData: any,
  conflictFields: string[]
): Promise<void> {
  try {
    const operation = await getOperation(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    operation.status = 'conflicted';
    operation.conflictData = {
      serverVersion: serverData,
      localVersion: localData,
      conflictFields,
      conflictedAt: Date.now(),
    };

    await indexedDBManager.put(STORES.SYNC_QUEUE, operation);
  } catch (error) {
    throw new DatabaseError(`Failed to mark operation ${operationId} as conflicted`, error as Error);
  }
}

/**
 * Remove operation from queue
 */
export async function removeOperation(operationId: number): Promise<void> {
  try {
    await indexedDBManager.delete(STORES.SYNC_QUEUE, operationId);
    console.log(`[SyncQueue] Removed operation ${operationId}`);
  } catch (error) {
    throw new DatabaseError(`Failed to remove operation ${operationId}`, error as Error);
  }
}

/**
 * Clear completed operations
 */
export async function clearCompletedOperations(tenantId?: string): Promise<number> {
  try {
    const context = await getOfflineTenantContext();
    const targetTenantId = tenantId || context?.tenantId;

    if (!targetTenantId) {
      return 0;
    }

    const completed = await indexedDBManager.queryByIndex<SyncOperation>(
      STORES.SYNC_QUEUE,
      'status',
      'completed'
    );

    const toDelete = completed.filter((op) => op.tenantId === targetTenantId);
    
    for (const operation of toDelete) {
      if (operation.id) {
        await indexedDBManager.delete(STORES.SYNC_QUEUE, operation.id);
      }
    }

    console.log(`[SyncQueue] Cleared ${toDelete.length} completed operations`);
    return toDelete.length;
  } catch (error) {
    throw new DatabaseError('Failed to clear completed operations', error as Error);
  }
}

/**
 * Clear all operations for tenant
 */
export async function clearAllOperations(tenantId?: string): Promise<void> {
  try {
    const operations = await getAllOperations(tenantId);
    
    for (const operation of operations) {
      if (operation.id) {
        await indexedDBManager.delete(STORES.SYNC_QUEUE, operation.id);
      }
    }

    console.log(`[SyncQueue] Cleared ${operations.length} operations`);
  } catch (error) {
    throw new DatabaseError('Failed to clear all operations', error as Error);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(tenantId?: string): Promise<SyncQueueStats> {
  try {
    const operations = await getAllOperations(tenantId);

    const stats: SyncQueueStats = {
      total: operations.length,
      pending: 0,
      inProgress: 0,
      failed: 0,
      conflicted: 0,
      byEntityType: {},
      byPriority: { high: 0, normal: 0, low: 0 },
    };

    operations.forEach((op) => {
      // Count by status
      if (op.status === 'pending') stats.pending++;
      if (op.status === 'in_progress') stats.inProgress++;
      if (op.status === 'failed') stats.failed++;
      if (op.status === 'conflicted') stats.conflicted++;

      // Count by entity type
      stats.byEntityType[op.entityType] = (stats.byEntityType[op.entityType] || 0) + 1;

      // Count by priority
      stats.byPriority[op.priority]++;

      // Track oldest operation
      if (!stats.oldestOperation || op.timestamp < stats.oldestOperation) {
        stats.oldestOperation = op.timestamp;
      }
    });

    // Estimate sync time (rough: 500ms per operation)
    stats.estimatedSyncTime = stats.pending * 500;

    return stats;
  } catch (error) {
    throw new DatabaseError('Failed to get queue stats', error as Error);
  }
}

/**
 * Get operations by entity
 */
export async function getOperationsByEntity(
  entityType: string,
  entityId: number | string,
  tenantId?: string
): Promise<SyncOperation[]> {
  try {
    const operations = await getAllOperations(tenantId);
    
    return operations.filter(
      (op) => op.entityType === entityType && op.entityId === entityId
    );
  } catch (error) {
    throw new DatabaseError('Failed to get operations by entity', error as Error);
  }
}

/**
 * Get failed operations
 */
export async function getFailedOperations(tenantId?: string): Promise<SyncOperation[]> {
  try {
    const context = await getOfflineTenantContext();
    const targetTenantId = tenantId || context?.tenantId;

    if (!targetTenantId) {
      return [];
    }

    let operations = await indexedDBManager.queryByIndex<SyncOperation>(
      STORES.SYNC_QUEUE,
      'status',
      'failed'
    );

    return operations.filter((op) => op.tenantId === targetTenantId);
  } catch (error) {
    throw new DatabaseError('Failed to get failed operations', error as Error);
  }
}

/**
 * Get conflicted operations
 */
export async function getConflictedOperations(tenantId?: string): Promise<SyncOperation[]> {
  try {
    const context = await getOfflineTenantContext();
    const targetTenantId = tenantId || context?.tenantId;

    if (!targetTenantId) {
      return [];
    }

    let operations = await indexedDBManager.queryByIndex<SyncOperation>(
      STORES.SYNC_QUEUE,
      'status',
      'conflicted'
    );

    return operations.filter((op) => op.tenantId === targetTenantId);
  } catch (error) {
    throw new DatabaseError('Failed to get conflicted operations', error as Error);
  }
}

/**
 * Retry failed operation
 */
export async function retryOperation(operationId: number): Promise<void> {
  try {
    const operation = await getOperation(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.retryCount >= operation.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    operation.status = 'pending';
    operation.lastError = undefined;

    await indexedDBManager.put(STORES.SYNC_QUEUE, operation);
    console.log(`[SyncQueue] Retry operation ${operationId}`);
  } catch (error) {
    throw new DatabaseError(`Failed to retry operation ${operationId}`, error as Error);
  }
}

/**
 * Save ID mapping (temp ID to server ID)
 */
export async function saveIdMapping(
  tempId: string | number,
  serverId: number,
  entityType: string
): Promise<void> {
  try {
    const mapping: IdMapping = {
      tempId,
      serverId,
      entityType,
      mappedAt: Date.now(),
    };

    await indexedDBManager.put(STORES.ID_MAPPINGS, {
      ...mapping,
      id: `${entityType}_${tempId}`,
    });

    console.log(`[SyncQueue] Mapped ${entityType} ${tempId} → ${serverId}`);
  } catch (error) {
    throw new DatabaseError('Failed to save ID mapping', error as Error);
  }
}

/**
 * Get server ID for temp ID
 */
export async function getServerIdForTemp(
  tempId: string | number,
  entityType: string
): Promise<number | null> {
  try {
    const mappings = await indexedDBManager.queryByIndex<IdMapping & { id: string }>(
      STORES.ID_MAPPINGS,
      'tempId',
      tempId
    );

    const mapping = mappings.find((m) => m.entityType === entityType);
    return mapping?.serverId || null;
  } catch (error) {
    throw new DatabaseError('Failed to get server ID', error as Error);
  }
}

/**
 * Update operation priority
 */
export async function updateOperationPriority(
  operationId: number,
  priority: SyncPriority
): Promise<void> {
  try {
    const operation = await getOperation(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    operation.priority = priority;
    await indexedDBManager.put(STORES.SYNC_QUEUE, operation);
  } catch (error) {
    throw new DatabaseError(`Failed to update operation priority`, error as Error);
  }
}
