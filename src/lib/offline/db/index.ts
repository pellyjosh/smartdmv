/**
 * Tenant-Aware Database Module
 * 
 * This module provides tenant and practice isolated database access.
 * Each tenant gets a separate IndexedDB database: SmartDMV_Tenant_{tenantId}
 * Practice isolation is handled via store prefixes: practice_{practiceId}_{storeName}
 */

export * from './schema';
export * from './manager';
export * from './tenant-manager';
export { indexedDBManager } from './manager';
export { tenantDatabaseManager } from './tenant-manager';
