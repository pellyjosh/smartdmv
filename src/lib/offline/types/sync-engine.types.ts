/**
 * Sync Engine Types
 * 
 * Core TypeScript interfaces and types for the offline sync engine.
 * Defines conflict detection, resolution strategies, and sync results.
 */

import type { SyncOperation } from './sync.types';

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  operations: SyncOperation[];
  errors: SyncError[];
  duration: number;
  timestamp: number;
  idMappings: IdMapping[];
}

/**
 * Batch sync result with per-entity breakdown
 */
export interface BatchResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  conflicts: number;
  byEntityType: Record<string, EntitySyncResult>;
  duration: number;
}

/**
 * Sync result for a specific entity type
 */
export interface EntitySyncResult {
  entityType: string;
  synced: number;
  failed: number;
  conflicts: number;
  operations: SyncOperation[];
  errors: SyncError[];
}

/**
 * Sync error details
 */
export interface SyncError {
  operationId: number;
  entityType: string;
  entityId: string | number;
  error: string;
  timestamp: number;
  retryCount: number;
  recoverable: boolean;
  context?: Record<string, any>;
}

/**
 * Detected conflict between local and server data
 */
export interface Conflict {
  id: number;
  operation: SyncOperation;
  localData: any;
  serverData: any;
  detectedAt: number;
  conflictType: ConflictType;
  affectedFields: string[];
  severity: ConflictSeverity;
  autoResolvable: boolean;
  resolved: boolean;
  resolvedAt?: number;
  resolution?: ConflictResolution;
}

/**
 * Types of conflicts that can be detected
 */
export type ConflictType = 
  | 'version'      // Version number mismatch
  | 'timestamp'    // Timestamp indicates concurrent edit
  | 'data'         // Data hash mismatch
  | 'deletion'     // Entity deleted on server
  | 'missing';     // Entity missing from server

/**
 * Severity of conflict
 */
export type ConflictSeverity = 
  | 'low'          // Only metadata changed
  | 'medium'       // Some fields changed
  | 'high'         // Critical fields changed
  | 'critical';    // Incompatible changes

/**
 * Conflict resolution strategy
 */
export interface ConflictResolution {
  strategy: ConflictStrategy;
  mergedData?: any;
  appliedBy?: string;
  appliedAt: number;
  reason?: string;
}

/**
 * Available conflict resolution strategies
 */
export type ConflictStrategy = 
  | 'server-wins'        // Server data overwrites local
  | 'client-wins'        // Local data overwrites server
  | 'manual'             // User must resolve manually
  | 'merge'              // Attempt intelligent merge
  | 'last-write-wins';   // Most recent timestamp wins

/**
 * Temporary ID to real ID mapping
 */
export interface IdMapping {
  id?: number; // IndexedDB auto-generated ID
  tempId: string;
  realId: number;
  entityType: string;
  createdAt: number;
  syncedAt: number;
  operationId: number;
}

/**
 * Relationship between entities
 */
export interface RelationshipMap {
  // Core relationships
  petId?: number | string;
  clientId?: number | string;
  appointmentId?: number | string;
  practitionerId?: number | string;
  userId?: number | string;
  practiceId?: number | string;
  
  // Invoice/billing relationships
  invoiceId?: number | string;
  invoiceItemId?: number | string;
  paymentId?: number | string;
  
  // Medical record relationships
  medicalRecordId?: number | string;
  prescriptionId?: number | string;
  labResultId?: number | string;
  vaccinationId?: number | string;
  
  // Additional foreign keys
  [key: string]: number | string | undefined;
}

/**
 * Dependency node for building sync order graph
 */
export interface DependencyNode {
  operation: SyncOperation;
  dependencies: string[]; // IDs of operations this depends on
  dependents: string[];   // IDs of operations that depend on this
  depth: number;          // Depth in dependency tree
}

/**
 * Dependency graph for topological sorting
 */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  sortedOperations: SyncOperation[];
  cycles: string[][];  // Circular dependencies detected
}

