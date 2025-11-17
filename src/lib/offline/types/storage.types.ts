/**
 * Core storage types for offline functionality
 */

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export type EntityType =
  | 'pets'
  | 'appointments'
  | 'clients'
  | 'soapNotes'
  | 'prescriptions'
  | 'labResults'
  | 'medicalRecords'
  | 'vaccinations'
  | 'vaccine_types'
  | 'practitioners'
  | 'rooms'
  | 'admissions'
  | 'kennels'
  | 'boarding_stays'
  | 'userRoles'
  | 'permissions';

/**
 * Generic wrapper for all entities stored offline
 */
export interface OfflineEntity<T = any> {
  id: number | string;
  data: T;
  metadata: EntityMetadata;
}

/**
 * Metadata tracked for every offline entity
 */
export interface EntityMetadata {
  tenantId: string;
  practiceId: number;
  userId: number;
  createdAt: number;
  lastModified: number;
  syncStatus: SyncStatus;
  version: number;
  serverVersion?: number;
  lastSyncedAt?: number;
  createdBy?: number;
  modifiedBy?: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalUsage: number; // bytes
  quota: number; // bytes
  percentUsed: number;
  entityCounts: Record<EntityType, number>;
  pendingOperations: number;
  lastSyncTime: number;
  oldestUnsyncedOperation?: number;
}

/**
 * Storage configuration per tenant
 */
export interface StorageConfig {
  tenantId: string;
  maxStorageSize: number; // bytes
  retentionDays: number;
  autoCleanup: boolean;
  syncInterval: number; // milliseconds
  maxRetries: number;
}

/**
 * Query filters for retrieving entities
 */
export interface EntityQuery {
  tenantId?: string;
  practiceId?: number;
  syncStatus?: SyncStatus;
  since?: number; // timestamp
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of a storage operation
 */
export interface StorageOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    entityId: string | number;
    error: string;
  }>;
}
