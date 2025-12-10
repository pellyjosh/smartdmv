/**
 * Sync Engine
 * 
 * Core synchronization engine for bidirectional sync between offline storage and server.
 * Handles conflict detection, resolution, and batch processing.
 */

import type { SyncOperation } from '../types/sync.types';
import type {
  SyncResult,
  SyncConfig,
  SyncProgress,
  SyncStatus,
  Conflict,
  ConflictStrategy,
  ConflictSeverity,
  BatchResult,
  IdMapping,
  SyncError
} from '../types/sync-engine.types';

import * as conflictStorage from '../storage/conflict-storage';
import * as syncQueueStorage from '../storage/sync-queue-storage';
import * as relationshipManager from './relationship-manager';
import { indexedDBManager } from '../db/manager';
import { STORES } from '../db/schema';
import { 
  generateFieldDiffs, 
  hashObject, 
  isOnlyMetadataChanged,
  determineConflictSeverity,
  attemptMerge 
} from '../utils/diff-utils';
import { getOfflineTenantContext } from '../core/tenant-context';

/**
 * Default sync configuration
 */
const DEFAULT_CONFIG: SyncConfig = {
  batchSize: 50,
  maxRetries: 3,
  retryDelay: 1000,
  conflictStrategy: 'manual',
  autoResolveSimple: true,
  syncOnReconnect: true
};

/**
 * Sync Engine Class
 */
export class SyncEngine {
  private config: SyncConfig;
  private syncing: boolean = false;
  private progress: SyncProgress = {
    status: 'idle',
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    conflicts: 0,
    percentage: 0
  };

