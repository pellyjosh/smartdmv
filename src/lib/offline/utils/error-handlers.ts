/**
 * Custom error classes for offline functionality
 */

/**
 * Base offline error
 */
export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
    Object.setPrototypeOf(this, OfflineError.prototype);
  }
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends OfflineError {
  public resource: string;
  public action: string;

  constructor(resource: string, action: string, message?: string) {
    super(message || `Permission denied: Cannot ${action} ${resource}`);
    this.name = 'PermissionDeniedError';
    this.resource = resource;
    this.action = action;
    Object.setPrototypeOf(this, PermissionDeniedError.prototype);
  }
}

/**
 * Storage quota exceeded error
 */
export class StorageQuotaExceededError extends OfflineError {
  public usage: number;
  public quota: number;
  public required: number;

  constructor(usage: number, quota: number, required: number) {
    super(
      `Storage quota exceeded: Using ${usage} of ${quota} bytes, need ${required} more bytes`
    );
    this.name = 'StorageQuotaExceededError';
    this.usage = usage;
    this.quota = quota;
    this.required = required;
    Object.setPrototypeOf(this, StorageQuotaExceededError.prototype);
  }
}

/**
 * Tenant mismatch error
 */
export class TenantMismatchError extends OfflineError {
  public expectedTenantId: string;
  public actualTenantId: string;

  constructor(expectedTenantId: string, actualTenantId: string) {
    super(
      `Tenant mismatch: Expected ${expectedTenantId}, got ${actualTenantId}`
    );
    this.name = 'TenantMismatchError';
    this.expectedTenantId = expectedTenantId;
    this.actualTenantId = actualTenantId;
    Object.setPrototypeOf(this, TenantMismatchError.prototype);
  }
}

/**
 * Invalid token error
 */
export class InvalidTokenError extends OfflineError {
  public reason: string;

  constructor(reason: string) {
    super(`Invalid authentication token: ${reason}`);
    this.name = 'InvalidTokenError';
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

/**
 * Sync conflict error
 */
export class SyncConflictError extends OfflineError {
  public entityType: string;
  public entityId: string | number;
  public conflictFields: string[];

  constructor(
    entityType: string,
    entityId: string | number,
    conflictFields: string[]
  ) {
    super(
      `Sync conflict for ${entityType} ${entityId}: ${conflictFields.join(', ')}`
    );
    this.name = 'SyncConflictError';
    this.entityType = entityType;
    this.entityId = entityId;
    this.conflictFields = conflictFields;
    Object.setPrototypeOf(this, SyncConflictError.prototype);
  }
}

/**
 * Entity not found error
 */
export class EntityNotFoundError extends OfflineError {
  public entityType: string;
  public entityId: string | number;

  constructor(entityType: string, entityId: string | number) {
    super(`Entity not found: ${entityType} with id ${entityId}`);
    this.name = 'EntityNotFoundError';
    this.entityType = entityType;
    this.entityId = entityId;
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

/**
 * Validation error
 */
export class ValidationError extends OfflineError {
  public errors: string[];

  constructor(errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Sync failed error
 */
export class SyncFailedError extends OfflineError {
  public failedOperations: number;
  public totalOperations: number;

  constructor(failedOperations: number, totalOperations: number, message?: string) {
    super(
      message ||
        `Sync failed: ${failedOperations} of ${totalOperations} operations failed`
    );
    this.name = 'SyncFailedError';
    this.failedOperations = failedOperations;
    this.totalOperations = totalOperations;
    Object.setPrototypeOf(this, SyncFailedError.prototype);
  }
}

/**
 * Database error
 */
export class DatabaseError extends OfflineError {
  public originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Network error
 */
export class NetworkError extends OfflineError {
  public statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Error handler utility
 */
export function handleOfflineError(error: unknown): {
  message: string;
  type: string;
  recoverable: boolean;
} {
  if (error instanceof PermissionDeniedError) {
    return {
      message: error.message,
      type: 'permission',
      recoverable: false,
    };
  }

  if (error instanceof StorageQuotaExceededError) {
    return {
      message: 'Storage space is full. Please free up space or sync your data.',
      type: 'quota',
      recoverable: true,
    };
  }

  if (error instanceof TenantMismatchError) {
    return {
      message: 'Data access error. Please log in again.',
      type: 'tenant',
      recoverable: false,
    };
  }

  if (error instanceof InvalidTokenError) {
    return {
      message: 'Session expired. Please log in again.',
      type: 'auth',
      recoverable: false,
    };
  }

  if (error instanceof SyncConflictError) {
    return {
      message: 'Data conflict detected. Please review and resolve.',
      type: 'conflict',
      recoverable: true,
    };
  }

  if (error instanceof NetworkError) {
    return {
      message: 'Network error. Your changes are saved offline.',
      type: 'network',
      recoverable: true,
    };
  }

  if (error instanceof ValidationError) {
    return {
      message: error.message,
      type: 'validation',
      recoverable: true,
    };
  }

  // Unknown error
  return {
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    type: 'unknown',
    recoverable: false,
  };
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const handled = handleOfflineError(error);
  return handled.recoverable;
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const handled = handleOfflineError(error);
  
  console.error('[OfflineError]', {
    type: handled.type,
    message: handled.message,
    recoverable: handled.recoverable,
    context,
    error,
  });
}
