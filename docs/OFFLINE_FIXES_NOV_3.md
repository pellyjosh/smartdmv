# Offline Database Fixes - November 3, 2025

## Issues Fixed

### 1. **'cache' is not a known object store name**

**Problem**: The 'cache' store was added to SYSTEM_STORES but wasn't being created in existing databases.

**Solution**: Modified `registerPractice()` in tenant-manager.ts to:

- Check for missing system stores (including 'cache')
- Upgrade database if any system stores are missing
- Create missing system stores with proper indexes during upgrade

**Files Modified**:

- `src/lib/offline/db/tenant-manager.ts`

### 2. **"practice_NaN_pets" stores being created**

**Problem**: practiceId was `undefined` or `NaN` when passed to `registerPractice()`, resulting in invalid store names like `practice_NaN_pets`.

**Root Cause**:

- practiceId validation was insufficient
- Type conversions weren't handling edge cases
- No validation before calling `getPracticeStoreName()`

**Solution**: Added comprehensive validation at multiple levels:

#### A. Tenant Manager (`tenant-manager.ts`)

```typescript
async registerPractice(practiceId: string, tenantId?: string): Promise<void> {
  // Validate practiceId
  if (!practiceId || practiceId === 'undefined' || practiceId === 'NaN') {
    console.error('[TenantDB] ❌ Invalid practiceId:', practiceId);
    throw new Error(`Invalid practiceId: ${practiceId}`);
  }
  // ... rest of method
}
```

#### B. Storage Manager (`storage-manager.ts`)

```typescript
async initialize(tenantId?: string, practiceId?: number, userId?: number): Promise<void> {
  // Validate and convert practiceId
  const practiceIdString = practiceId !== undefined && practiceId !== null && !isNaN(practiceId)
    ? practiceId.toString()
    : undefined;

  if (practiceIdString) {
    // Only register if valid
    await indexedDBManager.registerPractice(practiceIdString, tenantId);
  } else {
    console.warn('[StorageManager] ⚠️ No valid practice ID provided, skipping practice registration');
  }
}
```

#### C. Offline Initialization Hook (`use-offline-initialization.ts`)

```typescript
// Get practice ID with validation
let practiceId: string | number | undefined;
// ... get practiceId from user ...

// Validate practiceId
if (
  !practiceId ||
  practiceId === "undefined" ||
  (typeof practiceId === "number" && isNaN(practiceId))
) {
  console.error("[useOfflineInit] ❌ Invalid practice ID");
  return;
}

// Convert to number
const practiceIdNum =
  typeof practiceId === "string" ? parseInt(practiceId, 10) : practiceId;

if (isNaN(practiceIdNum)) {
  console.error("[useOfflineInit] ❌ Practice ID is NaN after conversion");
  return;
}

console.log("[useOfflineInit] ✅ Valid practice ID:", practiceIdNum);
```

**Files Modified**:

- `src/lib/offline/db/tenant-manager.ts`
- `src/lib/offline/managers/storage-manager.ts`
- `src/hooks/use-offline-initialization.ts`

### 3. **Database Upgrade Process Enhanced**

**Improvement**: The `upgradeDatabaseForPractice()` method now:

- Accepts both practice stores and system stores to create
- Creates system stores with proper autoIncrement settings
- Creates practice stores with standard metadata indexes
- Logs detailed information during upgrade

**Files Modified**:

- `src/lib/offline/db/tenant-manager.ts`

## Technical Details

### Store Name Format

**System Stores** (no prefix):

- `auth`, `sessions`, `permissions`, `cache`, etc.
- Shared across all practices in the tenant

**Practice Stores** (with prefix):

- `practice_{practiceId}_{storeName}`
- Example: `practice_1_pets`, `practice_1_appointments`
- Isolated per practice within the tenant database

### Database Upgrade Flow

