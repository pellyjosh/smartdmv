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
import { 
  addToSyncQueue, 
  getSyncQueue, 
  removeFromSyncQueue, 
  saveItem,
  getItem,
  STORES,
  SyncQueueItem
} from "./indexed-db";
import { queryClient } from "./queryClient";

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
  await addToSyncQueue({
    entityType,
    entityId: data.id, // Use the temporary ID
    operation: "create",
    data,
    timestamp: Date.now()
  });
}

/**
 * Queue an update operation for when back online
 * @param entityType The type of entity
 * @param entityId The ID of the entity
 * @param data The updated data
 */
export async function queueUpdate(entityType: string, entityId: number, data: any): Promise<void> {
  await addToSyncQueue({
    entityType,
    entityId,
    operation: "update",
    data,
    timestamp: Date.now()
  });
}

/**
 * Queue a delete operation for when back online
 * @param entityType The type of entity
 * @param entityId The ID of the entity
 */
export async function queueDelete(entityType: string, entityId: number): Promise<void> {
  await addToSyncQueue({
    entityType,
    entityId,
    operation: "delete",
    timestamp: Date.now()
  });
}

/**
 * Maps entity types to their respective API endpoints
 */
const entityEndpoints: Record<string, string> = {
  appointment: "/api/appointments",
  soapNote: "/api/soap-notes",
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
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
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
    
    return true;
  } catch (error) {
    console.error(`Sync error for ${item.entityType} ${item.entityId}:`, error);
    
    // Update retry count
    const updatedItem: SyncQueueItem = {
      ...item,
      retryCount: (item.retryCount || 0) + 1,
      lastError: error instanceof Error ? error.message : String(error)
    };
    
    // Save updated retry info
    if (item.id) {
      await saveItem(STORES.SYNC_QUEUE, updatedItem);
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
  const queue = await getSyncQueue();
  
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
      // Remove from queue if successful
      await removeFromSyncQueue(item.id);
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
  const queue = await getSyncQueue();
  return queue.length > 0;
}

/**
 * Get the count of pending sync items
 * @returns A promise that resolves with the number of pending items
 */
export async function getPendingSyncCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}