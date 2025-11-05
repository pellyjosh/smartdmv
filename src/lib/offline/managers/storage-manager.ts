/**
 * Storage Manager
 * Main orchestrator for offline storage operations
 */

import { indexedDBManager } from '../db/manager';
import { getOfflineTenantContext, setOfflineTenantContext, clearOfflineTenantContext } from '../core/tenant-context';
import * as entityStorage from '../storage/entity-storage';
import * as authStorage from '../storage/auth-storage';
import * as permissionStorage from '../storage/permission-storage';
import * as syncQueueStorage from '../storage/sync-queue-storage';
import type { StorageStats, StorageConfig } from '../types/storage.types';
import type { SyncStatus } from '../types/storage.types';
import { DEFAULT_STORAGE_CONFIG } from '../db/schema';
import { DatabaseError } from '../utils/error-handlers';

/**
 * Storage Manager Class
 */
class StorageManager {
  private initialized = false;
  private config: StorageConfig = DEFAULT_STORAGE_CONFIG as StorageConfig;

  /**
   * Initialize storage manager
   */
  async initialize(tenantId?: string, practiceId?: number, userId?: number): Promise<void> {
    try {
      console.log('[StorageManager] 🔧 Initialize called with:', { tenantId, practiceId, userId });

      // Set tenant context FIRST before any database operations
      if (tenantId) {
        // Validate and convert practiceId
        const practiceIdString = practiceId !== undefined && practiceId !== null && !isNaN(practiceId)
          ? practiceId.toString()
          : undefined;
          
        if (practiceIdString) {
          console.log('[StorageManager] 🎯 Setting tenant context:', { tenantId, practiceId: practiceIdString });
          indexedDBManager.setCurrentTenant(tenantId, practiceIdString);
        } else {
          console.log('[StorageManager] 🎯 Setting tenant context (no practice):', { tenantId });
          indexedDBManager.setCurrentTenant(tenantId);
        }
        
        // Initialize database for this tenant
        console.log('[StorageManager] 📂 Initializing database for tenant:', tenantId);
        const db = await indexedDBManager.initialize(tenantId);
        console.log('[StorageManager] ✅ Database initialized:', db.name, 'version:', db.version);
        
        // Register practice if provided and valid
        if (practiceIdString) {
          console.log('[StorageManager] 🏥 Registering practice:', practiceIdString);
          await indexedDBManager.registerPractice(practiceIdString, tenantId);
          console.log('[StorageManager] ✅ Practice registered');
        } else {
          console.warn('[StorageManager] ⚠️ No valid practice ID provided, skipping practice registration');
        }
        
        // Set tenant context for offline operations
        if (practiceId !== undefined && !isNaN(practiceId) && userId) {
          console.log('[StorageManager] 📝 Setting offline tenant context');
          setOfflineTenantContext({
            tenantId,
            practiceId,
            userId,
          });
          console.log('[StorageManager] ✅ Offline tenant context set');
        }
      } else {
        // Initialize without tenant (will fail if operations attempted)
        console.warn('[StorageManager] ⚠️ Initialized without tenant context');
      }

      this.initialized = true;
      console.log('[StorageManager] ✅ Initialized successfully, flag set to true');
    } catch (error) {
      console.error('[StorageManager] ❌ Initialization failed:', error);
      console.error('[StorageManager] Error stack:', (error as Error).stack);
      throw new DatabaseError('Failed to initialize storage manager', error as Error);
    }
  }

  /**
   * Check if storage is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Save entity with permission check
   */
  async saveEntity<T extends { id?: number | string }>(
    entityType: string,
    data: T,
    syncStatus?: SyncStatus
  ): Promise<T> {
    await this.ensureInitialized();
    
    const entity = await entityStorage.saveEntity(entityType, data, syncStatus);
    return entity.data;
  }

  /**
   * Get entity by ID
   */
  async getEntity<T>(entityType: string, entityId: number | string): Promise<T | null> {
    await this.ensureInitialized();
    return entityStorage.getEntity<T>(entityType, entityId);
  }

  /**
   * Get all entities
   */
  async getAllEntities<T>(entityType: string): Promise<T[]> {
    await this.ensureInitialized();
    return entityStorage.getAllEntities<T>(entityType);
  }

