# Offline Initialization Race Condition Fix

**Date**: November 3, 2025  
**Issue**: "No tenant context set" and "Failed to get all pet" errors when loading offline

## Problem Analysis

### Root Cause

The offline system had a **race condition** where components tried to load data before initialization completed:

1. **Initialization Hook** (`useOfflineInitialization`):

   - When offline, used cached session data ✅
   - But returned `initialized: false` when `user` was null ❌
   - When offline, `useUser()` returns null (no API access)

2. **Storage Hook** (`useOfflineStorage`):

   - Had `autoLoad: true` option
   - Immediately tried to load data on mount
   - Didn't wait for initialization ❌

3. **Result**:
   ```
   [Component Mount] → useOfflineStorage tries to load pets
   [Storage Manager] → getOfflineTenantContext() called
   [Tenant Context] → Checks localStorage for 'offline_session'
   [Error] → "No tenant context set" (initialization not complete)
   [Error] → "Failed to get all pet" (no database context)
   ```

## Solution

### 1. Fixed Initialization Status Check

**File**: `/src/hooks/use-offline-initialization.ts`

**Before**:

```typescript
const isInitialized = !!user && !!previousPracticeId.current;
// ❌ When offline, user is null, so always returns false
```

**After**:

```typescript
const isInitialized = !isOnline
  ? isAuthenticated && !!previousPracticeId.current // ✅ Offline: check session
  : !!user && !!previousPracticeId.current; // ✅ Online: check user
```

**Why it works**:

- **Offline mode**: Checks if we have an authenticated session and have set a practice
- **Online mode**: Checks if we have user data from API and have set a practice
- Returns correct status for both modes

### 2. Made Storage Wait for Initialization

**File**: `/src/hooks/use-offline-storage.ts`

**Changes**:

```typescript
// Added import
import { useOfflineInitialization } from './use-offline-initialization';

export function useOfflineStorage<T>(...) {
  // ✅ NEW: Get initialization status
  const { initialized } = useOfflineInitialization();

  const loadData = useCallback(async () => {
    // ✅ NEW: Don't load if not initialized
    if (!initialized) {
      console.log('[useOfflineStorage] ⏳ Waiting for initialization');
      return;
    }

    // ... rest of load logic
  }, [entityType, initialized]); // Added initialized to deps

  useEffect(() => {
    // ✅ NEW: Only auto-load when initialized
    if (autoLoad && initialized) {
      loadData();
    }
  }, [autoLoad, initialized, loadData]); // Added initialized to deps
}
```

**Why it works**:

- Storage operations now wait for initialization to complete
- No more race condition between initialization and data loading
- Clear console logs show the waiting/loading progression

## Initialization Flow (Fixed)

### Offline Mode

```
1. Page loads → useOfflineInitialization() runs
   ├─ Detects !isOnline && isAuthenticated && session
   ├─ Extracts: tenantId, practiceId from cached session
   └─ Calls initializeOfflineSystem()
       ├─ storageManager.initialize(tenantId, practiceId, userId)
       │   ├─ indexedDBManager.setCurrentTenant(tenantId, practiceId)
       │   ├─ indexedDBManager.registerPractice(practiceId, tenantId)
       │   └─ setOfflineTenantContext({ tenantId, practiceId, userId })
       │       └─ localStorage.setItem('offline_session', ...)
       └─ previousPracticeId.current = practiceId

2. useOfflineInitialization returns:
   └─ initialized: true (isAuthenticated && !!previousPracticeId.current)

3. useOfflineStorage receives initialized: true
   └─ Triggers loadData()
       └─ storageManager.getAllEntities('pet')
           └─ getOfflineTenantContext() ✅ Finds session in localStorage
               └─ Returns pets from IndexedDB

✅ SUCCESS: No errors, pets load correctly
```

### Online Mode

```
1. Page loads → useOfflineInitialization() runs
   ├─ Detects isOnline
   ├─ Waits for user from useUser() API call
   ├─ Waits for tenant from useTenant() API call
   └─ Calls initializeOfflineSystem() with API data
       └─ (same initialization as offline)

2. useOfflineInitialization returns:
   └─ initialized: true (!!user && !!previousPracticeId.current)

3. useOfflineStorage loads normally

✅ SUCCESS: Works as before
```

## Testing Checklist

- [x] Refresh page while offline → No "No tenant context" errors
- [x] Refresh page while offline → No "Failed to get all pet" errors
- [x] Check console logs show proper initialization flow
- [x] Verify pets load after initialization completes
- [x] Verify online mode still works
- [x] TypeScript compilation passes

## Console Logs (Expected)

**Offline Mode - Success**:

```
[useOfflineInit] Effect triggered { hasUser: false, hasTenant: false, isOnline: false, hasOfflineSession: true }
[useOfflineInit] 🔌 OFFLINE MODE - Using cached session data
[useOfflineInit] 🔌 OFFLINE - Initializing with: { tenantId: "innova", practiceId: 1 }
[OfflineInit] 🔧 Starting initialization with: { tenantId: "innova", practiceId: 1, userId: 123 }
[StorageManager] 📝 Setting offline tenant context
[StorageManager] ✅ Offline tenant context set
[useOfflineInit] ✅ OFFLINE initialization complete
[useOfflineInit] Render - initialized: true
[useOfflineStorage] 🚀 Auto-loading pet (initialized)
[useOfflineStorage] 📂 Loading pet
[TenantContext] 🔍 Checking offline_session: Found
[TenantContext] ✅ Retrieved context: { tenantId: "innova", practiceId: 1 }
[useOfflineStorage] ✅ Loaded 5 pet
```

## Files Changed

1. `/src/hooks/use-offline-initialization.ts`

   - Fixed `isInitialized` to check session when offline
   - Enhanced logging with detailed status object

2. `/src/hooks/use-offline-storage.ts`
   - Added `useOfflineInitialization` dependency
   - Made `loadData()` check `initialized` before loading
   - Made `useEffect` wait for `initialized` before auto-load
   - Added detailed console logs for debugging

## Related Issues Fixed

- ✅ "Error: No tenant context set. Call setCurrentTenant() first"
- ✅ "DatabaseError: Failed to get all pet"
- ✅ Race condition between initialization and data loading
- ✅ Offline mode now works immediately on page load
- ✅ Storage operations properly wait for initialization

## Future Improvements

1. **Loading State**: Add a global "initializing" indicator in UI
2. **Error Recovery**: Add retry logic if initialization fails
3. **Performance**: Cache initialization result to avoid re-running
4. **Testing**: Add unit tests for race condition scenarios
