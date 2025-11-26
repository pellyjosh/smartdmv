/**
 * Sync Service
 * 
 * This service manages the synchronization of data between the local IndexedDB
 * storage and the server. It handles:
 * - Tracking changes made offline
 * - Syncing changes when back online
 * - Resolving conflicts
 */

import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";
import { syncQueueManager } from "@/lib/offline/managers/sync-queue-manager";
import * as syncQueueStorage from "@/lib/offline/storage/sync-queue-storage";
import type { SyncOperation } from "@/lib/offline/types/sync.types";

// Interface for sync progress tracking
export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

// Callback for sync progress updates
type ProgressCallback = (progress: SyncProgress) => void;

/**
 * Queue a create operation for when back online
 * @param entityType The type of entity (e.g., "appointment", "soapNote")
 * @param data The data to create
 */
export async function queueCreate(entityType: string, data: any): Promise<void> {
  await syncQueueManager.addOperation(entityType, data.id, "create", data);
}

/**
 * Queue an update operation for when back online
 * @param entityType The type of entity
 * @param entityId The ID of the entity
 * @param data The updated data
 */
export async function queueUpdate(entityType: string, entityId: number, data: any): Promise<void> {
  await syncQueueManager.addOperation(entityType, entityId, "update", data);
}

/**
 * Queue a delete operation for when back online
 * @param entityType The type of entity
 * @param entityId The ID of the entity
 */
export async function queueDelete(entityType: string, entityId: number): Promise<void> {
  await syncQueueManager.addOperation(entityType, entityId, "delete");
}

/**
 * Maps entity types to their respective API endpoints
 */
const entityEndpoints: Record<string, string> = {
  appointment: "/api/appointments",
  soapNote: "/api/soap-notes",
  soapTemplate: "/api/soap-templates",
  soapTemplates: "/api/soap-templates",
  pet: "/api/pets",
  client: "/api/clients",
  healthPlan: "/api/health-plans",
  whiteboardItem: "/api/whiteboard",
  // Add more entity types and endpoints as needed
};

/**
 * Process a single sync queue item
 * @param item The sync queue item to process
 * @returns A promise that resolves when the item is processed
 */