  /**
   * Update entity
   */
  async updateEntity<T extends { id: number | string }>(
    entityType: string,
    entityId: number | string,
    updates: Partial<T>
  ): Promise<T> {
    await this.ensureInitialized();
    
    const entity = await entityStorage.updateEntity(entityType, entityId, updates);
    return entity.data;
  }

  /**
   * Delete entity
   */
  async deleteEntity(entityType: string, entityId: number | string): Promise<void> {
    await this.ensureInitialized();
    await entityStorage.deleteEntity(entityType, entityId);
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    await this.ensureInitialized();
    
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    // Get storage estimate from browser API
    let usage = 0;
    let quota = 0;
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        usage = estimate.usage || 0;
        quota = estimate.quota || 0;
      } catch (error) {
        console.warn('[StorageManager] Could not get storage estimate:', error);
      }
    }

    const queueStats = await syncQueueStorage.getQueueStats();

    // Count entities by type
    const entityCounts: any = {};
    const entityTypes = ['pets', 'appointments', 'clients', 'soapNotes', 'invoices', 'inventory'];
    
    for (const entityType of entityTypes) {
      try {
        const count = await entityStorage.countEntities(entityType);
        entityCounts[entityType] = count;
      } catch (error) {
        entityCounts[entityType] = 0;
      }
    }

    // Get last sync time from metadata
    const lastSyncTime = await this.getLastSyncTime();

    return {
      totalUsage: usage,
      quota,
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      entityCounts,
      pendingOperations: queueStats.pending,
      lastSyncTime,
      oldestUnsyncedOperation: queueStats.oldestOperation,
    };
  }

  /**
   * Clear all offline data for current tenant
   */
  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    // Clear practice data for current practice
    const practiceIdString = context.practiceId.toString();
    await indexedDBManager.clearPracticeData(practiceIdString, context.tenantId);

    // Clear sync queue
    await syncQueueStorage.clearAllOperations(context.tenantId);

    // Clear auth and permissions
    await authStorage.clearAuth(context.userId, context.tenantId);
    await permissionStorage.clearPermissions(context.userId, context.tenantId);

    console.log('[StorageManager] Cleared all data for practice:', practiceIdString);
  }

  /**
   * Export data for backup
   */
  async exportData(): Promise<any> {
    await this.ensureInitialized();
    
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    const entityTypes = ['pets', 'appointments', 'clients', 'soapNotes', 'invoices'];
    const data: any = {
      tenant: context.tenantId,
      exportedAt: Date.now(),
      entities: {},
    };

    for (const entityType of entityTypes) {
      try {
        data.entities[entityType] = await entityStorage.getAllEntities(entityType);
      } catch (error) {
        console.error(`Failed to export ${entityType}:`, error);
        data.entities[entityType] = [];
      }
    }

    return data;
  }

  /**
   * Import data from backup
   */
  async importData(backup: any): Promise<void> {
    await this.ensureInitialized();
    
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    if (backup.tenant !== context.tenantId) {
      throw new Error('Backup tenant mismatch');
    }

    for (const [entityType, entities] of Object.entries(backup.entities)) {
      if (Array.isArray(entities)) {
        await entityStorage.bulkSaveEntities(entityType, entities as any[], 'synced');
      }
    }

    console.log('[StorageManager] Imported data');
  }

  /**
   * Get last sync timestamp
   */
  private async getLastSyncTime(): Promise<number> {
    try {
      // This would typically be stored in metadata store
      // For now, return the most recent synced entity timestamp
      const context = await getOfflineTenantContext();
      if (!context) return 0;

      // You could store this in a metadata record
      return Date.now(); // Placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Ensure storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      console.warn('[StorageManager] Auto-initializing storage manager...');
      try {
        await this.initialize();
      } catch (error) {
        throw new Error('Storage manager not initialized. Call initialize() first.');
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Close storage connections
   */
  close(): void {
    indexedDBManager.closeAll();
    this.initialized = false;
    console.log('[StorageManager] Closed');
  }
}

// Export singleton instance
export const storageManager = new StorageManager();

// Export methods for direct use
export const {
  initialize,
  saveEntity,
  getEntity,
  getAllEntities,
  updateEntity,
  deleteEntity,
  getStats,
  clearAllData,
  exportData,
  importData,
} = storageManager;
