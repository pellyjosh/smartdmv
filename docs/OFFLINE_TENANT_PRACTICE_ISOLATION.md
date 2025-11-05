# Tenant & Practice Database Isolation Architecture

## Overview

This document describes the enhanced offline architecture with **complete tenant database isolation** and **practice-level data separation**.

## Architecture Design

### Multi-Tenant Database Isolation

Each tenant gets a **separate IndexedDB database**:

```
SmartDMV_Tenant_acme       <- Tenant "acme"
SmartDMV_Tenant_vetclinic  <- Tenant "vetclinic"
SmartDMV_Tenant_smartvet   <- Tenant "smartvet"
```

**Benefits:**

- ✅ Complete data isolation between tenants
- ✅ Security: No risk of cross-tenant data leakage
- ✅ Easier data management: Delete/clear per tenant
- ✅ Storage quota per tenant
- ✅ Faster queries (smaller databases)

### Practice-Level Isolation (Within Tenant DB)

Within each tenant database, practices are isolated via **store prefixes**:

```
// In SmartDMV_Tenant_acme:
practice_main_pets           <- Practice "main"
practice_main_appointments
practice_main_clients

practice_branch1_pets        <- Practice "branch1"
practice_branch1_appointments
practice_branch1_clients

// System stores (not practice-isolated):
authTokens
sessions
permissions
syncQueue
conflicts
idMappings
```

**Benefits:**

- ✅ Practice data isolation within tenant
- ✅ Support for multi-practice admins
- ✅ Fast practice switching (same DB connection)
- ✅ Shared system data (auth, permissions)

## Database Structure

### Tenant Database Naming

```typescript
// Function to get tenant database name
function getTenantDatabaseName(tenantId: string): string {
  return `SmartDMV_Tenant_${tenantId}`;
}

// Example:
getTenantDatabaseName('acme')  -> 'SmartDMV_Tenant_acme'
```

### Store Naming Convention

#### Practice-Isolated Stores (Entity Data)

```typescript
// Format: practice_{practiceId}_{baseStoreName}
getPracticeStoreName('main', 'pets')  -> 'practice_main_pets'
getPracticeStoreName('branch1', 'appointments')  -> 'practice_branch1_appointments'
```

**Practice-isolated stores:**

- pets
- appointments
- clients
- soapNotes
- invoices
- inventory
- prescriptions
- labResults
- medicalRecords
- vaccinations
- practitioners

#### System Stores (Global Within Tenant)

```typescript
// No prefix - shared across practices in tenant
SYSTEM_STORES = [
  "authTokens", // User authentication
  "sessions", // Active sessions
  "permissions", // RBAC permissions
  "roleAssignments", // User roles
  "syncQueue", // Pending sync operations
  "metadata", // Database metadata
  "attachments", // File attachments
  "idMappings", // Temp ID → Real ID mappings
  "conflicts", // Sync conflicts
  "userPreferences", // User settings
  "practices", // Available practices
  "currentPractice", // Active practice per user
];
```

## Implementation Components

### 1. Tenant Database Manager

**File:** `src/lib/offline/core/tenant-database-manager.ts`

**Responsibilities:**

- Create/open tenant-specific databases
- Connection pooling (max 10 connections)
- Auto-cleanup idle connections (5min timeout)
- Practice registration (create practice stores)
- Tenant database deletion
- Practice data clearing

**Key Methods:**

```typescript
class TenantDatabaseManager {
  // Set active tenant/practice context
  setCurrentTenant(tenantId: string, practiceId?: string): void;

  // Get/initialize tenant database
  initialize(tenantId?: string): Promise<IDBDatabase>;

  // Register practice (creates stores)
  registerPractice(practiceId: string, tenantId?: string): Promise<void>;

  // Delete entire tenant database
  deleteTenantDatabase(tenantId: string): Promise<void>;

  // Clear practice data within tenant
  clearPracticeData(practiceId: string, tenantId?: string): Promise<void>;

  // Get connection stats
  getStats(): ConnectionStats;
}
```

### 2. Updated IndexedDB Manager

**File:** `src/lib/offline/core/indexed-db-manager.ts`

**Changes:**

- Use `TenantDatabaseManager` for connection management
- All operations check current tenant context
- Store name resolution: `getPracticeStoreName()` for isolated stores
- Throw error if no tenant context set

