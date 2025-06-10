/**
 * IndexedDB Service
 * 
 * This service provides a simplified interface for working with IndexedDB
 * to support offline functionality in the application.
 */

// Database version - increment this when changing the schema
const DB_VERSION = 1;
const DB_NAME = "SmartDVM_OfflineDB";

// Store names (similar to tables)
export const STORES = {
  APPOINTMENTS: "appointments",
  SOAP_NOTES: "soapNotes",
  PETS: "pets",
  CLIENTS: "clients",
  SYNC_QUEUE: "syncQueue",
};

// Define the database schema structure
interface DBSchema {
  [storeName: string]: {
    keyPath: string;
    indexes?: { name: string; keyPath: string; options?: IDBIndexParameters }[];
  };
}

// Define the schema for our database
const dbSchema: DBSchema = {
  [STORES.APPOINTMENTS]: {
    keyPath: "id",
    indexes: [
      { name: "practiceId", keyPath: "practiceId" },
      { name: "petId", keyPath: "petId" },
      { name: "date", keyPath: "date" },
    ],
  },
  [STORES.SOAP_NOTES]: {
    keyPath: "id",
    indexes: [
      { name: "petId", keyPath: "petId" },
      { name: "appointmentId", keyPath: "appointmentId" },
      { name: "practitionerId", keyPath: "practitionerId" },
    ],
  },
  [STORES.PETS]: {
    keyPath: "id",
    indexes: [
      { name: "ownerId", keyPath: "ownerId" },
      { name: "practiceId", keyPath: "practiceId" },
    ],
  },
  [STORES.CLIENTS]: {
    keyPath: "id",
    indexes: [
      { name: "practiceId", keyPath: "practiceId" },
      { name: "email", keyPath: "email", options: { unique: true } },
    ],
  },
  [STORES.SYNC_QUEUE]: {
    keyPath: "id",
    indexes: [
      { name: "timestamp", keyPath: "timestamp" },
      { name: "entityType", keyPath: "entityType" },
      { name: "operation", keyPath: "operation" },
    ],
  },
};

/**
 * Opens a connection to the IndexedDB database
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Error opening database");
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores based on schema
      Object.entries(dbSchema).forEach(([storeName, schema]) => {
        // Don't recreate existing stores
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
          
          // Create indexes if defined
          schema.indexes?.forEach((index) => {
            store.createIndex(index.name, index.keyPath, index.options);
          });
        }
      });
    };
  });
}

/**
 * Adds or updates an item in the specified store
 * @param storeName The name of the store
 * @param item The item to add or update
 * @returns A promise that resolves with the key of the added/updated item
 */
export async function saveItem<T>(storeName: string, item: T): Promise<IDBValidKey> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    
    request.onsuccess = () => {
      resolve(request.result);
      db.close();
    };
    
    request.onerror = (event) => {
      console.error(`Error saving to ${storeName}:`, event);
      reject(`Failed to save item in ${storeName}`);
      db.close();
    };
  });
}

/**
 * Retrieves an item by its ID from the specified store
 * @param storeName The name of the store
 * @param id The ID of the item to retrieve
 * @returns A promise that resolves with the retrieved item or null if not found
 */
export async function getItem<T>(storeName: string, id: IDBValidKey): Promise<T | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => {
      resolve(request.result || null);
      db.close();
    };
    
    request.onerror = (event) => {
      console.error(`Error retrieving from ${storeName}:`, event);
      reject(`Failed to retrieve item from ${storeName}`);
      db.close();
    };
  });
}

/**
 * Retrieves all items from the specified store
 * @param storeName The name of the store
 * @returns A promise that resolves with an array of all items in the store
 */
export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
      db.close();
    };
    
    request.onerror = (event) => {
      console.error(`Error retrieving all from ${storeName}:`, event);
      reject(`Failed to retrieve items from ${storeName}`);
      db.close();
    };
  });
}

/**
 * Retrieves items by an indexed field value from the specified store
 * @param storeName The name of the store
 * @param indexName The name of the index to use
 * @param value The value to search for
 * @returns A promise that resolves with an array of matching items
 */
export async function getItemsByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    
    request.onsuccess = () => {
      resolve(request.result);
      db.close();
    };
    
    request.onerror = (event) => {
      console.error(`Error retrieving by index from ${storeName}:`, event);
      reject(`Failed to retrieve items by index from ${storeName}`);
      db.close();
    };
  });
}

/**
 * Deletes an item from the specified store by its ID
 * @param storeName The name of the store
 * @param id The ID of the item to delete
 * @returns A promise that resolves when the item is deleted
 */
export async function deleteItem(storeName: string, id: IDBValidKey): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
      db.close();
    };
    
    request.onerror = (event) => {
      console.error(`Error deleting from ${storeName}:`, event);
      reject(`Failed to delete item from ${storeName}`);
      db.close();
    };
  });
}

/**
 * Clears all items from the specified store
 * @param storeName The name of the store
 * @returns A promise that resolves when the store is cleared
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => {
      resolve();
      db.close();
    };
    
    request.onerror = (event) => {
      console.error(`Error clearing ${storeName}:`, event);
      reject(`Failed to clear ${storeName} store`);
      db.close();
    };
  });
}

/**
 * Interface for the sync queue item
 */
export interface SyncQueueItem {
  id?: number;           // Auto-generated ID for the queue item
  entityType: string;    // Type of entity (e.g., "appointment", "soapNote")
  entityId: number;      // ID of the entity
  operation: "create" | "update" | "delete"; // Operation to perform when back online
  data?: any;            // Data for create/update operations
  timestamp: number;     // When the operation was queued
  retryCount?: number;   // Number of failed sync attempts
  lastError?: string;    // Last error message if sync failed
}

/**
 * Adds an operation to the sync queue
 * @param item The sync queue item to add
 * @returns A promise that resolves with the ID of the added queue item
 */
export async function addToSyncQueue(item: SyncQueueItem): Promise<IDBValidKey> {
  // Set default values
  const queueItem: SyncQueueItem = {
    ...item,
    timestamp: item.timestamp || Date.now(),
    retryCount: item.retryCount || 0
  };
  
  return saveItem(STORES.SYNC_QUEUE, queueItem);
}

/**
 * Gets all pending operations from the sync queue
 * @returns A promise that resolves with all sync queue items
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAllItems<SyncQueueItem>(STORES.SYNC_QUEUE);
}

/**
 * Removes an item from the sync queue
 * @param id The ID of the sync queue item to remove
 * @returns A promise that resolves when the item is removed
 */
export async function removeFromSyncQueue(id: IDBValidKey): Promise<void> {
  return deleteItem(STORES.SYNC_QUEUE, id);
}