/**
 * Database Cleanup Utilities
 * Helpers for clearing and resetting IndexedDB databases
 */

import { getTenantDatabaseName, DB_NAME_PREFIX } from '../db/schema';

/**
 * Delete all SmartDMV databases
 * Use this to clear version conflicts or reset the system
 */
export async function deleteAllDatabases(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    console.warn('[DB Cleanup] IndexedDB not available');
    return;
  }

  try {
    const databases = await indexedDB.databases();
    const smartDMVDatabases = databases.filter(
      (db) => db.name && db.name.startsWith(DB_NAME_PREFIX)
    );

    console.log(`[DB Cleanup] Found ${smartDMVDatabases.length} SmartDMV databases`);

    const deletePromises = smartDMVDatabases.map((db) => {
      return new Promise<void>((resolve, reject) => {
        if (!db.name) {
          resolve();
          return;
        }

        console.log(`[DB Cleanup] Deleting: ${db.name} (v${db.version})`);
        const request = indexedDB.deleteDatabase(db.name);

        request.onsuccess = () => {
          console.log(`[DB Cleanup] Deleted: ${db.name}`);
          resolve();
        };

        request.onerror = () => {
          console.error(`[DB Cleanup] Failed to delete ${db.name}:`, request.error);
          reject(request.error);
        };

        request.onblocked = () => {
          console.warn(`[DB Cleanup] Deletion blocked for ${db.name}. Close all connections.`);
        };
      });
    });

    await Promise.all(deletePromises);
    console.log('[DB Cleanup] All databases cleared successfully');
  } catch (error) {
    console.error('[DB Cleanup] Failed to clear databases:', error);
    throw error;
  }
}

/**
 * Delete specific tenant database
 */
export async function deleteTenantDatabase(tenantId: string): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    console.warn('[DB Cleanup] IndexedDB not available');
    return;
  }

  const dbName = getTenantDatabaseName(tenantId);

  return new Promise((resolve, reject) => {
    console.log(`[DB Cleanup] Deleting tenant database: ${dbName}`);
    const request = indexedDB.deleteDatabase(dbName);

    request.onsuccess = () => {
      console.log(`[DB Cleanup] Successfully deleted: ${dbName}`);
      resolve();
    };

    request.onerror = () => {
      console.error(`[DB Cleanup] Failed to delete ${dbName}:`, request.error);
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn(`[DB Cleanup] Deletion blocked for ${dbName}. Close all connections first.`);
    };
  });
}

/**
 * List all SmartDMV databases with their versions
 */
export async function listAllDatabases(): Promise<
  Array<{ name: string; version: number | undefined }>
> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    console.warn('[DB Cleanup] IndexedDB not available');
    return [];
  }

  try {
    const databases = await indexedDB.databases();
    const smartDMVDatabases = databases
      .filter((db) => db.name && db.name.startsWith(DB_NAME_PREFIX))
      .map((db) => ({
        name: db.name || '',
        version: db.version,
      }));

    console.log('[DB Cleanup] SmartDMV Databases:', smartDMVDatabases);
    return smartDMVDatabases;
  } catch (error) {
    console.error('[DB Cleanup] Failed to list databases:', error);
    return [];
  }
}

/**
 * Check if a tenant database exists
 */
export async function tenantDatabaseExists(tenantId: string): Promise<boolean> {
  const databases = await listAllDatabases();
  const dbName = getTenantDatabaseName(tenantId);
  return databases.some((db) => db.name === dbName);
}

/**
 * Clear all databases and reload page
 * Use this as a "reset" button in development
 */
export async function resetAndReload(): Promise<void> {
  console.log('[DB Cleanup] Resetting all databases...');
  await deleteAllDatabases();
  console.log('[DB Cleanup] Reloading page...');
  window.location.reload();
}

/**
 * Export cleanup script for browser console
 */
export function getCleanupScript(): string {
  return `
// Clear all SmartDMV IndexedDB databases
indexedDB.databases().then(databases => {
  const smartDMVDbs = databases.filter(db => db.name && db.name.startsWith('${DB_NAME_PREFIX}'));
  console.log('Found ' + smartDMVDbs.length + ' SmartDMV databases');
  smartDMVDbs.forEach(db => {
    console.log('Deleting: ' + db.name + ' (v' + db.version + ')');
    indexedDB.deleteDatabase(db.name);
  });
  console.log('✅ All SmartDMV databases cleared. Refresh the page.');
});
`.trim();
}
