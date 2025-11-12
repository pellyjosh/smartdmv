/**
 * Tenant Database Manager
 * Manages separate IndexedDB databases per tenant with practice-level isolation
 * 
 * ARCHITECTURE:
 * - Each tenant gets separate database: SmartDMV_Tenant_{tenantId}
 * - Practice stores within tenant DB: practice_{practiceId}_{storeName}
 * - Connection pooling with auto-cleanup
 * - Max 10 concurrent connections
 * - 5-minute idle timeout
 */

import {
  DB_VERSION,
  STORES,
  SYSTEM_STORES,
  TENANT_ISOLATED_STORES,
  STORE_INDEXES,
  ENTITY_STORE_INDEXES,
  getTenantDatabaseName,
  getPracticeStoreName,
  extractPracticeFromStoreName,
} from './schema';

/**
 * Tenant database connection
 */
export interface TenantConnection {
  tenantId: string;
  db: IDBDatabase;
  lastAccessed: number;
  refCount: number;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  activeConnections: number;
  currentTenant: string | null;
  currentPractice: string | null;
  connections: Array<{
    tenantId: string;
    lastAccessed: string;
    idleSeconds: number;
    refCount: number;
  }>;
}

/**
 * Connection pool configuration
 */
const CONNECTION_CONFIG = {
  MAX_IDLE_TIME: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  MAX_CONNECTIONS: 10,
};

/**
 * Tenant Database Manager
 * Manages tenant-isolated IndexedDB databases
 */
class TenantDatabaseManager {
  private tenantConnections: Map<string, TenantConnection> = new Map();
  private currentTenantId: string | null = null;
  private currentPracticeId: string | null = null;
  private initPromises: Map<string, Promise<IDBDatabase>> = new Map();
  private cleanupInterval: any = null;

  constructor() {
    // Start connection cleanup timer (browser only)
    if (typeof window !== 'undefined') {
      this.startCleanupTimer();
    }
  }

    /**
   * Set current tenant and practice context
   * Must be called before any database operations
   */
  setCurrentTenant(tenantId: string, practiceId?: string): void {
    console.log('[TenantDB] 🎯 setCurrentTenant called:', { tenantId, practiceId });
    this.currentTenantId = tenantId;
    this.currentPracticeId = practiceId || null;
    console.log('[TenantDB] ✅ Current tenant set:', {
      currentTenantId: this.currentTenantId,
      currentPracticeId: this.currentPracticeId,
    });
  }

  /**
   * Get current tenant context
   */
  getCurrentTenant(): { tenantId: string | null; practiceId: string | null } {
    return {
      tenantId: this.currentTenantId,
      practiceId: this.currentPracticeId,
    };
  }

  /**
   * Clear current tenant context (on logout)
   */
  clearCurrentTenant(): void {
    console.log('[TenantDB] Clearing tenant context');
    this.currentTenantId = null;
    this.currentPracticeId = null;
  }

  /**
   * Initialize database connection for tenant
   * @param tenantId - Optional tenant ID (uses current if not provided)
   */
  async initialize(tenantId?: string): Promise<IDBDatabase> {
    const targetTenantId = tenantId || this.currentTenantId;

    console.log('[TenantDB] 🔧 Initialize called with tenantId:', tenantId);
    console.log('[TenantDB] 📝 Current context:', {
      currentTenantId: this.currentTenantId,
      targetTenantId,
    });

    if (!targetTenantId) {
      const error = new Error(
        'No tenant context set. Call setCurrentTenant() first or pass tenantId parameter.'
      );
      console.error('[TenantDB] ❌ No tenant context:', error);
      throw error;
    }

    // Check existing connection
    const existing = this.tenantConnections.get(targetTenantId);
    if (existing?.db) {
      // Verify the database is still open and valid
      try {
        const testStore = existing.db.objectStoreNames[0];
        if (testStore) {
          console.log('[TenantDB] ♻️ Reusing existing connection for tenant:', targetTenantId);
          existing.lastAccessed = Date.now();
          existing.refCount++;
          return existing.db;
        }
      } catch (error) {
        console.warn('[TenantDB] ⚠️ Cached connection invalid, removing:', error);
        this.tenantConnections.delete(targetTenantId);
      }
    }

    // Check if initialization in progress
    const initPromise = this.initPromises.get(targetTenantId);
    if (initPromise) {
      console.log('[TenantDB] ⏳ Initialization already in progress, waiting...');
      return initPromise;
    }

    // Start new initialization
    console.log('[TenantDB] 🚀 Starting new database initialization for:', targetTenantId);
    const promise = this.openTenantDatabase(targetTenantId);
    this.initPromises.set(targetTenantId, promise);

    try {
      const db = await promise;
      console.log('[TenantDB] ✅ Database opened successfully:', {
        name: db.name,
        version: db.version,
        stores: Array.from(db.objectStoreNames).length,
      });
      this.tenantConnections.set(targetTenantId, {
        tenantId: targetTenantId,
        db,
        lastAccessed: Date.now(),
        refCount: 1,
      });
      return db;
    } finally {
      this.initPromises.delete(targetTenantId);
    }
  }

