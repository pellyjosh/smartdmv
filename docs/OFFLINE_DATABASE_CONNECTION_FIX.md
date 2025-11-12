# Offline Database Connection Race Condition Fix

## Problem Summary

The offline storage system was experiencing intermittent "One of the specified object stores was not found" errors due to database connection caching race conditions in `entity-storage.ts`.

### Root Cause

Functions were following this flawed pattern:

1. Register practice → creates stores if needed, triggers DB upgrade
2. Initialize connection → gets fresh database connection (DB v3 with new stores)
3. Verify store exists → ✅ passes using fresh connection
4. Call `indexedDBManager.put()` → internally calls `getDatabase()`
5. `getDatabase()` returns cached connection → ❌ might be stale (DB v2 without stores)
6. Transaction fails → "object store not found" error

### Why This Happened

The `TenantDatabaseManager` caches database connections per tenant. When `registerPractice()` triggered a database upgrade:

- It would get a new upgraded connection (version 3)
- But the cache might still contain the old connection (version 2)
- Subsequent calls to `getDatabase()` could return either connection unpredictably
- If the stale connection was returned, it wouldn't have the newly created stores

## Solution

Changed all CRUD and utility functions to use the **verified connection pattern**:

```typescript
// 1. Register practice (creates stores if needed, upgrades DB)
await indexedDBManager.registerPractice(practiceId, tenantId);

// 2. Get fresh connection (guaranteed to be latest version)
const db = await indexedDBManager.initialize(tenantId);

// 3. Verify store exists in this exact connection
if (!Array.from(db.objectStoreNames).includes(storeName)) {
  return null; // or throw error
}

// 4. Use the same verified db object for ALL operations
const tx = db.transaction(storeName, "readwrite");
const store = tx.objectStore(storeName);
const request = store.put(data);
// ... handle request
```

**Key principle:** Once you verify a store exists in a database object, use that exact object for all subsequent operations. Never call back into `indexedDBManager` methods that might return a different connection.

## Files Modified

### `/src/lib/offline/storage/entity-storage.ts`

**Functions Updated with Verified Connection Pattern:**

1. **saveEntity()** - Save new entities
   - Before: Called `indexedDBManager.put()`
   - After: Direct `db.transaction()` using verified connection
2. **getAllEntities()** - Retrieve all entities
   - Before: Called `indexedDBManager.getAll()`
   - After: Direct `db.transaction()` using verified connection
3. **getEntity()** - Get single entity by ID

   - Before: Called `indexedDBManager.get()`
   - After: Direct `db.transaction()` using verified connection

4. **updateEntity()** - Update existing entity

   - Before: Called `indexedDBManager.get()` then `put()`
   - After: Direct transactions using verified connection

5. **deleteEntity()** - Soft delete (tombstone)

   - Before: Called `indexedDBManager.get()` then `put()`
   - After: Direct transactions using verified connection

6. **hardDeleteEntity()** - Permanently remove entity

   - Before: Called `indexedDBManager.delete()`
   - After: Direct `db.transaction()` using verified connection

7. **getEntitiesByStatus()** - Query by sync status index

   - Before: Called `indexedDBManager.queryByIndex()`
   - After: Direct index query using verified connection

8. **clearEntityType()** - Clear all entities of a type

   - Before: Called `indexedDBManager.clear()`
   - After: Direct `db.transaction()` using verified connection

9. **getEntityMetadata()** - Get entity metadata

   - Before: Called `indexedDBManager.get()`
   - After: Direct transaction using verified connection

10. **updateEntitySyncStatus()** - Update sync status
    - Before: Called `indexedDBManager.get()` then `put()`
    - After: Direct transactions using verified connection

**Additional Improvements:**

- Added comprehensive error logging with original error messages
- Enhanced store verification with graceful degradation (return empty arrays instead of throwing)
- Consistent error handling across all functions
- Detailed console logs for debugging at each step

## Testing Recommendations

After this fix, verify:

1. **Offline Appointment Creation**: Create appointments while offline, ensure they save successfully
2. **Pet Data Loading**: Verify pets load without "Failed to get all pet" errors
3. **Entity Updates**: Update entities offline and verify changes persist
4. **Entity Deletion**: Delete entities offline and verify tombstone marking works
5. **Sync Status Queries**: Query entities by sync status and verify filtering works
6. **Store Clearing**: Clear entity types and verify complete removal
7. **Practice Switching**: Switch between practices and verify store isolation

## Related Files

- `/src/lib/offline/managers/storage-manager.ts` - Fixed `ensureInitialized()` to recover tenant context
- `/src/hooks/offline/use-offline-storage.ts` - Changed to throw errors instead of returning null
- `/src/hooks/offline/appointments/use-offline-appointments.ts` - Updated schema to match PostgreSQL

## Prevention

To prevent similar issues in the future:

1. **Never call `indexedDBManager` methods after verifying a store exists** - use the verified db object directly
2. **Always use `registerPractice()` + `initialize()` pattern** at the start of entity storage functions
3. **Verify store existence** before any transaction operations
4. **Use the same db object** for all operations within a function
5. **Add comprehensive logging** to track connection versions and store availability

## Performance Impact

Minimal - each function now:

- Makes 1 additional call to `registerPractice()` (which checks if already registered)
- Gets a fresh connection once per operation (was doing this anyway via indexedDBManager methods)
- Eliminates retry logic and error recovery overhead from stale connections

The fix actually improves performance by preventing failed transactions and subsequent retries.
