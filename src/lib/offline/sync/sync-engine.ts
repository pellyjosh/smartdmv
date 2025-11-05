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
import * as tempIdResolver from './temp-id-resolver';
import * as relationshipManager from './relationship-manager';
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
      throw new Error('Sync already in progress');
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

    // Get pending operations from sync queue
    const pendingOps = await syncQueueStorage.getPendingOperations(
      context.tenantId,
      this.config.batchSize
    );

    if (pendingOps.length === 0) {
      return this.createEmptyResult(startTime);
    }

    this.updateProgress('syncing', pendingOps.length, 0);

    // Build dependency graph and sort operations
    const sortedOps = relationshipManager.sortByEntityTypeDependency(pendingOps);
    const graph = relationshipManager.buildDependencyGraph(sortedOps);

    if (graph.cycles.length > 0) {
      console.warn('⚠️ Circular dependencies detected:', graph.cycles);
    }

    // Process operations in batches
    return await this.processSyncBatch(graph.sortedOperations);
  }

  /**
   * Sync changes from server to local
   */
  async syncFromServer(): Promise<SyncResult> {
    const startTime = Date.now();
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    // TODO: Implement server download logic
    // This will be implemented when API endpoints are ready
    console.log('📥 Server sync not yet implemented');

    return this.createEmptyResult(startTime);
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
        // Check for conflicts
        const conflict = await this.detectConflicts(operation);

        if (conflict) {
          result.conflicts++;
          await conflictStorage.saveConflict(conflict);

          // Try auto-resolve if enabled
          if (this.config.autoResolveSimple && conflict.autoResolvable) {
            await this.resolveConflict(conflict, { 
              strategy: this.config.conflictStrategy,
              appliedAt: Date.now()
            });
          } else {
            // Skip this operation for now
            this.config.conflictCallback?.(conflict);
            continue;
          }
        }

        // Send operation to server
        const syncResult = await this.sendOperationToServer(operation);

        if (syncResult.success) {
          result.synced++;
          result.operations.push(operation);

          // Handle ID mapping for CREATE operations
          if (operation.operation === 'create' && syncResult.realId) {
            const mapping: IdMapping = {
              tempId: String(operation.entityId),
              realId: syncResult.realId,
              entityType: operation.entityType,
              createdAt: operation.timestamp,
              syncedAt: Date.now(),
              operationId: operation.id!
            };
            result.idMappings.push(mapping);
            await tempIdResolver.mapTempToReal(
              mapping.tempId,
              mapping.realId,
              mapping.entityType,
              mapping.operationId
            );
          }

          // Mark operation as completed
          await syncQueueStorage.markOperationCompleted(operation.id!);
        } else {
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

          // Mark for retry or failed
          if (operation.retryCount < this.config.maxRetries) {
            await syncQueueStorage.markOperationFailed(operation.id!, syncResult.error || 'Unknown error');
          }
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

    // Apply resolution based on strategy
    switch (resolution!.strategy) {
      case 'server-wins':
        // Update local with server data
        console.log('🔄 Applying server-wins resolution');
        break;

      case 'client-wins':
        // Keep local, sync to server
        console.log('🔄 Applying client-wins resolution');
        break;

      case 'merge':
        // Merge data
        const merged = attemptMerge(conflict.localData, conflict.serverData);
        console.log('🔄 Applying merge resolution:', merged);
        break;

      case 'last-write-wins':
        // Use most recent timestamp
        const useLocal = conflict.localData.lastModified > 
                         conflict.serverData?.lastModified;
        console.log(`🔄 Applying last-write-wins: ${useLocal ? 'local' : 'server'}`);
        break;
    }
  }

  /**
   * Send operation to server (mock implementation)
   */
  private async sendOperationToServer(
    operation: SyncOperation
  ): Promise<{ success: boolean; realId?: number; error?: string }> {
    // TODO: Replace with actual API call
    // For now, simulate success
    console.log(`📤 Sending ${operation.operation} for ${operation.entityType} ${operation.entityId}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate success with real ID for CREATE operations
    if (operation.operation === 'create') {
      return {
        success: true,
        realId: Math.floor(Math.random() * 10000)
      };
    }

    return { success: true };
  }

  /**
   * Fetch current server data (mock implementation)
   */
  private async fetchServerData(
    entityType: string,
    entityId: string | number
  ): Promise<any | null> {
    // TODO: Replace with actual API call
    // For now, return null (no server data)
    return null;
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
   * Get sync status
   */
  getStatus(): SyncStatus {
    return this.progress.status;
  }

  /**
   * Is sync in progress
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
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