### 3. Practice Context Hook

**File:** `src/hooks/use-tenant-practice-context.ts`

**Responsibilities:**

- Manage current tenant/practice state
- Trigger database switching
- Clear data on logout
- Provide context to components

**Usage:**

```typescript
function MyComponent() {
  const { tenantId, practiceId, switchPractice, logout } =
    useTenantPracticeContext();

  const handleSwitch = async (newPracticeId: string) => {
    await switchPractice(newPracticeId);
    // Database automatically switched
  };
}
```

### 4. Updated Storage Modules

All storage modules updated to use tenant-aware database:

**Files:**

- `src/lib/offline/storage/conflict-storage.ts`
- `src/lib/offline/storage/id-mapping-storage.ts`
- `src/lib/offline/storage/sync-queue-storage.ts`
- `src/lib/offline/storage/permission-storage.ts`
- `src/lib/offline/storage/practice-storage.ts`
- All entity storage modules

**Changes:**

```typescript
// Before:
const db = await openDB();

// After:
const db = await tenantDBManager.initialize();
// Uses current tenant context automatically
```

### 5. Updated Sync Engine

**File:** `src/lib/offline/sync/sync-engine.ts`

**Changes:**

- Initialize with tenant/practice context
- All sync operations use correct tenant database
- Conflict resolution respects tenant isolation
- ID mappings per tenant

```typescript
const syncEngine = new SyncEngine();

// Set context before syncing
tenantDBManager.setCurrentTenant(tenantId, practiceId);
await syncEngine.bidirectionalSync();
```

## Data Flow

### Scenario 1: User Login

```
1. User logs in → receives JWT with tenantId, practiceId
2. App calls: tenantDBManager.setCurrentTenant(tenantId, practiceId)
3. Database opened: SmartDMV_Tenant_{tenantId}
4. Practice stores checked: practice_{practiceId}_*
5. If missing, create practice stores via registerPractice()
6. Ready for offline operations
```

### Scenario 2: Practice Switching

```
1. User clicks "Switch to Branch Office"
2. App calls: tenantDBManager.setCurrentTenant(tenantId, newPracticeId)
3. Same database (SmartDMV_Tenant_{tenantId})
4. Update currentPracticeId in memory
5. All subsequent operations use new practice stores
6. No data migration needed
```

### Scenario 3: Tenant Switching (Different Organization)

```
1. User logs into different organization
2. App calls: tenantDBManager.setCurrentTenant(newTenantId, practiceId)
3. New database opened: SmartDMV_Tenant_{newTenantId}
4. Old tenant connection kept alive for 5 minutes
5. Old connection auto-closed if idle
6. Complete data isolation
```

### Scenario 4: Logout

```
1. User clicks logout
2. App calls: tenantDBManager.clearCurrentTenant()
3. Optionally: tenantDBManager.deleteTenantDatabase(tenantId)
4. All connections closed
5. Tenant context cleared
```

## Security Considerations

### 1. Data Isolation

- ✅ Each tenant has separate database
- ✅ No shared stores between tenants
- ✅ Practice data separated within tenant
- ✅ System stores (auth, permissions) are tenant-specific

### 2. Context Validation

- ✅ All operations require tenant context
- ✅ Throw error if no context set
- ✅ Validate practiceId belongs to tenant
- ✅ Check user has access to practice

### 3. Database Access Control

```typescript
// Example: Enforce context
async function saveClient(client: Client) {
  const { tenantId, practiceId } = tenantDBManager.getCurrentTenant();

  if (!tenantId || !practiceId) {
    throw new Error("No tenant/practice context set");
  }

  // Validate user access
  const hasAccess = await hasAccessToPractice(practiceId);
  if (!hasAccess) {
    throw new Error("Access denied to practice");
  }

  // Save with context
  const storeName = getPracticeStoreName(practiceId, "clients");
  await indexedDBManager.put(storeName, client);
}
```

## Storage Management

### Per-Tenant Quota

```typescript
// Check storage usage per tenant
async function getTenantStorageUsage(tenantId: string) {
  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;

  return {
    used: usage,
    total: quota,
    percentage: (usage / quota) * 100,
  };
}
```

### Cleanup Strategy