1. **Check for missing stores**:

   ```typescript
   const missingSystemStores = SYSTEM_STORES.filter(
     (store) => !db.objectStoreNames.contains(store)
   );

   const missingPracticeStores = TENANT_ISOLATED_STORES.map((store) =>
     getPracticeStoreName(practiceId, store)
   ).filter((store) => !existingStores.includes(store));
   ```

2. **If any stores missing**:

   - Close current database connection
   - Increment version number
   - Open database with new version
   - Create missing stores in `onupgradeneeded` event

3. **Create stores with proper configuration**:
   - System stores: `{ keyPath: 'id', autoIncrement: true }`
   - Practice stores: `{ keyPath: 'id' }` + standard indexes

### Validation Chain

```
User Login
  ↓
use-offline-initialization.ts
  ↓ Validates practiceId (string/number/undefined/NaN)
  ↓ Converts to number and validates again
  ↓
offline-init.ts (initializeOfflineSystem)
  ↓ Converts to number if string
  ↓
storage-manager.ts
  ↓ Validates practiceId !== undefined && !isNaN()
  ↓ Converts to string for registration
  ↓
tenant-manager.ts (registerPractice)
  ↓ Validates practiceId !== 'undefined' && !== 'NaN'
  ↓ Creates stores: practice_{practiceId}_{storeName}
  ↓
✅ Valid practice stores created
```

## Testing Steps

1. **Clear existing databases**:

   ```javascript
   // In browser console
   indexedDB.databases().then((dbs) => {
     dbs.forEach((db) => {
       if (db.name.startsWith("SmartDMV_Tenant_")) {
         indexedDB.deleteDatabase(db.name);
       }
     });
   });
   ```

2. **Login to application**:

   - Watch console for validation logs
   - Check for `✅ Valid practice ID: X` message
   - Verify no NaN errors

3. **Check IndexedDB in DevTools**:

   - Application → IndexedDB
   - Find `SmartDMV_Tenant_{subdomain}`
   - Verify stores exist:
     - System stores: `cache`, `auth`, `sessions`, etc.
     - Practice stores: `practice_1_pets`, `practice_1_appointments`, etc.
   - No `practice_NaN_*` or `practice_undefined_*` stores

4. **Test offline demo page**:
   - Navigate to `/admin/offline-demo`
   - All tabs should work without errors
   - Check browser console for any errors

## Console Log Examples

### ✅ Success Logs

```
[useOfflineInit] ✅ Valid practice ID: 1 (type: number)
[StorageManager] 🎯 Setting tenant context: { tenantId: 'smartvet', practiceId: '1' }
[TenantDB] 🏥 Registering practice: 1 for tenant: smartvet
[TenantDB] ✅ Practice registered: 1 in tenant: smartvet
```

### ❌ Error Logs (Fixed)

```
[useOfflineInit] ❌ Invalid practice ID
[TenantDB] ❌ Invalid practiceId: undefined
[StorageManager] ⚠️ No valid practice ID provided
```

## Files Changed Summary

| File                                          | Lines Changed | Description                                   |
| --------------------------------------------- | ------------- | --------------------------------------------- |
| `src/lib/offline/db/tenant-manager.ts`        | ~80           | Added validation, enhanced upgrade process    |
| `src/lib/offline/managers/storage-manager.ts` | ~20           | Added practiceId validation                   |
| `src/hooks/use-offline-initialization.ts`     | ~40           | Enhanced practiceId validation and conversion |

## Related Documentation

- `/docs/DATABASE_RESTRUCTURE.md` - Database module reorganization
- `/docs/OFFLINE_TENANT_ISOLATION_IMPLEMENTATION.md` - Tenant isolation architecture
- `/docs/OFFLINE_TENANT_PRACTICE_ISOLATION.md` - Practice isolation details

## Notes

- The 'cache' store issue will only affect databases created before this fix
- Existing databases will be upgraded automatically on next login
- The upgrade process is safe and preserves existing data
- Practice stores with NaN in the name should be manually deleted if they exist