  constructor(config?: Partial<SyncConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Bidirectional sync: upload local changes and download server changes
   */
  async bidirectionalSync(): Promise<SyncResult> {
    if (this.syncing) {
      // Silent skip - don't throw error to avoid console spam
      console.log('[SyncEngine] ⏸️  Sync already in progress, skipping');
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        operations: [],
        errors: [],
        duration: 0,
        timestamp: Date.now(),
        idMappings: []
      };
    }

    this.syncing = true;
    this.updateProgress('preparing', 0, 0);

    try {
      // Step 1: Upload local changes
      console.log('📤 Uploading local changes...');
      const uploadResult = await this.syncToServer();

      // Step 2: Download server changes
      console.log('📥 Downloading server changes...');
      const downloadResult = await this.syncFromServer();

      // Combine results
      const combinedResult: SyncResult = {
        success: uploadResult.success && downloadResult.success,
        synced: uploadResult.synced + downloadResult.synced,
        failed: uploadResult.failed + downloadResult.failed,
        conflicts: uploadResult.conflicts + downloadResult.conflicts,
        operations: [...uploadResult.operations, ...downloadResult.operations],
        errors: [...uploadResult.errors, ...downloadResult.errors],
        duration: uploadResult.duration + downloadResult.duration,
        timestamp: Date.now(),
        idMappings: uploadResult.idMappings
      };

      this.updateProgress('success', combinedResult.synced, combinedResult.synced);
      return combinedResult;
    } catch (error) {
      this.updateProgress('error', 0, 0);
      throw error;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Sync local changes to server
   */
  async syncToServer(): Promise<SyncResult> {
    const startTime = Date.now();
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }
    const { isAuthenticatedOffline } = await import('../storage/auth-storage');
    const authed = await isAuthenticatedOffline(context.userId, context.tenantId);
    if (!authed) {
      return this.createEmptyResult(startTime);
    }

    // Get pending operations from sync queue
    const pendingOps = await syncQueueStorage.getPendingOperations(
      context.tenantId,
      this.config.batchSize
    );

    if (pendingOps.length === 0) {
      return this.createEmptyResult(startTime);
    }

    this.updateProgress('syncing', pendingOps.length, 0);

    // Sort operations by entity type dependency (clients before pets, pets before appointments, etc.)
    const sortedOps = relationshipManager.sortByEntityTypeDependency(pendingOps);

    // Process operations in sorted order
    return await this.processSyncBatch(sortedOps);
  }

  /**
   * Sync changes from server to local
   */
  async syncFromServer(): Promise<SyncResult> {
    const startTime = Date.now();
    console.log('[SyncEngine] syncFromServer() called at', new Date().toISOString());

    const context = await getOfflineTenantContext();
    if (!context) {
      console.error('[SyncEngine] No tenant context available');
      throw new Error('No tenant context available');
    }
    const { isAuthenticatedOffline } = await import('../storage/auth-storage');
    const authed = await isAuthenticatedOffline(context.userId, context.tenantId);
    if (!authed) {
      return this.createEmptyResult(startTime);
    }

    try {
      indexedDBManager.setCurrentTenant(context.tenantId, context.practiceId.toString());
      await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);
    } catch (_) {}

    console.log('📥 Fetching changes from server...', { practiceId: context.practiceId, tenantId: context.tenantId });

    try {
      // Get last sync timestamp from metadata
      const lastSyncTimestamp = await this.getLastSyncTimestamp();

      // Check if we should pull fresh data to ensure local records are up to date
      await this.checkForFreshDataPull(context, lastSyncTimestamp);

  const entityTypesToSync = 'appointments,pets,clients,practitioners,soapNotes,soapTemplates,rooms,admissions,vaccinations,vaccine_types,kennels,boarding_stays';
      const syncUrl = `/api/sync/pull?lastSyncTimestamp=${lastSyncTimestamp}&practiceId=${context.practiceId}&entityTypes=${entityTypesToSync}`;
      
      console.log('[SyncEngine] 🔄 Initiating sync pull...');
      console.log('[SyncEngine] 📍 Practice ID:', context.practiceId);
      console.log('[SyncEngine] 📦 Entity types:', entityTypesToSync);
      console.log('[SyncEngine] 🕒 Last sync:', new Date(lastSyncTimestamp).toISOString());
      console.log('[SyncEngine] 🌐 Request URL:', syncUrl);

      // Pull changes from server using authenticated API helper
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('GET', syncUrl);
      const pullResult = await response.json();

      const result: SyncResult = {
        success: true,
        synced: 0,
        failed: 0,
        conflicts: 0,
        operations: [],
        errors: [],
        duration: 0,
        timestamp: Date.now(),
        idMappings: [],
      };

      // Apply server changes to local storage
      console.log(`📥 Applying ${pullResult.changes.length} server changes to local storage`);
      
      // Group by entity type for better logging
      const changesByType = pullResult.changes.reduce((acc: Record<string, number>, change: any) => {
        acc[change.entityType] = (acc[change.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`📥 Changes by type:`, changesByType);
      
      for (const change of pullResult.changes) {
        try {
          console.log(`📥 [${change.entityType}] Applying ${change.operation} for ID ${change.id}`);
          console.log(`📥 [${change.entityType}] Data sample:`, {
            id: change.data?.id,
            tenantId: change.data?.tenantId,
            practiceId: change.data?.practiceId,
            hasAllFields: !!change.data,
          });
          
          await this.applyServerChange(change);
          result.synced++;
          console.log(`✅ [${change.entityType}] Successfully applied ID ${change.id}`);
        } catch (error) {
          console.error(`❌ [${change.entityType}] Failed to apply ID ${change.id}:`, error);
          console.error(`❌ [${change.entityType}] Error details:`, {
            message: error instanceof Error ? error.message : 'Unknown',
            stack: error instanceof Error ? error.stack : undefined,
            change: change,
          });
          result.failed++;
          result.errors.push({
            operationId: 0,
            entityType: change.entityType,
            entityId: change.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
            retryCount: 0,
            recoverable: true,
          });
        }
      }

      await this.updateLastSyncTimestamp(pullResult.timestamp);

      result.duration = Date.now() - startTime;
      result.success = result.failed === 0;

      console.log(`📥 Server sync complete: ${result.synced} synced, ${result.failed} failed`);

      return result;
    } catch (error) {
      console.error('📥 Server sync error:', error);
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        operations: [],
        errors: [
          {
            operationId: 0,
            entityType: 'system',
            entityId: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
            retryCount: 0,
            recoverable: true,
          },
        ],
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        idMappings: [],
      };
    }
  }

  /**
   * Apply a server change to local storage
   */
  private async applyServerChange(change: any): Promise<void> {
    console.log(`[applyServerChange] Processing ${change.operation} for ${change.entityType} ${change.id}`);

    const { saveEntity, updateEntity, deleteEntity } = await import('../storage/entity-storage');

    const context = await getOfflineTenantContext();
    console.log('[applyServerChange] Tenant context:', context);

    if (!context) {
      console.error('[applyServerChange] No tenant context available');
      throw new Error('No tenant context');
    }

    // Ensure practice is registered
    const { indexedDBManager } = await import('../db/manager');
    console.log(`[applyServerChange] Registering practice ${context.practiceId} for tenant ${context.tenantId}`);
    await indexedDBManager.registerPractice(context.practiceId.toString(), context.tenantId);

    switch (change.operation) {
      case 'create':
      case 'update':
        console.log(`[applyServerChange] Saving ${change.entityType} with data:`, change.data);
        try {
          // For sync operations, use UPSERT logic: try update first, if not found, create
          // This handles cases where server sends 'update' but entity doesn't exist locally yet
          const { getEntity } = await import('../storage/entity-storage');
          const exists = await getEntity(change.entityType, change.id);
          
          if (exists) {
            // Entity exists - update it
            const result = await updateEntity(change.entityType, change.id, change.data, 'synced');
            console.log(`[applyServerChange] ✅ Successfully updated ${change.entityType} ${change.id}:`, result);
          } else {
            // Entity doesn't exist - create it (even if server says 'update')
            const result = await saveEntity(change.entityType, change.data, 'synced');
            console.log(`[applyServerChange] ✅ Successfully created ${change.entityType} ${change.id}:`, result);
          }
        } catch (error) {
          console.error(`[applyServerChange] ❌ Failed to save/update ${change.entityType} ${change.id}:`, error);
          throw error;
        }
        break;

      case 'delete':
        // SKIP DELETE OPERATIONS - we don't delete anything locally during sync
        console.log(`[applyServerChange] ⏭️  Skipping delete for ${change.entityType} ${change.id} (deletes not supported in offline sync)`);
        break;

      default:
        console.warn(`[applyServerChange] Unknown operation type: ${change.operation}`);
    }
  }

  /**
   * Get last sync timestamp from metadata
   */
  private async getLastSyncTimestamp(): Promise<number> {
    try {
      const { indexedDBManager } = await import('../db/manager');
      const { STORES } = await import('../db/schema');
      const context = await getOfflineTenantContext();

      if (!context) return 0;

      const db = await indexedDBManager.initialize(context.tenantId);
      
      if (!Array.from(db.objectStoreNames).includes(STORES.METADATA)) {
        return 0;
      }

      const metadata = await new Promise<any>((resolve, reject) => {
        try {
          const tx = db.transaction(STORES.METADATA, 'readonly');
          const store = tx.objectStore(STORES.METADATA);
          const request = store.get('lastSyncTimestamp');

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });

      return metadata?.value || 0;
    } catch (error) {
      console.error('Failed to get last sync timestamp:', error);
      return 0;
    }
  }

  /**
   * Update last sync timestamp in metadata
   */
  private async updateLastSyncTimestamp(timestamp: number): Promise<void> {
    try {
      const { indexedDBManager } = await import('../db/manager');
      const { STORES } = await import('../db/schema');
      const context = await getOfflineTenantContext();

      if (!context) return;

      const db = await indexedDBManager.initialize(context.tenantId);

      if (!Array.from(db.objectStoreNames).includes(STORES.METADATA)) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(STORES.METADATA, 'readwrite');
          const store = tx.objectStore(STORES.METADATA);
          const request = store.put({
            key: 'lastSyncTimestamp',
            value: timestamp,
            updatedAt: Date.now(),
          });

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });

      console.log(`Updated last sync timestamp to ${new Date(timestamp).toISOString()}`);
    } catch (error) {
      console.error('Failed to update last sync timestamp:', error);
    }
  }

  /**
   * Pull a newly created record from server and save to local storage
   */
  private async pullAndSaveNewRecord(entityType: string, realId: number): Promise<void> {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    // Fetch the record from the appropriate API endpoint
    const apiEndpoint = this.getApiEndpointForEntity(entityType, realId);
    console.log(`[SyncEngine] Fetching new record from ${apiEndpoint}`);

    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${entityType} ${realId}: ${response.statusText}`);
    }

    const newRecord = await response.json();

    // Save to local storage
    const { saveEntity } = await import('../storage/entity-storage');
    await saveEntity(entityType, newRecord, 'synced');

    console.log(`[SyncEngine] ✅ Saved new ${entityType} record with ID ${realId} to local storage`);
  }

  /**
   * Get API endpoint for fetching a specific entity
   */
  private getApiEndpointForEntity(entityType: string, id: number): string {
    // Normalize entity type to API path
    const apiPaths: Record<string, string> = {
      'appointments': '/api/appointments',
      'appointment': '/api/appointments',
      'pets': '/api/pets',
      'pet': '/api/pets',
      'clients': '/api/users',
      'client': '/api/users',
      'users': '/api/users',
      'user': '/api/users',
      'soapNotes': '/api/soap-notes',
      'soapNote': '/api/soap-notes',
      'admissions': '/api/admissions',
      'admission': '/api/admissions',
      'rooms': '/api/admission-rooms',
      'room': '/api/admission-rooms',
      'vaccinations': '/api/vaccinations',
      'vaccination': '/api/vaccinations',
      'vaccine_types': '/api/vaccine-types',
    };
  // Add boarding-specific endpoints
  apiPaths['kennels'] = '/api/boarding/kennels';
  apiPaths['boarding_stays'] = '/api/boarding/stays';

    const basePath = apiPaths[entityType] || `/api/${entityType}`;
    return `${basePath}/${id}`;
  }

  /**
   * Process a batch of sync operations
   */
  async processSyncBatch(operations: SyncOperation[]): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      operations: [],
      errors: [],
      duration: 0,
      timestamp: Date.now(),
      idMappings: []
    };

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      this.updateProgress('syncing', operations.length, i);

      try {
        // Send operation to server - conflict detection re-enabled with practice-scoped storage
        const syncResult = await this.sendOperationToServer(operation);

        if (syncResult.success) {
          result.synced++;
          result.operations.push(operation);

          // Handle CREATE operations - delete temp record after successful sync
          if (operation.operation === 'create' && syncResult.realId) {
            console.log(`[SyncEngine] Processing successful CREATE: ${operation.entityType} ${operation.entityId} → ${syncResult.realId}`);

            // Store the mapping for tracking
            const mapping: IdMapping = {
              tempId: String(operation.entityId),
              realId: syncResult.realId,
              entityType: operation.entityType,
              createdAt: operation.timestamp,
              syncedAt: Date.now(),
              operationId: operation.id!
            };
            result.idMappings.push(mapping);

            // Delete the temporary record from local storage
            await this.deleteLocalTempRecord(operation.entityType, mapping.tempId);

            // Fetch the newly created record from server and save to local
            try {
              await this.pullAndSaveNewRecord(operation.entityType, syncResult.realId);
              console.log(`✅ Pulled and saved new record: ${operation.entityType} ${syncResult.realId}`);
            } catch (pullError) {
              console.error(`❌ Failed to pull new record ${operation.entityType} ${syncResult.realId}:`, pullError);
              // Don't fail the sync if pull fails - record is still created on server
            }

            console.log(`✅ Synced create: ${operation.entityType} ${mapping.tempId} → ${mapping.realId}`);
          }

          // Mark operation as completed
          await syncQueueStorage.markOperationCompleted(operation.id!);
        } else if (syncResult.conflictId) {
          // Conflict detected - already saved to practice-scoped conflict store
          result.conflicts++;
          console.log(`⚠️ Conflict detected for operation ${operation.id} (severity: ${syncResult.conflictId})`);
          // Note: Operation already marked as 'conflicted' in sendOperationToServer
        } else {
          // Regular failure - not a conflict
          result.failed++;
          result.errors.push({
            operationId: operation.id!,
            entityType: operation.entityType,
            entityId: operation.entityId,
            error: syncResult.error || 'Unknown error',
            timestamp: Date.now(),
            retryCount: operation.retryCount,
            recoverable: true
          });

          // Always mark for retry - no max retry limit
          await syncQueueStorage.markOperationFailed(operation.id!, syncResult.error || 'Unknown error');
          console.log(`⚠️ Operation ${operation.id} failed (attempt ${operation.retryCount + 1}): ${syncResult.error || 'Unknown error'}`);
        }

        this.config.progressCallback?.(this.progress);
      } catch (error) {
        result.failed++;
        result.errors.push({
          operationId: operation.id!,
          entityType: operation.entityType,
          entityId: operation.entityId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          retryCount: operation.retryCount,
          recoverable: false
        });

        this.config.errorCallback?.({
          operationId: operation.id!,
          entityType: operation.entityType,
          entityId: operation.entityId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          retryCount: operation.retryCount,
          recoverable: false
        });
      }
    }

    result.success = result.failed === 0;
    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Detect conflicts for an operation
   */
  async detectConflicts(operation: SyncOperation): Promise<Conflict | null> {
    // For CREATE operations, no conflicts possible
    if (operation.operation === 'create') {
      return null;
    }

    // Fetch current server state (mock for now)
    const serverData = await this.fetchServerData(
      operation.entityType,
      operation.entityId
    );

    if (!serverData) {
      // Entity doesn't exist on server
      if (operation.operation === 'update') {
        return this.createConflict(operation, null, 'missing');
      }
      return null;
    }

    // Compare local and server data
    const diffs = generateFieldDiffs(operation.data, serverData);
    const affectedFields = diffs.map(d => d.field);

    if (diffs.length === 0) {
      return null; // No changes
    }

    // Check if only metadata changed
    const onlyMetadata = isOnlyMetadataChanged(diffs);
    if (onlyMetadata) {
      return null; // Auto-resolve metadata-only conflicts
    }

    // Determine conflict type and severity
    const conflictType = this.determineConflictType(operation, serverData);
    const severity = determineConflictSeverity(diffs);

    return this.createConflict(
      operation,
      serverData,
      conflictType,
      affectedFields,
      severity,
      severity === 'low' // Auto-resolvable if low severity
    );
  }

  /**
   * Create a conflict object
   */
  private createConflict(
    operation: SyncOperation,
    serverData: any,
    conflictType: Conflict['conflictType'],
    affectedFields: string[] = [],
    severity: ConflictSeverity = 'medium',
    autoResolvable: boolean = false
  ): Conflict {
    return {
      id: Date.now(), // Will be replaced by IndexedDB auto-increment
      operation,
      localData: operation.data,
      serverData,
      detectedAt: Date.now(),
      conflictType,
      affectedFields,
      severity,
      autoResolvable,
      resolved: false
    };
  }

  /**
   * Determine conflict type
   */
  private determineConflictType(
    operation: SyncOperation,
    serverData: any
  ): Conflict['conflictType'] {
    // Version mismatch
    if (operation.data.version && serverData.version) {
      if (operation.data.version !== serverData.version) {
        return 'version';
      }
    }

    // Timestamp comparison
    if (operation.data.lastModified && serverData.lastModified) {
      if (operation.data.lastModified < serverData.lastModified) {
        return 'timestamp';
      }
    }

    // Data hash mismatch
    const localHash = hashObject(operation.data);
    const serverHash = hashObject(serverData);
    if (localHash !== serverHash) {
      return 'data';
    }

    return 'data';
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflict: Conflict,
    resolution: Conflict['resolution']
  ): Promise<void> {
    await conflictStorage.resolveConflict(conflict.id, resolution!);

    const { saveEntity, updateEntity } = await import('../storage/entity-storage');

    // Apply resolution based on strategy
    switch (resolution!.strategy) {
      case 'server-wins':
        // Update local with server data
        console.log('🔄 Applying server-wins resolution');
        if (conflict.serverData) {
          await updateEntity(
            conflict.operation.entityType,
            conflict.operation.entityId,
            conflict.serverData,
            'synced'
          );
        }
        // Remove the original operation from sync queue (conflict is resolved)
        if (conflict.operation.id) {
          await syncQueueStorage.markOperationCompleted(conflict.operation.id);
        }
        break;

      case 'client-wins':
        // Keep local, re-queue operation to force sync to server
        console.log('🔄 Applying client-wins resolution');
        
        // First, remove the old conflicting operation
        if (conflict.operation.id) {
          await syncQueueStorage.markOperationCompleted(conflict.operation.id);
        }
        
        // Then queue a fresh operation with client data
        await syncQueueStorage.queueOperation({
          operation: conflict.operation.operation,
          entityType: conflict.operation.entityType,
          entityId: conflict.operation.entityId,
          data: conflict.localData,
          tenantId: conflict.operation.tenantId,
          practiceId: conflict.operation.practiceId,
          userId: conflict.operation.userId,
          priority: 'high',
          maxRetries: 3,
          version: (conflict.localData.version || 0) + 1,
          requiredPermissions: conflict.operation.requiredPermissions || [],
        });
        break;

      case 'merge':
        // Merge data
        const merged = attemptMerge(conflict.localData, conflict.serverData);
        console.log('🔄 Applying merge resolution:', merged);
        
        if (merged) {
          // Update local with merged data
          await updateEntity(
            conflict.operation.entityType,
            conflict.operation.entityId,
            merged as any,
            'pending'
          );

          // Remove the old conflicting operation
          if (conflict.operation.id) {
            await syncQueueStorage.markOperationCompleted(conflict.operation.id);
          }

          // Queue operation to sync merged data to server
          await syncQueueStorage.queueOperation({
            operation: 'update',
            entityType: conflict.operation.entityType,
            entityId: conflict.operation.entityId,
            data: merged,
            tenantId: conflict.operation.tenantId,
            practiceId: conflict.operation.practiceId,
            userId: conflict.operation.userId,
            priority: 'high',
            maxRetries: 3,
            version: ((merged as any).version || 0) + 1,
            requiredPermissions: conflict.operation.requiredPermissions || [],
          });
        }
        break;

      case 'last-write-wins':
        // Use most recent timestamp
        const localTimestamp = conflict.localData.lastModified || conflict.localData.updatedAt || 0;
        const serverTimestamp = conflict.serverData?.lastModified || conflict.serverData?.updatedAt || 0;
        const useLocal = localTimestamp > serverTimestamp;
        
        console.log(`🔄 Applying last-write-wins: ${useLocal ? 'local' : 'server'}`);
        
        if (useLocal) {
          // Remove the old conflicting operation
          if (conflict.operation.id) {
            await syncQueueStorage.markOperationCompleted(conflict.operation.id);
          }
          
          // Re-queue local data to force sync
          await syncQueueStorage.queueOperation({
            operation: conflict.operation.operation,
            entityType: conflict.operation.entityType,
            entityId: conflict.operation.entityId,
            data: conflict.localData,
            tenantId: conflict.operation.tenantId,
            practiceId: conflict.operation.practiceId,
            userId: conflict.operation.userId,
            priority: 'high',
            maxRetries: 3,
            version: (conflict.localData.version || 0) + 1,
            requiredPermissions: conflict.operation.requiredPermissions || [],
          });
        } else if (conflict.serverData) {
          // Use server data
          await updateEntity(
            conflict.operation.entityType,
            conflict.operation.entityId,
            conflict.serverData,
            'synced'
          );
          // Remove the old conflicting operation
          if (conflict.operation.id) {
            await syncQueueStorage.markOperationCompleted(conflict.operation.id);
          }
        }
        break;

      case 'manual':
        // Manual resolution - data already prepared in resolution
        console.log('🔄 Applying manual resolution');
        if (resolution!.resolvedData) {
          await updateEntity(
            conflict.operation.entityType,
            conflict.operation.entityId,
            resolution!.resolvedData,
            'pending'
          );

          // Remove the old conflicting operation
          if (conflict.operation.id) {
            await syncQueueStorage.markOperationCompleted(conflict.operation.id);
          }

          // Queue to sync manually resolved data
          await syncQueueStorage.queueOperation({
            operation: 'update',
            entityType: conflict.operation.entityType,
            entityId: conflict.operation.entityId,
            data: resolution!.resolvedData,
            tenantId: conflict.operation.tenantId,
            practiceId: conflict.operation.practiceId,
            userId: conflict.operation.userId,
            priority: 'high',
            maxRetries: 3,
            version: (resolution!.resolvedData.version || 0) + 1,
            requiredPermissions: conflict.operation.requiredPermissions || [],
          });
        }
        break;

      default:
        console.warn(`Unknown resolution strategy: ${resolution!.strategy}`);
    }

    console.log(`✅ Conflict ${conflict.id} resolved with ${resolution!.strategy} strategy`);
  }

  /**
   * Delete local temporary record after successful sync
   * The fresh record will be pulled from server during next sync
   */
  private async deleteLocalTempRecord(entityType: string, tempId: string): Promise<void> {
    try {
      console.log(`[SyncEngine] Attempting to delete temp record: ${entityType} ${tempId}`);

      // Use entity storage's hard delete function which properly handles practice-scoped stores
      const { hardDeleteEntity } = await import('../storage/entity-storage');
      await hardDeleteEntity(entityType, tempId);

      console.log(`🗑️ Deleted local temp record: ${entityType} ${tempId}`);
    } catch (error) {
      console.error(`[SyncEngine] Failed to delete temp record ${tempId}:`, error);
      // Don't throw - this is a cleanup operation, sync should continue
    }
  }

  /**
   * Send operation to server
   */
  private async sendOperationToServer(
    operation: SyncOperation
  ): Promise<{ success: boolean; realId?: number; error?: string; conflictId?: number }> {
    try {
      console.log(`📤 Sending ${operation.operation} for ${operation.entityType} ${operation.entityId}`);

      // Sanitize data - convert string numbers to actual numbers for appointments
      let sanitizedData = { ...operation.data };
      
      if (operation.entityType === 'appointments') {
        // Convert numeric fields from strings to numbers
        const numericFields = ['durationMinutes', 'petId', 'clientId', 'staffId', 'practitionerId', 'practiceId'];
        numericFields.forEach(field => {
          if (sanitizedData[field] && typeof sanitizedData[field] === 'string') {
            const num = parseInt(sanitizedData[field], 10);
            if (!isNaN(num)) {
              sanitizedData[field] = num;
            }
          }
        });
        
        // Remove metadata from data (it's already in operation metadata)
        delete sanitizedData.metadata;
      }

      // Prepare operation for API - ensure proper types
      const apiOperation = {
        id: operation.id ? (typeof operation.id === 'string' ? parseInt(operation.id, 10) : operation.id) : undefined,
        operation: operation.operation,
        entityType: operation.entityType,
        entityId: operation.entityId,
        data: sanitizedData,
        timestamp: operation.timestamp,
        userId: typeof operation.userId === 'string' ? parseInt(operation.userId, 10) : operation.userId,
        practiceId: typeof operation.practiceId === 'string' ? parseInt(operation.practiceId, 10) : operation.practiceId,
        tenantId: String(operation.tenantId),
      };

      console.log('📤 Sending operation to server:', {
        operation: apiOperation.operation,
        entityType: apiOperation.entityType,
        entityId: apiOperation.entityId,
        tenantId: apiOperation.tenantId,
        tenantIdType: typeof apiOperation.tenantId,
        practiceId: apiOperation.practiceId,
        userId: apiOperation.userId,
      });

      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('POST', '/api/sync/push', {
        operations: [apiOperation],
        clientTimestamp: Date.now(),
      });
      const result = await response.json();

      // Check result for this specific operation
      if (result.results && result.results.length > 0) {
        const opResult = result.results[0];

        if (opResult.conflict) {
          console.warn('⚠️ Conflict detected from server:', opResult.conflictData);
          
          // Save conflict to practice-scoped conflicts store
          const conflict: Conflict = {
            id: 0, // Will be auto-generated
            operation: operation,
            localData: operation.data,
            serverData: opResult.conflictData.serverData,
            detectedAt: Date.now(),
            conflictType: opResult.conflictData.conflictType || 'timestamp',
            affectedFields: opResult.conflictData.affectedFields || [],
            severity: this.determineConflictSeverity(opResult.conflictData.affectedFields || []),
            autoResolvable: this.isAutoResolvable(opResult.conflictData),
            resolved: false,
          };

          // Save to practice-scoped conflicts store
          await conflictStorage.saveConflict(conflict);
          console.log('💾 Conflict saved to practice-scoped store');

          // Mark operation as conflicted in sync queue
          if (operation.id) {
            await syncQueueStorage.updateOperationStatus(operation.id, 'conflicted');
          }

          return {
            success: false,
            error: 'Conflict detected and saved',
            conflictId: conflict.id,
          };
        }

        if (opResult.success) {
          console.log(`✅ Successfully synced ${operation.entityType} ${operation.entityId}`);
          return {
            success: true,
            realId: opResult.realId,
          };
        } else {
          return {
            success: false,
            error: opResult.error || 'Unknown error',
          };
        }
      }

      return { success: false, error: 'No result returned' };
    } catch (error) {
      console.error('❌ Network error during sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Fetch current server data
   */
  private async fetchServerData(
    entityType: string,
    entityId: string | number
  ): Promise<any | null> {
    try {
      // Use the standard API endpoints to fetch data
      const endpoint = `/api/${entityType}/${entityId}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return null; // Entity doesn't exist
      }

      if (!response.ok) {
        console.error(`Failed to fetch ${entityType} ${entityId}:`, response.statusText);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ${entityType} ${entityId}:`, error);
      return null;
    }
  }

  /**
   * Update sync progress
   */
  private updateProgress(
    status: SyncStatus,
    total: number,
    processed: number
  ): void {
    this.progress = {
      ...this.progress,
      status,
      total,
      processed,
      percentage: total > 0 ? Math.round((processed / total) * 100) : 0,
      startedAt: this.progress.startedAt || Date.now()
    };
  }

  /**
   * Create empty result
   */
  private createEmptyResult(startTime: number): SyncResult {
    return {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      operations: [],
      errors: [],
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      idMappings: []
    };
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress {
    return { ...this.progress };
  }

  /**
   * Get status
   */
  getStatus(): SyncStatus {
    return this.progress.status;
  }

  /**
   * Check for and perform fresh data pull if needed
   */
  private async checkForFreshDataPull(context: any, lastSyncTimestamp: number): Promise<void> {
    console.log('[SyncEngine] 🔍 Checking if fresh data pull is needed...');

    try {
      // Check how long since last sync
      if (lastSyncTimestamp > 0) {
        const timeSinceLastSync = Date.now() - lastSyncTimestamp;
        const hoursSinceLastSync = timeSinceLastSync / (1000 * 60 * 60);

        // Pull fresh data if more than 24 hours since last sync
        if (hoursSinceLastSync > 24) {
          console.log(`[SyncEngine] ⏰ ${hoursSinceLastSync.toFixed(1)} hours since last sync, checking for fresh data`);
          // Make a small API call to check if there are recent changes
          // For now, we'll optimize by just calling the normal sync pull
          // which will handle this via the lastSyncTimestamp parameter
          return;
        } else {
          console.log(`[SyncEngine] ✅ Recent sync (${hoursSinceLastSync.toFixed(1)} hours ago), using normal pull`);
          return;
        }
      } else {
        // No previous sync - this will be handled by the normal sync pull
        console.log('[SyncEngine] 📄 First sync, using normal pull process');
        return;
      }

    } catch (error) {
      console.error('[SyncEngine] Error checking fresh data pull:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Is sync in progress
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * Get count of pending operations
   */
  async getPendingOperationsCount(): Promise<number> {
    try {
      const stats = await syncQueueStorage.getQueueStats();
      return stats.pending;
    } catch (error) {
      console.error('[SyncEngine] Failed to get pending count:', error);
      return 0;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Determine conflict severity based on affected fields
   */
  private determineConflictSeverity(affectedFields: string[]): ConflictSeverity {
    if (affectedFields.length === 0) {
      return 'low';
    }

    // Critical fields that should trigger high severity
    const criticalFields = ['id', 'deletedAt', 'status', 'payment_status', 'appointment_status'];
    const hasCritical = affectedFields.some(field => criticalFields.includes(field));
    
    if (hasCritical) {
      return 'critical';
    }

    // High priority fields
    const highPriorityFields = ['amount', 'total', 'date', 'time', 'practitioner_id', 'patient_id'];
    const hasHighPriority = affectedFields.some(field => highPriorityFields.includes(field));
    
    if (hasHighPriority) {
      return 'high';
    }

    // More than 5 fields changed
    if (affectedFields.length > 5) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check if conflict can be auto-resolved
   */
  private isAutoResolvable(conflictData: any): boolean {
    // Auto-resolve if only metadata fields changed (timestamps, etc.)
    const metadataFields = ['createdAt', 'updatedAt', 'lastModified', 'syncedAt'];
    const affectedFields = conflictData.affectedFields || [];
    
    if (affectedFields.length === 0) {
      return false;
    }

    // If only metadata fields changed, it's auto-resolvable
    const onlyMetadata = affectedFields.every((field: string) => metadataFields.includes(field));
    
    if (onlyMetadata) {
      return true;
    }

    // If conflict type is 'timestamp' and severity is low, auto-resolve
    if (conflictData.conflictType === 'timestamp' && affectedFields.length <= 2) {
      return true;
    }

    return false;
  }
}

/**
 * Singleton instance
 */
let syncEngineInstance: SyncEngine | null = null;

/**
 * Get sync engine instance
 */
export function getSyncEngine(config?: Partial<SyncConfig>): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(config);
  } else if (config) {
    syncEngineInstance.updateConfig(config);
  }
  return syncEngineInstance;
}

/**
 * Convenience function for full sync
 */
export async function performSync(config?: Partial<SyncConfig>): Promise<SyncResult> {
  const engine = getSyncEngine(config);
  return await engine.bidirectionalSync();
}
