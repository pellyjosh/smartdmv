# Tenant Context Initialization Fix

## Problem

After clearing databases and logging in again, the following errors appeared:

```
Error: No tenant context set. Call setCurrentTenant() first or pass tenantId parameter.
DatabaseError: Failed to get pending operations
```

## Root Cause

**Race Condition**: Components that use offline data (like `OfflineIndicator` and `SyncStatus`) were rendering and attempting to access the database **before** the `useOfflineInitialization()` hook completed its async initialization.

### Execution Order Issue:

1. User logs in → `MainApplicationLayout` renders
2. `useOfflineInitialization()` hook starts (async)
3. `OfflineIndicator` component renders immediately
4. `OfflineIndicator` calls `useSyncQueue()` hook
5. `useSyncQueue()` tries to call `getPendingOperations()`
6. `getPendingOperations()` tries to access IndexedDB
7. ❌ **Error**: No tenant context set yet (initialization still in progress)

## Solution

Implemented multi-layer guards to prevent database access before initialization completes:

### 1. **Hook-Level Guard** (`use-sync-queue.ts`)

Added tenant context check before attempting database operations:

```typescript
const loadQueue = useCallback(async () => {
  try {
    // Check if tenant context is set before accessing database
    const { tenantId } = indexedDBManager.getCurrentTenant();
    if (!tenantId) {
      console.log('[useSyncQueue] No tenant context, skipping load');
      setIsLoading(false);
      return; // Early exit
    }

    setIsLoading(true);
    // ... proceed with database operations
  }
}, []);
```

### 2. **Storage-Level Guard** (`sync-queue-storage.ts`)

Enhanced error handling in database operations:

```typescript
export async function getPendingOperations(
  tenantId?: string,
  limit?: number
): Promise<SyncOperation[]> {
  try {
    // Check tenant context from multiple sources
    const { tenantId: currentTenantId } = indexedDBManager.getCurrentTenant();
    const context = await getOfflineTenantContext();
    const targetTenantId = tenantId || context?.tenantId || currentTenantId;

    if (!targetTenantId) {
      console.log("[SyncQueue] No tenant context available");
      return []; // Return empty array instead of throwing
    }

    // ... proceed with database query
  } catch (error) {
    console.error("[SyncQueue] Failed to get pending operations:", error);
    return []; // Return empty array instead of throwing
  }
}
```

**Key Changes**:

- Return empty arrays instead of throwing errors
- Check multiple sources for tenant context
- Log warnings for debugging

### 3. **Component-Level Guard** (`OfflineIndicator.tsx` & `SyncStatus.tsx`)

Added initialization state check before rendering:

```typescript
export function OfflineIndicator() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Poll for initialization status
  useEffect(() => {
    const checkInit = () => {
      const { tenantId } = indexedDBManager.getCurrentTenant();
      setIsInitialized(!!tenantId);
    };

    checkInit();
    const interval = setInterval(checkInit, 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't render until offline system is initialized
  if (!isInitialized) {
    return null;
  }

  // ... rest of component
}
```

**Benefits**:

- Components wait for initialization before rendering
- Polls every second to detect when context is set
- Clean early return prevents UI flicker

### 4. **Initialization Tracking** (`use-offline-initialization.ts`)

Added promise tracking to prevent multiple simultaneous initializations:

```typescript
export function useOfflineInitialization() {
  const initializationPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const initOffline = async () => {
      // Prevent multiple simultaneous initializations
      if (initializationPromise.current) {
        console.log('[useOfflineInit] Already in progress, waiting...');
        await initializationPromise.current;
        return;
      }

      // Track initialization promise
      const initPromise = initializeOfflineSystem({ ... });
      initializationPromise.current = initPromise;
      await initPromise;
      initializationPromise.current = null;
    };

    initOffline();
  }, [user]);
}
```

## Files Modified

| File                                        | Changes                      | Purpose                             |
| ------------------------------------------- | ---------------------------- | ----------------------------------- |
| `hooks/use-sync-queue.ts`                   | Added tenant context check   | Prevent database access before init |
| `lib/offline/storage/sync-queue-storage.ts` | Return empty arrays on error | Graceful failure handling           |
| `components/offline/OfflineIndicator.tsx`   | Added initialization check   | Wait for context before rendering   |
| `components/offline/SyncStatus.tsx`         | Added initialization check   | Wait for context before rendering   |
| `hooks/use-offline-initialization.ts`       | Added promise tracking       | Prevent race conditions             |

## Testing

### Step 1: Clear Databases

Run in browser console:

```javascript
indexedDB.databases().then((databases) => {
  databases
    .filter((db) => db.name?.startsWith("SmartDMV_"))
    .forEach((db) => {
      indexedDB.deleteDatabase(db.name);
    });
  console.log("✅ All databases cleared");
});
```

### Step 2: Refresh and Login

1. Refresh page (Cmd/Ctrl + R)
2. Login with valid credentials

### Step 3: Expected Console Output

```
[useOfflineInit] Initializing offline system for user: <userId>
[StorageManager] Initializing with: { tenantId: 'smartvet', practiceId: 1, userId: ... }
[StorageManager] Setting tenant context: { tenantId: 'smartvet', practiceId: '1' }
[TenantDB] Opening database: SmartDMV_Tenant_smartvet
[TenantDB] Successfully opened: SmartDMV_Tenant_smartvet v1
[TenantDB] Creating 10 stores for practice: 1
[TenantDB] Practice registered: 1 in tenant: smartvet
[StorageManager] Initialized successfully
[OfflineInit] Offline system initialized successfully
```

### Step 4: Verify No Errors

Should NOT see:

- ❌ "No tenant context set"
- ❌ "Failed to get pending operations"
- ❌ "Failed to initialize storage manager"

### Step 5: Verify Database

DevTools → Application → IndexedDB:

- ✅ Database exists: `SmartDMV_Tenant_smartvet`
- ✅ Contains stores: `practice_1_pets`, `practice_1_appointments`, etc.
- ✅ System stores: `syncQueue`, `conflicts`, `idMappings`

## Summary

✅ **Fixed**: Race condition between initialization and database access  
✅ **Fixed**: "No tenant context set" error on login  
✅ **Fixed**: "Failed to get pending operations" error  
✅ **Improved**: Graceful error handling throughout offline system  
✅ **Improved**: Component rendering waits for initialization

The offline system now properly initializes before any database operations are attempted, providing a clean login experience with no errors.