/**
 * Referential integrity validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  value: any;
  message: string;
  suggestion?: string;
}

/**
 * Orphaned entity (missing parent reference)
 */
export interface OrphanedEntity {
  id: string | number;
  entityType: string;
  missingReference: string;
  missingId: string | number;
  data: any;
  detectedAt: number;
}

/**
 * Referential integrity report
 */
export interface IntegrityReport {
  valid: boolean;
  totalEntities: number;
  orphanedEntities: OrphanedEntity[];
  brokenReferences: BrokenReference[];
  circularReferences: CircularReference[];
}

/**
 * Broken reference (points to non-existent entity)
 */
export interface BrokenReference {
  sourceEntityType: string;
  sourceEntityId: string | number;
  field: string;
  targetEntityType: string;
  targetEntityId: string | number;
}

/**
 * Circular reference (entities reference each other)
 */
export interface CircularReference {
  entities: Array<{
    entityType: string;
    entityId: string | number;
  }>;
  path: string[];
}

/**
 * Sync progress tracking
 */
export interface SyncProgress {
  status: SyncStatus;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  conflicts: number;
  currentEntity?: string;
  currentOperation?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
  startedAt?: number;
}

/**
 * Sync status
 */
export type SyncStatus = 
  | 'idle'
  | 'preparing'
  | 'syncing'
  | 'resolving-conflicts'
  | 'success'
  | 'partial-success'
  | 'error'
  | 'cancelled';

/**
 * Sync configuration
 */
export interface SyncConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  conflictStrategy: ConflictStrategy;
  autoResolveSimple: boolean;
  syncOnReconnect: boolean;
  syncInterval?: number;
  entityTypes?: string[];
  progressCallback?: (progress: SyncProgress) => void;
  errorCallback?: (error: SyncError) => void;
  conflictCallback?: (conflict: Conflict) => void;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalOperations: number;
  totalConflicts: number;
  resolvedConflicts: number;
  averageSyncDuration: number;
  lastSyncAt?: number;
  lastSuccessfulSyncAt?: number;
  byEntityType: Record<string, {
    synced: number;
    failed: number;
    conflicts: number;
  }>;
}

/**
 * Field-level diff
 */
export interface FieldDiff {
  field: string;
  localValue: any;
  serverValue: any;
  type: DiffType;
  conflicting: boolean;
}

/**
 * Diff type
 */
export type DiffType = 
  | 'added'      // Field added locally
  | 'removed'    // Field removed locally
  | 'modified'   // Field value changed
  | 'unchanged'; // Field is the same

/**
 * Merge result
 */
export interface MergeResult {
  success: boolean;
  mergedData: any;
  conflicts: FieldDiff[];
  autoResolved: string[];
  manualRequired: string[];
}

/**
 * Server sync response
 */
export interface ServerSyncResponse {
  success: boolean;
  results: Array<{
    operationId: number;
    success: boolean;
    entityId?: number;
    error?: string;
    conflict?: ServerConflict;
  }>;
  idMappings: IdMapping[];
  timestamp: number;
}

/**
 * Server-side conflict
 */
export interface ServerConflict {
  operationId: number;
  serverData: any;
  serverVersion: number;
  lastModified: number;
}

/**
 * Download sync request
 */
export interface DownloadSyncRequest {
  lastSync?: number;
  entityTypes?: string[];
  practiceId: number;
  userId: number;
}

/**
 * Download sync response
 */
export interface DownloadSyncResponse {
  entities: Record<string, any[]>;
  deletions: DeletionRecord[];
  timestamp: number;
  hasMore: boolean;
}

/**
 * Deletion record
 */
export interface DeletionRecord {
  entityType: string;
  entityId: number;
  deletedAt: number;
  deletedBy?: number;
}

/**
 * Sync queue status
 */
export interface SyncQueueStatus {
  pending: number;
  inProgress: number;
  failed: number;
  conflicts: number;
  lastProcessedAt?: number;
  oldestPendingAt?: number;
}
