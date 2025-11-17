/**
 * IndexedDB Schema Definition
 * Defines database structure, stores, and indexes
 * 
 * TENANT ISOLATION: Each tenant gets a separate IndexedDB database
 * Database naming: SmartDMV_Tenant_{tenantId}
 * Practice isolation is handled within each tenant database via store prefixes
 */

export const DB_NAME_PREFIX = 'SmartDMV_Tenant';
export const DB_VERSION = 8; // Increment for adding tenant-isolated kennel/boarding stores

export function getTenantDatabaseName(tenantId: string): string {
  if (!tenantId) {
    throw new Error('tenantId is required for database operations');
  }
  return `${DB_NAME_PREFIX}_${tenantId}`;
}

/**
 * Extract tenant ID from database name
 */
export function extractTenantFromDatabaseName(dbName: string): string | null {
  const match = dbName.match(/^SmartDMV_Tenant_(.+)$/);
  return match ? match[1] : null;
}

/**
 * Store names
 */
export const STORES = {
  PETS: 'pets',
  APPOINTMENTS: 'appointments',
  CLIENTS: 'clients',
  SOAP_NOTES: 'soapNotes',
  PRESCRIPTIONS: 'prescriptions',
  LAB_RESULTS: 'labResults',
  MEDICAL_RECORDS: 'medicalRecords',
  VACCINATIONS: 'vaccinations',
  VACCINE_TYPES: 'vaccine_types',
  PRACTITIONERS: 'practitioners',
  ROOMS: 'rooms',
  ADMISSIONS: 'admissions',
  KENNELS: 'kennels',
  BOARDING_STAYS: 'boarding_stays',
  
  // System stores (global, not tenant-prefixed)
  AUTH_TOKENS: 'authTokens',
  SESSIONS: 'sessions',
  PERMISSIONS: 'permissions',
  ROLE_ASSIGNMENTS: 'roleAssignments',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata',
  ATTACHMENTS: 'attachments',
  ID_MAPPINGS: 'idMappings',
  CONFLICTS: 'conflicts',
  USER_PREFERENCES: 'userPreferences',
  PRACTICES: 'practices',
  CURRENT_PRACTICE: 'current_practice',
  CACHE: 'cache',
} as const;

/**
 * Entity stores that need tenant isolation
 */
export const TENANT_ISOLATED_STORES = [
  STORES.PETS,
  STORES.APPOINTMENTS,
  STORES.CLIENTS,
  STORES.SOAP_NOTES,
  STORES.PRESCRIPTIONS,
  STORES.LAB_RESULTS,
  STORES.MEDICAL_RECORDS,
  STORES.VACCINATIONS,
  STORES.VACCINE_TYPES,
  STORES.PRACTITIONERS,
  STORES.ROOMS,
  STORES.ADMISSIONS,
  STORES.KENNELS,
  STORES.BOARDING_STAYS,
  STORES.CONFLICTS, // Practice-scoped conflict storage
] as const;

/**
 * System stores (shared across tenants)
 */
export const SYSTEM_STORES = [
  STORES.AUTH_TOKENS,
  STORES.SESSIONS,
  STORES.PERMISSIONS,
  STORES.ROLE_ASSIGNMENTS,
  STORES.SYNC_QUEUE,
  STORES.METADATA,
  STORES.ATTACHMENTS,
  STORES.ID_MAPPINGS,
  STORES.USER_PREFERENCES,
  STORES.PRACTICES,
  STORES.CURRENT_PRACTICE,
  STORES.CACHE,
] as const;

/**
 * Index definitions for each store
 */
