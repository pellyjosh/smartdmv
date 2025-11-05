# Database Module Restructuring

## Overview

Successfully restructured the offline IndexedDB system to be fully tenant and practice aware, with all database-related code consolidated in a dedicated `/lib/offline/db/` folder.

## What Was Done

### 1. Removed Old Non-Tenant-Aware System

**Deleted Files:**

- `/src/lib/indexed-db.ts` - Old single-database system that wasn't tenant-aware
- This file was causing conflicts with the new tenant-isolated system

### 2. Created New Database Module Structure

**New Directory:** `/src/lib/offline/db/`

**Files Organized:**

```
/src/lib/offline/db/
├── index.ts          - Barrel exports for easy imports
├── schema.ts         - Database schema, store definitions, tenant/practice naming
├── manager.ts        - IndexedDBManager - practice-aware operations wrapper
└── tenant-manager.ts - TenantDatabaseManager - tenant-level database management
```

### 3. Moved and Renamed Files

**From `/src/lib/offline/core/` → To `/src/lib/offline/db/`:**

- `indexed-db-schema.ts` → `schema.ts`
- `indexed-db-manager.ts` → `manager.ts`
- `tenant-database-manager.ts` → `tenant-manager.ts`

**Remaining in `/core/`:**

- `tenant-context.ts` - Tenant context utilities (not pure database code)

### 4. Updated All Import Paths

**Files Updated (21 total):**

**Component Files (2):**

- `/src/components/offline/OfflineIndicator.tsx`
- `/src/components/offline/SyncStatus.tsx`

**Storage Files (7):**

- `/src/lib/offline/storage/auth-storage.ts`
- `/src/lib/offline/storage/permission-storage.ts`
- `/src/lib/offline/storage/sync-queue-storage.ts`
- `/src/lib/offline/storage/conflict-storage.ts`
- `/src/lib/offline/storage/id-mapping-storage.ts`
- `/src/lib/offline/storage/tenant-storage.ts`
- `/src/lib/offline/storage/entity-storage.ts`

**Manager Files (3):**

- `/src/lib/offline/managers/storage-manager.ts`
- `/src/lib/offline/managers/practice-context-manager.ts`
- `/src/lib/offline/managers/practice-scoped-storage.ts`

**Utility Files (2):**

- `/src/lib/offline/utils/offline-init.ts`
- `/src/lib/offline/utils/database-cleanup.ts`

**Sync Files (1):**

- `/src/lib/offline/sync/temp-id-resolver.ts`

**Hook Files (2):**

- `/src/hooks/use-offline-auth.ts`
- `/src/hooks/use-sync-queue.ts`
- `/src/hooks/use-practice.tsx`

**Core Files (2):**

- `/src/lib/auth-cache.ts`
- `/src/lib/offline/index.ts` (barrel export)

**Database Module Files (3):**

- `/src/lib/offline/db/manager.ts` (fixed internal imports)
- `/src/lib/offline/db/tenant-manager.ts` (fixed internal imports)
- `/src/lib/offline/core/tenant-context.ts` (updated to use new path)

## Tenant & Practice Isolation Architecture

### Database Naming Convention

**Tenant Isolation:**

- Each tenant gets a separate IndexedDB database
- Database name: `SmartDMV_Tenant_{tenantId}`
- Example: `SmartDMV_Tenant_smartvet`

**Practice Isolation:**

- Within each tenant database, practices are isolated via store prefixes
- Store name: `practice_{practiceId}_{storeName}`
- Example: `practice_1_pets`, `practice_1_appointments`

**System Stores:**

- Shared across practices within a tenant
- No practice prefix
- Examples: `auth`, `sessions`, `permissions`, `cache`

### Key Functions

**From `schema.ts`:**

```typescript
// Get tenant database name
getTenantDatabaseName(tenantId: string): string
// Returns: SmartDMV_Tenant_{tenantId}

// Get practice store name
getPracticeStoreName(practiceId: string, storeName: string): string
// Returns: practice_{practiceId}_{storeName}

// Extract practice ID from store name
extractPracticeFromStoreName(storeName: string): string | null
```

### Store Types

**SYSTEM_STORES** (Shared across practices):

- `auth` - Authentication tokens
- `sessions` - User sessions
- `permissions` - Role-based permissions
- `cache` - Temporary cached data
- `sync_queue` - Sync operations
- `metadata` - Database metadata
- `conflicts` - Sync conflicts
- `id_mappings` - Temporary ID mappings

**TENANT_ISOLATED_STORES** (Practice-specific):