  /**
   * Open tenant-specific IndexedDB
   */
  private openTenantDatabase(tenantId: string, version?: number, retryCount = 0): Promise<IDBDatabase> {
    const dbName = getTenantDatabaseName(tenantId);
    console.log('[TenantDB] 📂 Opening database:', dbName, version ? `at version ${version}` : '(auto version)');
    console.log('[TenantDB] 🔍 TRACE: tenantId received:', tenantId, 'type:', typeof tenantId);
    console.log('[TenantDB] 🔍 TRACE: Call stack:', new Error().stack);

    return new Promise((resolve, reject) => {
      // Open without version to get current version, or with specific version if provided
      const request = version ? indexedDB.open(dbName, version) : indexedDB.open(dbName);
      
      console.log('[TenantDB] 📤 IndexedDB.open request created');

      request.onerror = () => {
        const error = request.error;
        console.error('[TenantDB] ❌ Failed to open database:', dbName, error);
        
        // Check if this is a backing store error and we haven't retried yet
        if (error?.name === 'UnknownError' && 
            error?.message?.includes('backing store') && 
            retryCount === 0) {
          console.warn('[TenantDB] 🔄 Backing store corrupted, attempting recovery...');
          
          // Delete the corrupted database and retry
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          
          deleteRequest.onsuccess = () => {
            console.log('[TenantDB] ✅ Corrupted database deleted, retrying...');
            // Retry opening the database (will create fresh)
            this.openTenantDatabase(tenantId, DB_VERSION, retryCount + 1)
              .then(resolve)
              .catch(reject);
          };
          
          deleteRequest.onerror = () => {
            console.error('[TenantDB] ❌ Failed to delete corrupted database:', deleteRequest.error);
            reject(error);
          };
          
          deleteRequest.onblocked = () => {
            console.error('[TenantDB] ❌ Database deletion blocked. Close all other tabs.');
            reject(new Error('Cannot recover: database deletion blocked. Please close all other tabs.'));
          };
        } else {
          reject(error);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        console.log('[TenantDB] ✅ Successfully opened:', dbName, 'v' + db.version);
        console.log('[TenantDB] 📊 Object stores:', Array.from(db.objectStoreNames));
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_VERSION;

        console.log('[TenantDB] 🔄 Upgrading database:', dbName, `from v${oldVersion} to v${newVersion}`);
        
        // Only create system stores if this is a new database
        if (oldVersion === 0) {
          console.log('[TenantDB] 🆕 New database detected, creating system stores');
          this.createSystemStores(db);
          console.log('[TenantDB] ✅ System stores created');
        } else {
          console.log('[TenantDB] 📝 Upgrading existing database (v${oldVersion})');
        }
      };
      
      request.onblocked = () => {
        console.warn('[TenantDB] ⚠️ Database open request blocked. Close all other tabs/connections.');
      };
    });
  }

  /**
   * Create system stores (shared across practices)
   */
  private createSystemStores(db: IDBDatabase): void {
    SYSTEM_STORES.forEach((storeName) => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: 'id',
          autoIncrement: true,
        });

        // Add indexes if defined
        const indexes = (STORE_INDEXES as any)[storeName] || [];
        indexes.forEach((index: any) => {
          try {
            store.createIndex(index.name, index.keyPath, { unique: index.unique });
          } catch (error) {
            console.warn(`[TenantDB] Index creation failed for ${index.name}:`, error);
          }
        });

        console.log(`[TenantDB] Created system store: ${storeName}`);
      }
    });
  }

  /**
   * Register a practice within current tenant
   * Creates practice-specific stores if they don't exist
   */
  async registerPractice(practiceId: string, tenantId?: string): Promise<void> {
    const targetTenantId = tenantId || this.currentTenantId;
    if (!targetTenantId) {
      throw new Error('No tenant context');
    }

    // Validate practiceId
    if (!practiceId || practiceId === 'undefined' || practiceId === 'NaN') {
      console.error('[TenantDB] ❌ Invalid practiceId:', practiceId);
      throw new Error(`Invalid practiceId: ${practiceId}`);
    }

    console.log(`[TenantDB] 🏥 Registering practice: ${practiceId} for tenant: ${targetTenantId}`);

    const db = await this.initialize(targetTenantId);
    
    // Check if all system stores exist (including 'cache')
    const missingSystemStores = SYSTEM_STORES.filter(
      (store) => !db.objectStoreNames.contains(store)
    );
    
    // Check if practice stores exist
    const practiceStores = TENANT_ISOLATED_STORES.map((store) =>
      getPracticeStoreName(practiceId, store)
    );

    const existingStores = Array.from(db.objectStoreNames);
    const missingPracticeStores = practiceStores.filter((store) => !existingStores.includes(store));

    // If any stores are missing, upgrade database
    if (missingSystemStores.length > 0 || missingPracticeStores.length > 0) {
      console.log(
        `[TenantDB] Missing stores - System: ${missingSystemStores.length}, Practice: ${missingPracticeStores.length}`
      );
      
      if (missingSystemStores.length > 0) {
        console.log('[TenantDB] Missing system stores:', missingSystemStores);
      }
      
      // Close current connection
      const currentVersion = db.version;
      db.close();
      this.tenantConnections.delete(targetTenantId);

      // Upgrade database with new version
      const newVersion = currentVersion + 1;
      const upgradedDb = await this.upgradeDatabaseForPractice(
        targetTenantId,
        practiceId,
        newVersion,
        missingPracticeStores,
        missingSystemStores
      );
      
      // Update connection cache
      this.tenantConnections.set(targetTenantId, {
        tenantId: targetTenantId,
        db: upgradedDb,
        lastAccessed: Date.now(),
        refCount: 1,
      });
    }

    console.log(`[TenantDB] ✅ Practice registered: ${practiceId} in tenant: ${targetTenantId}`);
  }

  /**
   * Upgrade database to add practice stores and missing system stores
   */
  private upgradeDatabaseForPractice(
    tenantId: string,
    practiceId: string,
    newVersion: number,
    practiceStoresToCreate: string[],
    systemStoresToCreate: string[] = []
  ): Promise<IDBDatabase> {
    const dbName = getTenantDatabaseName(tenantId);
    console.log(`[TenantDB] Upgrading ${dbName} to v${newVersion} for practice: ${practiceId}`);
    console.log(`[TenantDB] Creating practice stores:`, practiceStoresToCreate);
    console.log(`[TenantDB] Creating system stores:`, systemStoresToCreate);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, newVersion);

      request.onerror = () => {
        console.error(`[TenantDB] Upgrade failed:`, request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        console.log(`[TenantDB] Upgrade complete for ${dbName} v${db.version}`);
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        console.log(`[TenantDB] onupgradeneeded: ${oldVersion} → ${newVersion}`);

        // Create missing system stores first
        for (const storeName of systemStoresToCreate) {
          if (!db.objectStoreNames.contains(storeName)) {
            console.log(`[TenantDB] Creating system store: ${storeName}`);
            const objectStore = db.createObjectStore(storeName, {
              keyPath: 'id',
              autoIncrement: true,
            });

            // Add indexes if defined for this store
            const indexes = (STORE_INDEXES as any)[storeName] || [];
            indexes.forEach((index: any) => {
              try {
                objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                console.log(`[TenantDB]   - Added index: ${index.name}`);
              } catch (error) {
                console.warn(`[TenantDB] Index creation failed for ${index.name}:`, error);
              }
            });
          }
        }

        // Create missing practice stores
        for (const storeName of practiceStoresToCreate) {
          if (!db.objectStoreNames.contains(storeName)) {
            console.log(`[TenantDB] Creating practice store: ${storeName}`);
            const objectStore = db.createObjectStore(storeName, { keyPath: 'id' });

            // Add standard indexes for practice stores
            objectStore.createIndex('tenantId', 'metadata.tenantId', { unique: false });
            objectStore.createIndex('practiceId', 'metadata.practiceId', { unique: false });
            objectStore.createIndex('createdAt', 'metadata.createdAt', { unique: false });
            objectStore.createIndex('updatedAt', 'metadata.updatedAt', { unique: false });
            objectStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          }
        }
      };
    });
  }

  /**
   * Delete entire tenant database
   */
  async deleteTenantDatabase(tenantId: string): Promise<void> {
    // Close connection if open
    const connection = this.tenantConnections.get(tenantId);
    if (connection) {
      connection.db.close();
      this.tenantConnections.delete(tenantId);
    }

    const dbName = getTenantDatabaseName(tenantId);
    console.log(`[TenantDB] Deleting tenant database: ${dbName}`);

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);

      request.onsuccess = () => {
        console.log(`[TenantDB] Deleted: ${dbName}`);
        resolve();
      };

      request.onerror = () => reject(request.error);

      request.onblocked = () => {
        console.warn(`[TenantDB] Delete blocked for: ${dbName}`);
        // Still resolve - deletion will complete when connections close
        resolve();
      };
    });
  }

  /**
   * Clear all practice data within tenant
   */
  async clearPracticeData(practiceId: string, tenantId?: string): Promise<void> {
    const targetTenantId = tenantId || this.currentTenantId;
    if (!targetTenantId) {
      throw new Error('No tenant context');
    }

    const db = await this.initialize(targetTenantId);
    const practiceStores = TENANT_ISOLATED_STORES.map((store) =>
      getPracticeStoreName(practiceId, store)
    );

    // Clear each practice store
    for (const storeName of practiceStores) {
      if (db.objectStoreNames.contains(storeName)) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    console.log(`[TenantDB] Cleared practice ${practiceId} data in tenant ${targetTenantId}`);
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    console.log(`[TenantDB] Closing ${this.tenantConnections.size} connections`);

    this.tenantConnections.forEach((connection) => {
      try {
        connection.db.close();
      } catch (error) {
        console.warn('[TenantDB] Error closing connection:', error);
      }
    });

    this.tenantConnections.clear();
    this.currentTenantId = null;
    this.currentPracticeId = null;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Start connection cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, CONNECTION_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Cleanup idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.tenantConnections.forEach((connection, tenantId) => {
      const idleTime = now - connection.lastAccessed;

      // Keep current tenant connection alive
      if (tenantId === this.currentTenantId) {
        return;
      }

      // Close idle connections
      if (idleTime > CONNECTION_CONFIG.MAX_IDLE_TIME && connection.refCount === 0) {
        try {
          connection.db.close();
          toRemove.push(tenantId);
          console.log(`[TenantDB] Closed idle connection: ${tenantId}`);
        } catch (error) {
          console.warn('[TenantDB] Error closing idle connection:', error);
        }
      }
    });

    toRemove.forEach((tenantId) => this.tenantConnections.delete(tenantId));

    // Enforce max connections
    if (this.tenantConnections.size > CONNECTION_CONFIG.MAX_CONNECTIONS) {
      const sorted = Array.from(this.tenantConnections.entries())
        .filter(([id]) => id !== this.currentTenantId)
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      const excess = sorted.slice(0, sorted.length - CONNECTION_CONFIG.MAX_CONNECTIONS + 1);
      excess.forEach(([tenantId, connection]) => {
        connection.db.close();
        this.tenantConnections.delete(tenantId);
        console.log(`[TenantDB] Closed excess connection: ${tenantId}`);
      });
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return {
      activeConnections: this.tenantConnections.size,
      currentTenant: this.currentTenantId,
      currentPractice: this.currentPracticeId,
      connections: Array.from(this.tenantConnections.entries()).map(([tenantId, conn]) => ({
        tenantId,
        lastAccessed: new Date(conn.lastAccessed).toISOString(),
        idleSeconds: Math.floor((Date.now() - conn.lastAccessed) / 1000),
        refCount: conn.refCount,
      })),
    };
  }
}

// Export singleton instance
export const tenantDatabaseManager = new TenantDatabaseManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    tenantDatabaseManager.closeAll();
  });
}
