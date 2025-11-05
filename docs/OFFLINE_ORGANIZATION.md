# Offline Functionality Organization

## Overview

All offline-related functionality has been consolidated into the `/src/lib/offline/` directory for better organization and maintainability.

## Directory Structure

```
src/lib/offline/
├── core/                       # Core offline infrastructure
│   ├── indexed-db-manager.ts   # IndexedDB wrapper and utilities
│   ├── indexed-db-schema.ts    # Database schema and store definitions
│   └── tenant-context.ts       # Tenant context management for offline
│
├── storage/                    # Data storage layers
│   ├── auth-storage.ts         # Authentication data (tokens, sessions)
│   ├── entity-storage.ts       # Entity data (pets, appointments, etc.)
│   ├── permission-storage.ts   # RBAC permissions cache
│   ├── sync-queue-storage.ts   # Sync queue operations
│   └── tenant-storage.ts       # Tenant information cache
│
├── managers/                   # High-level management classes
│   ├── permission-manager.ts   # Permission checking and validation
│   └── storage-manager.ts      # Storage lifecycle management
│
├── types/                      # TypeScript type definitions
│   ├── auth.types.ts          # Authentication types
│   ├── permission.types.ts    # Permission and RBAC types
│   ├── storage.types.ts       # Storage and entity types
│   └── sync.types.ts          # Sync operation types
│
└── index.ts                   # Central export point
```

## Key Components

### Core Layer

#### indexed-db-manager.ts

- Low-level IndexedDB operations
- Database initialization and upgrade handling
- Tenant isolation support
- Transaction management
- Export: `indexedDBManager`

#### indexed-db-schema.ts

- Database schema definition (version 1)
- Store names and configurations
- Index definitions
- Exports: `STORES`, `DB_NAME`, `DB_VERSION`

#### tenant-context.ts

- Tenant context extraction from session
- Multi-tenant isolation utilities
- Store name generation with tenant prefixes
- Functions: `getOfflineTenantContext()`, `setOfflineTenantContext()`, `clearOfflineTenantContext()`

### Storage Layer

#### auth-storage.ts

- Stores authentication tokens (obfuscated)
- Manages user sessions (24-hour expiry)
- Functions: `saveAuthToken()`, `getAuthToken()`, `saveSession()`, `getSession()`, `clearAuthData()`

#### entity-storage.ts

- CRUD operations for business entities
- Tenant-isolated entity storage
- Change tracking and conflict detection
- Functions: `saveEntity()`, `getEntity()`, `getAllEntities()`, `updateEntity()`, `deleteEntity()`

#### permission-storage.ts

- Caches RBAC permissions for offline use
- Builds effective permissions from roles
- SUPER_ADMIN special handling
- Functions: `savePermissions()`, `getPermissions()`, `hasPermission()`, `getOfflineCapabilities()`

#### sync-queue-storage.ts

- Queues operations for background sync
- Retry logic with exponential backoff
- Conflict resolution support
- Functions: `addOperation()`, `getPendingOperations()`, `updateOperationStatus()`, `removeOperation()`

#### tenant-storage.ts (NEW)

- Caches tenant information for offline resolution
- Provides fallback when database unavailable
- SessionStorage-based TenantCache class for backwards compatibility
- Functions: `getCachedTenantData()`, `cacheTenantData()`, `clearTenantCache()`

### Manager Layer

#### permission-manager.ts

- High-level permission checking API
- Integrates with RBAC system
- Context-based permission evaluation
- Functions: `checkPermission()`, `can()`, `canCreate()`, `canRead()`, `canUpdate()`, `canDelete()`

#### storage-manager.ts

- Manages storage lifecycle
- Initializes IndexedDB and tenant context
- Storage usage monitoring
- Cache management and cleanup
- Export: `storageManager`

## API Route Integration

### /api/tenant/resolve

Updated to support offline tenant resolution:

```typescript
try {
  // Try database first
  const tenant = await ownerDb.select(...);
  return tenant;
} catch (dbError) {
  // Fallback to IndexedDB cache
  const cachedTenant = await getCachedTenantData(identifier);
  if (cachedTenant) {
    return {
      tenant: cachedTenant,
      cached: true,
      offline: true
    };
  }
  throw dbError;
}
```

**Benefits:**

- Works offline after initial login
- Resolves tenant from cache when database unavailable
- Returns flag indicating data source

## Files Removed

### src/lib/tenant-cache.ts

**Moved to:** `src/lib/offline/storage/tenant-storage.ts`

**Reason:** Consolidate all offline functionality in one location

**Migration:**

- All imports updated to new location
- `TenantCache` class preserved for backwards compatibility
- New IndexedDB-based functions added (`getCachedTenantData`, etc.)

## Import Changes

### Before

```typescript
import { TenantCache } from "@/lib/tenant-cache";
```

### After

```typescript
import { TenantCache } from "@/lib/offline/storage/tenant-storage";
// or use the central export
import { TenantCache } from "@/lib/offline";
```

## Updated Files

1. **src/context/FastTenantContext.tsx**

   - Updated import path for TenantCache
   - No functional changes

2. **src/app/api/tenant/resolve/route.ts**

   - Added offline fallback logic
   - Imports `getCachedTenantData` from new location
   - Returns cached tenant when database unavailable

3. **src/lib/offline/index.ts** (NEW)
   - Central export point for all offline functionality
   - Clean, organized imports

## Benefits of Reorganization

1. **Improved Discoverability**: All offline code in one location
2. **Better Maintainability**: Clear separation of concerns (core, storage, managers)
3. **Easier Testing**: Isolated components with clear dependencies
4. **Consistent Architecture**: Matches Next.js best practices
5. **Type Safety**: Centralized type definitions
6. **Import Simplicity**: Use `@/lib/offline` for all imports

## Usage Examples

### Get Cached Tenant Data

```typescript
import { getCachedTenantData } from "@/lib/offline/storage/tenant-storage";

const tenant = await getCachedTenantData("smartvet");
if (tenant) {
  console.log("Tenant:", tenant.name);
}
```

### Cache Tenant Data

```typescript
import { cacheTenantData } from "@/lib/offline/storage/tenant-storage";

await cacheTenantData({
  id: "1",
  slug: "smartvet",
  name: "Smart Vet Clinic",
  subdomain: "smartvet",
  status: "active",
  databaseName: "smartvet_db",
  storagePath: "/storage/smartvet",
  domain: null,
  settings: {
    timezone: "UTC",
    theme: "default",
    features: [],
  },
});
```

### Use SessionStorage Cache (Legacy)

```typescript
import { TenantCache } from "@/lib/offline/storage/tenant-storage";

// Get cached tenant
const cached = TenantCache.get();
if (cached) {
  console.log("Cached tenant:", cached.data);
}

// Set cached tenant
TenantCache.set(tenantData);

// Clear cache
TenantCache.clear();
```

## Testing Offline Tenant Resolution

1. **Login while online** - Tenant data gets cached
2. **Go offline** (DevTools → Network → Offline)
3. **Refresh page** - Tenant resolves from IndexedDB cache
4. **Check console** - Should see:
   ```
   [TenantStorage] Looking for cached tenant: smartvet
   [TenantStorage] Found tenant in cache: Smart Vet Clinic
   [TENANT_RESOLVE] Using IndexedDB cached tenant (offline): Smart Vet Clinic
   ```

## Next Steps

Consider adding:

1. Cache invalidation strategies
2. Tenant data sync when coming back online
3. Cache size management
4. Encrypted tenant data storage
5. Multi-tenant offline switching support