export const STORE_INDEXES = {
  [STORES.SYNC_QUEUE]: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'tenantId', keyPath: 'tenantId', unique: false },
    { name: 'entityType', keyPath: 'entityType', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'priority', keyPath: 'priority', unique: false },
    { name: 'userId', keyPath: 'userId', unique: false },
  ],
  [STORES.METADATA]: [
    { name: 'tenantId', keyPath: 'tenantId', unique: false },
    { name: 'key', keyPath: 'key', unique: false },
  ],
  [STORES.AUTH_TOKENS]: [
    { name: 'userId', keyPath: 'userId', unique: false },
    { name: 'tenantId', keyPath: 'tenantId', unique: false },
    { name: 'expiresAt', keyPath: 'expiresAt', unique: false },
  ],
  [STORES.SESSIONS]: [
    { name: 'userId', keyPath: 'userId', unique: false },
    { name: 'tenantId', keyPath: 'tenantId', unique: false },
  ],
  [STORES.PERMISSIONS]: [
    { name: 'userId', keyPath: 'userId', unique: false },
    { name: 'tenantId', keyPath: 'tenantId', unique: false },
    { name: 'cachedAt', keyPath: 'cachedAt', unique: false },
  ],
  [STORES.ATTACHMENTS]: [
    { name: 'tenantId', keyPath: 'tenantId', unique: false },
    { name: 'entityType', keyPath: 'entityType', unique: false },
    { name: 'entityId', keyPath: 'entityId', unique: false },
  ],
  [STORES.ID_MAPPINGS]: [
    { name: 'tempId', keyPath: 'tempId', unique: true },
    { name: 'entityType', keyPath: 'entityType', unique: false },
    { name: 'syncedAt', keyPath: 'syncedAt', unique: false },
  ],
  [STORES.CONFLICTS]: [
    { name: 'detectedAt', keyPath: 'detectedAt', unique: false },
    { name: 'conflictType', keyPath: 'conflictType', unique: false },
    { name: 'resolved', keyPath: 'resolved', unique: false },
    { name: 'entityType', keyPath: 'operation.entityType', unique: false },
    { name: 'severity', keyPath: 'severity', unique: false },
  ],
  [STORES.PRACTICES]: [
    { name: 'userId', keyPath: 'userId', unique: true },
  ],
  [STORES.CURRENT_PRACTICE]: [
    { name: 'userId', keyPath: 'userId', unique: true },
  ],
};

/**
 * Indexes for tenant-isolated entity stores
 */
export const ENTITY_STORE_INDEXES = [
  { name: 'lastModified', keyPath: 'metadata.lastModified', unique: false },
  { name: 'syncStatus', keyPath: 'metadata.syncStatus', unique: false },
  { name: 'tenantId', keyPath: 'metadata.tenantId', unique: false },
  { name: 'practiceId', keyPath: 'metadata.practiceId', unique: false },
  { name: 'userId', keyPath: 'metadata.userId', unique: false },
];

/**
 * Get practice-specific store name (within tenant database)
 * Since each tenant has separate DB, we only need practice prefix
 */
export function getPracticeStoreName(practiceId: string, baseStoreName: string): string {
  return `practice_${practiceId}_${baseStoreName}`;
}

/**
 * DEPRECATED: Use getTenantDatabaseName() instead
 * Legacy function for backward compatibility
 */
export function getTenantStoreName(tenantId: string, baseStoreName: string): string {
  console.warn('getTenantStoreName is deprecated. Each tenant now has a separate database.');
  return baseStoreName; // Within tenant DB, no tenant prefix needed
}

/**
 * Check if store requires tenant isolation
 */
export function isTenantIsolatedStore(storeName: string): boolean {
  return TENANT_ISOLATED_STORES.includes(storeName as any);
}

/**
 * Get all store names for a practice (within tenant database)
 */
export function getPracticeStoreNames(practiceId: string): string[] {
  return TENANT_ISOLATED_STORES.map(store => getPracticeStoreName(practiceId, store));
}

/**
 * Extract practice ID from store name
 */
export function extractPracticeFromStoreName(storeName: string): string | null {
  const match = storeName.match(/^practice_([^_]+)_/);
  return match ? match[1] : null;
}

/**
 * Get base store name (remove practice prefix if exists)
 */
export function getBaseStoreName(storeName: string): string {
  const match = storeName.match(/^practice_[^_]+_(.+)$/);
  return match ? match[1] : storeName;
}

/**
 * Default configuration
 */
export const DEFAULT_STORAGE_CONFIG = {
  maxStorageSize: 500 * 1024 * 1024, // 500MB
  retentionDays: 90,
  autoCleanup: true,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
};
