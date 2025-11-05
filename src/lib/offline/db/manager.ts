/**
 * IndexedDB Manager (Backward Compatibility Wrapper)
 * Delegates all operations to TenantDatabaseManager
 * 
 * TENANT & PRACTICE ISOLATION:
 * - Each tenant has separate database: SmartDMV_Tenant_{tenantId}
 * - Practice isolation via store prefixes: practice_{practiceId}_{storeName}
 */

import { tenantDatabaseManager } from './tenant-manager';

class IndexedDBManager {
  setCurrentTenant(tenantId: string, practiceId?: string): void {
    tenantDatabaseManager.setCurrentTenant(tenantId, practiceId);
  }

  getCurrentTenant(): { tenantId: string | null; practiceId: string | null } {
    return tenantDatabaseManager.getCurrentTenant();
  }

  clearCurrentTenant(): void {
    tenantDatabaseManager.clearCurrentTenant();
  }

  async initialize(tenantId?: string): Promise<IDBDatabase> {
    return tenantDatabaseManager.initialize(tenantId);
  }

  async registerPractice(practiceId: string, tenantId?: string): Promise<void> {
    return tenantDatabaseManager.registerPractice(practiceId, tenantId);
  }

  async getDatabase(): Promise<IDBDatabase> {
    return tenantDatabaseManager.initialize();
  }

  async transaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    operation: (tx: IDBTransaction, stores: IDBObjectStore | IDBObjectStore[]) => Promise<T>
  ): Promise<T> {
    const db = await this.getDatabase();
    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(stores, mode);
        const objectStores =
          stores.length === 1
            ? tx.objectStore(stores[0])
            : stores.map((name) => tx.objectStore(name));

        operation(tx, objectStores).then(resolve).catch(reject);

        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      } catch (error) {
        reject(error);
      }
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = query ? store.getAll(query) : store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<IDBValidKey> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: string, item: T): Promise<IDBValidKey> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    query?: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = query ? index.getAll(query) : index.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Alias for backward compatibility
  queryByIndex<T>(
    storeName: string,
    indexName: string,
    query?: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    return this.getAllByIndex<T>(storeName, indexName, query);
  }

  async count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = query ? store.count(query) : store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTenantDatabase(tenantId: string): Promise<void> {
    return tenantDatabaseManager.deleteTenantDatabase(tenantId);
  }

  async clearPracticeData(practiceId: string, tenantId?: string): Promise<void> {
    return tenantDatabaseManager.clearPracticeData(practiceId, tenantId);
  }

  closeAll(): void {
    tenantDatabaseManager.closeAll();
  }

  getStats() {
    return tenantDatabaseManager.getStats();
  }
}

export const indexedDBManager = new IndexedDBManager();

export function openDB(tenantId?: string): Promise<IDBDatabase> {
  return indexedDBManager.initialize(tenantId);
}
