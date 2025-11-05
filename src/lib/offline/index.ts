/**
 * Offline functionality exports
 * Central export point for all offline-related utilities
 */

// Core
export { indexedDBManager } from './db/manager';
export { STORES, DB_NAME_PREFIX, DB_VERSION, getTenantDatabaseName, getPracticeStoreName } from './db/schema';
export * from './core/tenant-context';

// Storage
export * from './storage/auth-storage';
export * from './storage/permission-storage';
export * from './storage/sync-queue-storage';
export * from './storage/tenant-storage';
export * from './storage/practice-storage';

// Managers
export * from './managers/permission-manager';
export * from './managers/practice-context-manager';
export * from './managers/practice-scoped-storage';
export { storageManager } from './managers/storage-manager';

// Types
export * from './types/auth.types';
export * from './types/permission.types';
export * from './types/sync.types';

// Utils
export * from './utils/offline-init';
export * from './utils/database-cleanup';
