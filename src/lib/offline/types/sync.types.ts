/**
 * Sync queue types for offline functionality
 */

export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncPriority = 'high' | 'normal' | 'low';
export type SyncOperationStatus = 'pending' | 'in_progress' | 'failed' | 'conflicted' | 'completed';

/**
 * Sync operation queue item
 */
export interface SyncOperation {
  id?: number;
  tenantId: string;
  practiceId: number;
  userId: number;
  entityType: string;
  entityId: number | string;
  operation: SyncOperationType;
  data?: any;
  previousData?: any; // For update operations
  relationships?: RelationshipMap;
  timestamp: number;
  priority: SyncPriority;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  status: SyncOperationStatus;
  conflictData?: ConflictData;
  requiredPermissions: string[];
  version: number;
  serverVersion?: number;
  dependsOn?: Array<number | string>; // IDs of operations this depends on
  metadata?: OperationMetadata;
}

/**
 * Relationship tracking for sync operations
 */
export interface RelationshipMap {
  [key: string]: number | string | null; // e.g., { petId: 123, clientId: 456 }
}

/**
 * Conflict data when server and local versions differ
 */
export interface ConflictData {
  serverVersion: any;
  localVersion: any;
  conflictFields: string[];
  conflictedAt: number;
  serverModifiedAt?: number;
  serverModifiedBy?: number;
}

/**
 * Additional metadata for operations
 */
export interface OperationMetadata {
  userAgent?: string;
  deviceId?: string;
  offline: boolean;
  createdOffline: boolean;
  attemptedAt?: number[];
  estimatedSize?: number; // bytes
}

/**
 * Sync queue statistics
 */
export interface SyncQueueStats {
  total: number;
  pending: number;
  inProgress: number;
  failed: number;
  conflicted: number;
  byEntityType: Record<string, number>;
  byPriority: Record<SyncPriority, number>;
  oldestOperation?: number; // timestamp
  estimatedSyncTime?: number; // milliseconds
}

/**
 * Sync progress during synchronization
 */
export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  conflicted: number;
  current?: string;
  currentOperation?: SyncOperation;
  startedAt: number;
  estimatedCompletion?: number;
}

/**
 * Sync result after completion
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictData[];
  errors: Array<{
    operation: SyncOperation;
    error: string;
  }>;
  duration: number;
  timestamp: number;
}

/**
 * Conflict resolution choice
 */
export type ConflictResolution = 'keep_local' | 'use_server' | 'merge' | 'discard';

/**
 * Conflict resolution request
 */
export interface ConflictResolutionRequest {
  operationId: number;
  resolution: ConflictResolution;
  mergedData?: any; // If resolution is 'merge'
}

/**
 * Dependency graph node for operation ordering
 */
export interface DependencyNode {
  operation: SyncOperation;
  dependencies: number[];
  dependents: number[];
  depth: number; // For topological sorting
}

/**
 * Batch sync request
 */
export interface BatchSyncRequest {
  operations: SyncOperation[];
  maxBatchSize?: number;
  stopOnError?: boolean;
  priority?: SyncPriority;
}

/**
 * Temporary ID mapping (offline ID -> server ID)
 */
export interface IdMapping {
  tempId: string | number;
  serverId: number;
  entityType: string;
  mappedAt: number;
}
