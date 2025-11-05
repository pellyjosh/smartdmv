/**
 * Validation utilities for offline storage
 */

import type { EntityMetadata, EntityType } from '../types/storage.types';
import type { SyncOperation } from '../types/sync.types';

/**
 * Validate entity structure
 */
export function validateEntity(entity: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entity) {
    errors.push('Entity is null or undefined');
    return { valid: false, errors };
  }

  if (!entity.id) {
    errors.push('Entity must have an id');
  }

  if (!entity.metadata) {
    errors.push('Entity must have metadata');
  } else {
    const metadataErrors = validateMetadata(entity.metadata);
    errors.push(...metadataErrors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate entity metadata
 */
export function validateMetadata(metadata: Partial<EntityMetadata>): string[] {
  const errors: string[] = [];

  if (!metadata.tenantId) {
    errors.push('Metadata must have tenantId');
  }

  if (!metadata.practiceId) {
    errors.push('Metadata must have practiceId');
  }

  if (!metadata.userId) {
    errors.push('Metadata must have userId');
  }

  if (!metadata.syncStatus) {
    errors.push('Metadata must have syncStatus');
  }

  if (metadata.version && metadata.version < 1) {
    errors.push('Metadata version must be >= 1');
  }

  return errors;
}

/**
 * Validate sync operation
 */
export function validateSyncOperation(operation: Partial<SyncOperation>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!operation.tenantId) {
    errors.push('Operation must have tenantId');
  }

  if (!operation.practiceId) {
    errors.push('Operation must have practiceId');
  }

  if (!operation.userId) {
    errors.push('Operation must have userId');
  }

  if (!operation.entityType) {
    errors.push('Operation must have entityType');
  }

  if (!operation.entityId) {
    errors.push('Operation must have entityId');
  }

  if (!operation.operation) {
    errors.push('Operation must have operation type');
  }

  if (!['create', 'update', 'delete'].includes(operation.operation || '')) {
    errors.push('Operation type must be create, update, or delete');
  }

  if (operation.operation !== 'delete' && !operation.data) {
    errors.push('Non-delete operations must have data');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate tenant ID format
 */
export function validateTenantId(tenantId: string): boolean {
  if (!tenantId || typeof tenantId !== 'string') {
    return false;
  }

  // Tenant ID should be alphanumeric with optional hyphens/underscores
  const tenantIdRegex = /^[a-zA-Z0-9_-]+$/;
  return tenantIdRegex.test(tenantId);
}

/**
 * Validate foreign key references
 */
export function validateRelationships(
  data: any,
  entityType: string
): { valid: boolean; missingReferences: string[] } {
  const missingReferences: string[] = [];

  // Define required relationships per entity type
  const relationshipRules: Record<string, string[]> = {
    appointment: ['petId', 'clientId'],
    soapNote: ['petId', 'appointmentId'],
    prescription: ['petId'],
    vaccination: ['petId'],
    invoice: ['clientId'],
    labResult: ['petId'],
  };

  const requiredFields = relationshipRules[entityType] || [];

  requiredFields.forEach((field) => {
    if (!data[field]) {
      missingReferences.push(field);
    }
  });

  return {
    valid: missingReferences.length === 0,
    missingReferences,
  };
}

/**
 * Sanitize data for storage
 */
export function sanitizeData<T>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Remove undefined values and functions
  const sanitized = JSON.parse(JSON.stringify(data));
  return sanitized;
}

/**
 * Validate storage quota
 */
export function validateStorageQuota(usage: number, quota: number, newDataSize: number): {
  allowed: boolean;
  percentUsed: number;
  wouldExceed: boolean;
} {
  const percentUsed = (usage / quota) * 100;
  const wouldExceed = (usage + newDataSize) > quota;

  return {
    allowed: !wouldExceed,
    percentUsed,
    wouldExceed,
  };
}

/**
 * Estimate object size in bytes
 */
export function estimateSize(obj: any): number {
  try {
    const json = JSON.stringify(obj);
    // Rough estimate: 2 bytes per character for UTF-16
    return json.length * 2;
  } catch (error) {
    console.error('[Validation] Failed to estimate size:', error);
    return 0;
  }
}

/**
 * Validate timestamp
 */
export function validateTimestamp(timestamp: number): boolean {
  if (!timestamp || typeof timestamp !== 'number') {
    return false;
  }

  // Check if timestamp is reasonable (after year 2000 and before year 2100)
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2100-01-01').getTime();

  return timestamp >= minTimestamp && timestamp <= maxTimestamp;
}

/**
 * Validate entity type
 */
export function isValidEntityType(entityType: string): boolean {
  const validTypes = [
    'pets',
    'appointments',
    'clients',
    'soapNotes',
    'invoices',
    'inventory',
    'prescriptions',
    'labResults',
    'medicalRecords',
    'vaccinations',
    'practitioners',
  ];

  return validTypes.includes(entityType);
}