async function processSyncItem(item: SyncOperation): Promise<boolean> {
  try {
    const endpoint = entityEndpoints[item.entityType];
    if (!endpoint) {
      throw new Error(`Unknown entity type: ${item.entityType}`);
    }
    
    let response: Response;
    
    switch (item.operation) {
      case "create":
        response = await apiRequest("POST", endpoint, item.data);
        break;
        
      case "update":
        response = await apiRequest("PATCH", `${endpoint}/${item.entityId}`, item.data);
        break;
        
      case "delete":
        response = await apiRequest("DELETE", `${endpoint}/${item.entityId}`);
        break;
        
      default:
        throw new Error(`Unknown operation: ${item.operation}`);
    }
    
    // If successful, invalidate the relevant query to update UI
    const queryKey = endpoint;
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    
    // For specific entities, also invalidate related queries
    if (item.entityType === "soapNote") {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${item.data?.appointmentId}/soap-note`] });
    }
    
    if (item.id) {
      await syncQueueStorage.markOperationCompleted(item.id);
    }

    return true;
  } catch (error) {
    console.error(`Sync error for ${item.entityType} ${item.entityId}:`, error);
    if (item.id) {
      await syncQueueStorage.markOperationFailed(
        item.id,
        error instanceof Error ? error.message : String(error)
      );
    }
    
    return false;
  }
}

/**
 * Process all items in the sync queue
 * @param onProgress Callback for progress updates
 * @returns A promise that resolves with a summary of the sync results
 */
export async function processQueue(onProgress?: ProgressCallback): Promise<SyncProgress> {
  const { getOfflineTenantContext } = await import('@/lib/offline/core/tenant-context');
  const { isAuthenticatedOffline } = await import('@/lib/offline/storage/auth-storage');
  const context = await getOfflineTenantContext();
  if (!context) {
    const progress: SyncProgress = { total: 0, completed: 0, failed: 0, inProgress: false };
    if (onProgress) onProgress({ ...progress });
    return progress;
  }
  const authed = await isAuthenticatedOffline(context.userId, context.tenantId);
  if (!authed) {
    const progress: SyncProgress = { total: 0, completed: 0, failed: 0, inProgress: false };
    if (onProgress) onProgress({ ...progress });
    return progress;
  }
  const queue = await syncQueueManager.getPending();
  
  const progress: SyncProgress = {
    total: queue.length,
    completed: 0,
    failed: 0,
    inProgress: true
  };
  
  // Report initial progress
  if (onProgress) {
    onProgress({ ...progress });
  }
  
  // Process each item
  for (const item of queue) {
    if (!item.id) continue;
    
    const success = await processSyncItem(item);
    
    if (success) {
      progress.completed++;
    } else {
      progress.failed++;
    }
    
    // Report progress
    if (onProgress) {
      onProgress({ ...progress });
    }
  }
  
  progress.inProgress = false;
  
  // Final progress report
  if (onProgress) {
    onProgress({ ...progress });
  }
  
  return progress;
}

/**
 * Check if there are pending items in the sync queue
 * @returns A promise that resolves with true if there are pending items
 */
export async function hasPendingSync(): Promise<boolean> {
  const stats = await syncQueueManager.getStats();
  return stats.pending > 0;
}

/**
 * Get the count of pending sync items
 * @returns A promise that resolves with the number of pending items
 */
export async function getPendingSyncCount(): Promise<number> {
  const stats = await syncQueueManager.getStats();
  return stats.pending;
}

/**
 * Pull recent updates from server to ensure local data is up to date
 * This is called when there are no pending operations to sync to server
 * @returns A promise that resolves when fresh data pull is complete
 */
export async function pullFreshDataIfNeeded(): Promise<void> {
  try {
    // Check if we have any pending operations first
    const hasPending = await hasPendingSync();
    if (hasPending) {
      console.log('[SyncService] Skipping fresh data pull - has pending operations');
      return;
    }

    console.log('[SyncService] Checking if fresh data pull is needed...');

    // Get last sync timestamp from metadata
    const lastSyncTimestamp = await getLastSyncTimestamp();

    const { getOfflineTenantContext } = await import('@/lib/offline/core/tenant-context');
    const { isAuthenticatedOffline } = await import('@/lib/offline/storage/auth-storage');
    const context = await getOfflineTenantContext();

    if (!context) {
      console.log('[SyncService] No tenant context, skipping fresh pull');
      return;
    }

    const authed = await isAuthenticatedOffline(context.userId, context.tenantId);
    if (!authed) {
      console.log('[SyncService] Skipping fresh data pull - user not authenticated');
      return;
    }

    // If no sync timestamp exists, this is likely the first sync or empty DB
    // We should ALWAYS pull data in this case to seed the local database
    if (!lastSyncTimestamp || lastSyncTimestamp === 0) {
      console.log('[SyncService] 🔄 First sync or empty database detected, pulling fresh data to seed local storage');
      await pullDataFromServer();
      return;
    }

    // Check if we have any local records
    const hasRecords = await checkIfHasLocalRecords(context);

    // If no records exist locally, this might be a fresh setup - pull data
    if (!hasRecords) {
      console.log('[SyncService] 📭 No local records found, pulling data to populate local storage');
      await pullDataFromServer();
      return;
    }

    // Otherwise, use time-based logic for efficiency
    const timeSinceLastSync = Date.now() - lastSyncTimestamp;
    const hoursSinceLastSync = timeSinceLastSync / (1000 * 60 * 60);

    // Pull fresh data if more than 24 hours since last sync
    if (hoursSinceLastSync > 24) {
      console.log(`[SyncService] ⏰ ${hoursSinceLastSync.toFixed(1)} hours since last sync, pulling fresh data`);
      await pullDataFromServer();
    } else if (hoursSinceLastSync > 4) {
      // For moderate time gaps, check if local data exists that might need updates
      console.log(`[SyncService] ⚡ ${hoursSinceLastSync.toFixed(1)} hours passed with local records, pulling fresh data`);
      await pullDataFromServer();
    } else {
      console.log(`[SyncService] ✅ Very recent sync (${hoursSinceLastSync.toFixed(1)} hours ago), skipping fresh pull`);
    }

  } catch (error) {
    console.error('[SyncService] Error during fresh data pull check:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Get the last sync timestamp from metadata
 * @returns A promise that resolves with the timestamp or 0 if not found
 */
async function getLastSyncTimestamp(): Promise<number> {
  try {
    const { indexedDBManager } = await import('@/lib/offline/db/manager');
    const { STORES } = await import('@/lib/offline/db/schema');
    const { getOfflineTenantContext } = await import('@/lib/offline/core/tenant-context');

    const context = await getOfflineTenantContext();
    if (!context) return 0;

    const db = await indexedDBManager.initialize(context.tenantId);

    if (!Array.from(db.objectStoreNames).includes(STORES.METADATA)) {
      return 0;
    }

    const metadata = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORES.METADATA, 'readonly');
      const store = tx.objectStore(STORES.METADATA);
      const request = store.get('lastSyncTimestamp');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return metadata?.value || 0;
  } catch (error) {
    console.error('[SyncService] Error getting last sync timestamp:', error);
    return 0;
  }
}

/**
 * Check if we have any local records that might benefit from a fresh pull
 * @param context The tenant context
 * @returns A promise that resolves with true if local records exist
 */
async function checkIfHasLocalRecords(context: any): Promise<boolean> {
  try {
    const entityTypesToCheck = [
      'appointments', 'pets', 'clients', 'practitioners',
      'soapNotes', 'soapTemplates'
    ];

    // Try to get a count from the storage manager
    const { storageManager } = await import('@/lib/offline/managers/storage-manager');
    const stats = await storageManager.getStats();

    // Check if any entity types have records
    return Object.values(stats.entityCounts).some((count: any) => count > 0);
  } catch (error) {
    console.error('[SyncService] Error checking local records:', error);
    return false;
  }
}

/**
 * Perform a fresh data pull from server for recent changes
 * @returns A promise that resolves when the pull is complete
 */
async function pullDataFromServer(): Promise<void> {
  try {
    console.log('[SyncService] Pulling fresh data from server...');

    const { getOfflineTenantContext } = await import('@/lib/offline/core/tenant-context');
    const { isAuthenticatedOffline } = await import('@/lib/offline/storage/auth-storage');
    const context = await getOfflineTenantContext();
    if (!context) {
      console.error('[SyncService] No tenant context for fresh pull');
      return;
    }
    const authed = await isAuthenticatedOffline(context.userId, context.tenantId);
    if (!authed) {
      console.log('[SyncService] Skipping pull - user not authenticated');
      return;
    }

    const lastSyncTimestamp = await getLastSyncTimestamp();

    // Pull all entity types that we track offline
    const entityTypesToSync = 'appointments,pets,clients,practitioners,soapNotes,soapTemplates,rooms,admissions,vaccinations,vaccine_types,kennels,boarding_stays';
    const syncUrl = `/api/sync/pull?lastSyncTimestamp=${lastSyncTimestamp}&practiceId=${context.practiceId}&entityTypes=${entityTypesToSync}`;

    console.log(`[SyncService] Pulling from: ${syncUrl}`);
    console.log(`[SyncService] Last sync timestamp: ${new Date(lastSyncTimestamp).toISOString()}`);

    const response = await apiRequest('GET', syncUrl);

    if (!response.ok) {
      console.warn(`[SyncService] Fresh pull failed: ${response.statusText}`);
      return;
    }

    const pullResult = await response.json();
    const changes = pullResult.changes || [];

    if (changes.length === 0) {
      console.log('[SyncService] ✅ No new changes found');
      return;
    }

    console.log(`[SyncService] 📥 Processing ${changes.length} fresh changes from server`);

    // Update local storage with fresh data
    let applied = 0;
    let failed = 0;

    for (const change of changes) {
      try {
        await applyServerChange(change);
        applied++;

        // Invalidate relevant queries to update UI
        const endpoint = entityEndpoints[change.entityType];
        if (endpoint) {
          queryClient.invalidateQueries({ queryKey: [endpoint] });
        }

      } catch (error) {
        console.error(`[SyncService] Failed to apply change ${change.entityType} ${change.id}:`, error);
        failed++;
      }
    }

    // Update the last sync timestamp to prevent rapid consecutive pulls
    await updateLastSyncTimestamp(Date.now());

    console.log(`[SyncService] ✅ Fresh pull complete: ${applied} applied, ${failed} failed`);

    // Invalidate key queries to refresh UI
    queryClient.invalidateQueries();

  } catch (error) {
    console.error('[SyncService] Error during fresh data pull:', error);
    // Don't throw - this is not critical functionality
  }
}

/**
 * Apply a server change to local storage
 * @param change The server change to apply
 * @returns A promise that resolves when the change is applied
 */
async function applyServerChange(change: any): Promise<void> {
  try {
    const { saveEntity, updateEntity, deleteEntity } = await import('@/lib/offline/storage/entity-storage');
    const { getOfflineTenantContext } = await import('@/lib/offline/core/tenant-context');

    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    // Ensure practice is registered
    const { indexedDBManager } = await import('@/lib/offline/db/manager');
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);

    switch (change.operation) {
      case 'create':
      case 'update':
        console.log(`[SyncService] Applying ${change.operation} for ${change.entityType} ${change.id}`);
        const exists = await getEntity(change.entityType, change.id);

        if (exists) {
          await updateEntity(change.entityType, change.id, change.data, 'synced');
        } else {
          await saveEntity(change.entityType, change.data, 'synced');
        }
        break;

      case 'delete':
        // Note: Skip deletes in fresh pull to avoid removing user data
        console.log(`[SyncService] ⏭️  Skipping delete for ${change.entityType} ${change.id} (fresh pull)`);
        break;

      default:
        console.warn(`[SyncService] Unknown operation type: ${change.operation}`);
    }

  } catch (error) {
    console.error(`[SyncService] Error applying server change:`, error);
    throw error;
  }
}

/**
 * Get an entity from local storage
 * @param entityType The type of entity
 * @param id The entity ID
 * @returns A promise that resolves with the entity or null
 */
async function getEntity(entityType: string, id: any): Promise<any | null> {
  try {
    const { getEntity } = await import('@/lib/offline/storage/entity-storage');
    return await getEntity(entityType, id);
  } catch (error) {
    console.error(`[SyncService] Error getting entity ${entityType} ${id}:`, error);
    return null;
  }
}

/**
 * Update the last sync timestamp in metadata
 * @param timestamp The timestamp to set
 * @returns A promise that resolves when updated
 */
async function updateLastSyncTimestamp(timestamp: number): Promise<void> {
  try {
    const { indexedDBManager } = await import('@/lib/offline/db/manager');
    const { STORES } = await import('@/lib/offline/db/schema');
    const { getOfflineTenantContext } = await import('@/lib/offline/core/tenant-context');

    const context = await getOfflineTenantContext();
    if (!context) return;

    const db = await indexedDBManager.initialize(context.tenantId);

    if (!Array.from(db.objectStoreNames).includes(STORES.METADATA)) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.METADATA, 'readwrite');
      const store = tx.objectStore(STORES.METADATA);
      const request = store.put({
        key: 'lastSyncTimestamp',
        value: timestamp,
        updatedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[SyncService] Updated last sync timestamp to ${new Date(timestamp).toISOString()}`);
  } catch (error) {
    console.error('[SyncService] Error updating last sync timestamp:', error);
  }
}