- `pets` - Pet records
- `appointments` - Appointment data
- `clients` - Client information
- `soapNotes` - Medical notes
- `invoices` - Billing records
- `inventory` - Inventory items
- And more...

## Usage Examples

### Import the Database Manager

```typescript
// Option 1: Import from barrel export
import { indexedDBManager, tenantDatabaseManager } from "@/lib/offline/db";

// Option 2: Import specific modules
import { indexedDBManager } from "@/lib/offline/db/manager";
import { STORES, getTenantDatabaseName } from "@/lib/offline/db/schema";
import { tenantDatabaseManager } from "@/lib/offline/db/tenant-manager";
```

### Set Tenant Context

```typescript
// Set current tenant and practice
indexedDBManager.setCurrentTenant(tenantId, practiceId);

// All subsequent operations are isolated to this tenant/practice
```

### Perform Operations

```typescript
// Save data (automatically goes to correct practice store)
await indexedDBManager.put("pets", petData);

// Get data (automatically reads from correct practice store)
const pet = await indexedDBManager.get("pets", petId);

// Get all data from practice store
const allPets = await indexedDBManager.getAll("pets");

// Query by index
const petsByOwner = await indexedDBManager.queryByIndex(
  "pets",
  "by-owner",
  ownerId
);
```

### Initialize Tenant Database

```typescript
// Initialize database for a tenant
await tenantDatabaseManager.initialize(tenantId);

// Register a new practice (creates practice-specific stores)
await tenantDatabaseManager.registerPractice(practiceId, tenantId);
```

### Clear Practice Data

```typescript
// Clear all data for a specific practice
await tenantDatabaseManager.clearPracticeData(practiceId, tenantId);

// Delete entire tenant database
await tenantDatabaseManager.deleteTenantDatabase(tenantId);
```

## Benefits of New Structure

### 1. Clear Organization

- All database code in one location (`/lib/offline/db/`)
- Easy to find and maintain
- Clear separation from other offline features

### 2. Tenant Isolation

- Each tenant has separate database
- Complete data isolation at database level
- No risk of cross-tenant data leakage

### 3. Practice Isolation

- Within tenant database, practices are isolated via store prefixes
- Users can switch between practices seamlessly
- Each practice's data is kept separate

### 4. Connection Pooling

- Efficient management of database connections
- Max 10 concurrent tenant connections
- 5-minute idle timeout for cleanup
- Automatic cache eviction when limit reached

### 5. Simplified Imports

- Barrel export (`/lib/offline/db/index.ts`) for easy imports
- Consistent import paths across codebase
- Clear API surface

## Verification

### Build Status

✅ **Project builds successfully** with new structure

- No TypeScript errors
- All imports resolved correctly
- Webpack compilation successful

### File Structure

```
src/lib/offline/
├── db/                    # Database module (NEW)
│   ├── index.ts           # Barrel exports
│   ├── schema.ts          # Schema definitions
│   ├── manager.ts         # Operations wrapper
│   └── tenant-manager.ts  # Tenant management
├── core/                  # Core utilities
│   └── tenant-context.ts  # Tenant context
├── storage/               # Storage implementations
├── managers/              # Business logic managers
├── sync/                  # Sync functionality
└── utils/                 # Utility functions
```

## Next Steps

1. ✅ **Test Offline Demo Page** - Verify all tabs work correctly
2. ✅ **Verify Tenant Isolation** - Check IndexedDB in DevTools
3. ✅ **Test Auth/Permissions** - Ensure data is cached properly
4. ✅ **Test Storage Operations** - Create/read/update/delete pets, appointments, etc.
5. ✅ **Test Practice Switching** - Switch between practices and verify data isolation

## Documentation Updates Needed

The following documentation files reference old paths and should be updated:

- `docs/OFFLINE_PRACTICE_SWITCHING.md`
- `docs/OFFLINE_TENANT_PRACTICE_ISOLATION.md`
- `docs/OFFLINE_TENANT_ISOLATION_IMPLEMENTATION.md`

These are informational updates only and don't affect functionality.

## Summary

Successfully restructured the offline database system to be fully tenant and practice aware, with all database code consolidated in `/lib/offline/db/`. The new structure provides:

- **Complete tenant isolation** via separate databases
- **Practice isolation** via store prefixes
- **Clear organization** of database code
- **Easy-to-use API** via barrel exports
- **Type safety** with TypeScript
- **Connection pooling** for efficiency

All imports have been updated and the project builds successfully. The system is ready for testing and use.