```typescript
// Auto-cleanup old data
async function cleanupOldData(tenantId: string, daysToKeep: number) {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  // Clean sync queue
  await cleanupSyncQueue(tenantId, cutoff);

  // Clean resolved conflicts
  await cleanupResolvedConflicts(tenantId, cutoff);

  // Clean old ID mappings
  await cleanupIdMappings(tenantId, cutoff);
}
```

## Migration Path

### Phase 1: Update Schema (✅ DONE)

- Updated `indexed-db-schema.ts` with new functions
- Added `getTenantDatabaseName()`
- Updated `getPracticeStoreName()`

### Phase 2: Create Tenant DB Manager (IN PROGRESS)

- New `tenant-database-manager.ts` module
- Connection pooling
- Practice registration

### Phase 3: Update Storage Modules

- Update all storage modules to use tenant DB manager
- Add context validation

### Phase 4: Update Sync Engine

- Tenant-aware sync operations
- Context-based store resolution

### Phase 5: Create Context Hook

- React hook for tenant/practice management
- Auto-switching support

### Phase 6: Update Sprint 3 Components

- API routes respect tenant isolation
- Download/upload managers use correct databases
- Attachment handling per tenant

## Testing Strategy

### Test Cases

1. **Tenant Isolation**

   - ✅ Create data in tenant A
   - ✅ Switch to tenant B
   - ✅ Verify tenant A data not accessible
   - ✅ Create data in tenant B
   - ✅ Verify separate databases

2. **Practice Isolation**

   - ✅ Create data in practice 1
   - ✅ Switch to practice 2 (same tenant)
   - ✅ Verify practice 1 data not visible
   - ✅ Verify system stores accessible

3. **Context Enforcement**

   - ❌ Attempt operation without context → Error
   - ❌ Attempt access to unauthorized practice → Error
   - ✅ Valid context → Success

4. **Connection Management**

   - ✅ Multiple tenant connections
   - ✅ Idle connection cleanup
   - ✅ Max connection limit enforcement

5. **Data Cleanup**
   - ✅ Delete tenant database
   - ✅ Clear practice data
   - ✅ Logout clears context

## Performance Considerations

### Connection Pooling

- Keep up to 10 tenant connections open
- Auto-close idle connections after 5 minutes
- Current tenant connection never closed

### Store Access Optimization

- Practice stores created on-demand
- System stores created at database init
- Indexes for fast queries

### Memory Management

- Weak references for idle connections
- Cleanup interval: 1 minute
- Max idle time: 5 minutes

## API Reference

### Tenant Database Functions

```typescript
// Get tenant database name
getTenantDatabaseName(tenantId: string): string

// Get practice store name
getPracticeStoreName(practiceId: string, baseStoreName: string): string

// Get base store name (remove prefix)
getBaseStoreName(storeName: string): string

// Extract practice ID from store name
extractPracticeFromStoreName(storeName: string): string | null

// Get all practice store names
getPracticeStoreNames(practiceId: string): string[]
```

### Tenant Database Manager

```typescript
// Set context
setCurrentTenant(tenantId: string, practiceId?: string): void

// Get context
getCurrentTenant(): { tenantId: string | null; practiceId: string | null }

// Clear context
clearCurrentTenant(): void

// Initialize DB
initialize(tenantId?: string): Promise<IDBDatabase>

// Register practice
registerPractice(practiceId: string, tenantId?: string): Promise<void>

// Delete tenant DB
deleteTenantDatabase(tenantId: string): Promise<void>

// Clear practice data
clearPracticeData(practiceId: string, tenantId?: string): Promise<void>

// Close all connections
closeAll(): void

// Get stats
getStats(): ConnectionStats
```

## Summary

This architecture provides:

✅ **Complete Tenant Isolation** - Separate databases per tenant
✅ **Practice-Level Separation** - Store prefixes within tenant DB
✅ **Security** - No cross-tenant data access
✅ **Performance** - Connection pooling, auto-cleanup
✅ **Scalability** - Supports unlimited tenants/practices
✅ **Maintainability** - Clear separation of concerns
✅ **Sprint Integration** - Compatible with Sprint 2 & 3 features

All Sprint 2 components (sync engine, conflict resolution, temp IDs) and Sprint 3 components (API integration, download/upload managers) will respect this isolation automatically.
