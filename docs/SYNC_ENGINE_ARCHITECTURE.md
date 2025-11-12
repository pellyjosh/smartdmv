# Sync Engine and Conflict Resolution Architecture

## Overview

The SmartDMV offline sync system provides bidirectional synchronization between offline client storage (IndexedDB) and the server database (PostgreSQL) with sophisticated conflict detection and resolution capabilities.

## Architecture

### Components

1. **Sync Engine** (`src/lib/offline/sync/sync-engine.ts`)

   - Manages bidirectional sync operations
   - Handles dependency ordering
   - Orchestrates conflict detection and resolution

2. **Sync Queue** (`src/lib/offline/storage/sync-queue-storage.ts`)

   - Stores pending operations in IndexedDB
   - Priority-based queue management
   - Retry logic for failed operations

3. **Network Monitor** (`src/lib/offline/core/network-monitor.ts`)

   - Detects online/offline status changes
   - Triggers automatic sync on reconnect
   - Monitors connection quality

4. **API Endpoints**
   - `/api/sync/push` - Receive offline changes
   - `/api/sync/pull` - Send server changes

## Sync Flow

### Push (Upload) Flow

```
1. User performs action offline
   ↓
2. Operation queued in sync queue with metadata
   ↓
3. When online, sync engine retrieves pending operations
   ↓
4. Operations sorted by dependency graph
   ↓
5. Each operation sent to /api/sync/push
   ↓
6. Server validates and applies changes
   ↓
7. Conflict detection performed
   ↓
8. If successful: Update local entity sync status
   If conflict: Save to conflict store
   If failed: Increment retry count
```

### Pull (Download) Flow

```
1. Sync engine requests changes from server
   ↓
2. GET /api/sync/pull?lastSyncTimestamp={timestamp}
   ↓
3. Server returns changes since last sync
   ↓
4. For each change:
   - Apply to local IndexedDB
   - Update entity sync status to 'synced'
   ↓
5. Update last sync timestamp in metadata
```

## Conflict Detection

### Conflict Types

1. **Version Conflict**

   - Local and server have different version numbers
   - Indicates concurrent modifications

2. **Timestamp Conflict**

   - Server data modified after local changes
   - Most common conflict type

3. **Data Conflict**

   - Field-level differences between local and server
   - Hash comparison detects changes

4. **Deletion Conflict**

   - Entity deleted on server but modified locally
   - Or vice versa

5. **Missing Entity**
   - Entity exists locally but not on server
   - Can occur after hard delete

### Detection Algorithm

```typescript
function detectConflict(localData, serverData, localTimestamp):
  if !serverData and operation is UPDATE:
    return MISSING_ENTITY_CONFLICT

  if serverData.updatedAt > localTimestamp:
    affectedFields = compareFields(localData, serverData)

    if affectedFields.length > 0:
      severity = determineSeverity(affectedFields)
      return {
        type: 'timestamp',
        affectedFields,
        severity,
        autoResolvable: severity === 'low'
      }

  return null
```

### Conflict Severity

- **Low**: Only metadata fields changed (safe to auto-resolve)
- **Medium**: Non-critical fields changed
- **High**: Important fields changed
- **Critical**: Incompatible changes requiring manual resolution

## Conflict Resolution Strategies

### 1. Server Wins

**When to use**: Server is source of truth

```typescript
strategy: "server-wins";
// Action: Overwrites local with server data
// Sync status: Set to 'synced'
```

### 2. Client Wins

**When to use**: Local changes take precedence

```typescript
strategy: "client-wins";
// Action: Re-queue operation with high priority
// Sync status: Set to 'pending'
// Server will be updated on next sync
```

### 3. Merge

**When to use**: Changes don't conflict (different fields)

```typescript
strategy: "merge";
// Action: Intelligently merge both datasets
// Conflict-free fields from both sides combined
// Sync status: Set to 'pending' to upload merged result
```

**Merge Algorithm**:

```typescript
function attemptMerge(local, server):
  merged = {}

  for field in allFields:
    if local[field] === server[field]:
      merged[field] = local[field]
    else if field only in local:
      merged[field] = local[field]
    else if field only in server:
      merged[field] = server[field]
    else:
      // Conflict - cannot auto-merge
      return null

  return merged
```

### 4. Last Write Wins

**When to use**: Most recent change is most important

```typescript
strategy: "last-write-wins";
// Action: Compare timestamps, use most recent
// Automatically handles concurrent edits
```

### 5. Manual Resolution

**When to use**: Complex conflicts requiring user decision

```typescript
strategy: "manual";
resolvedData: {
  /* user-provided merged data */
}
// Action: User reviews both versions and creates resolution
// UI presents conflict with both versions for comparison
```

## Implementation Details

### Sync Queue Operations

```typescript
// Queue an operation
await syncQueueStorage.queueOperation({
  operation: "create", // or 'update', 'delete'
  entityType: "appointments",
  entityId: tempId,
  data: appointmentData,
  tenantId: context.tenantId,
  practiceId: context.practiceId,
  userId: context.userId,
  priority: "normal",
  maxRetries: 3,
  version: 1,
  requiredPermissions: ["appointments:create"],
});
```

### Dependency Management

Operations are sorted to respect relationships:

```
1. Clients (no dependencies)
2. Pets (depends on clients)
3. Appointments (depends on pets, practitioners)
4. SOAP Notes (depends on appointments)
5. Invoices (depends on appointments, clients)
```

### ID Mapping

Temporary offline IDs are mapped to real server IDs:

```typescript
{
  tempId: "temp_12345",
  realId: 42,
  entityType: "appointments",
  createdAt: 1699...,
  syncedAt: 1699...,
  operationId: 123
}
```

## API Endpoints

### POST /api/sync/push

**Request**:

```json
{
  "operations": [
    {
      "id": 123,
      "operation": "create",
      "entityType": "appointments",
      "entityId": "temp_12345",
      "data": { /* appointment data */ },
      "timestamp": 1699...,
      "tenantId": "tenant_1",
      "practiceId": 1,
      "userId": 42
    }
  ],
  "clientTimestamp": 1699...
}
```

**Response**:

```json
{
  "success": true,
  "processed": 1,
  "failed": 0,
  "conflicts": 0,
  "results": [
    {
      "operationId": 123,
      "success": true,
      "realId": 456,
      "tempId": "temp_12345",
      "entityType": "appointments"
    }
  ]
}
```

**Conflict Response**:

```json
{
  "success": false,
  "conflicts": 1,
  "results": [
    {
      "operationId": 123,
      "success": false,
      "conflict": true,
      "conflictData": {
        "localData": {
          /* local version */
        },
        "serverData": {
          /* server version */
        },
        "conflictType": "timestamp",
        "affectedFields": ["title", "date"]
      }
    }
  ]
}
```

### GET /api/sync/pull

**Request**:

```
GET /api/sync/pull?lastSyncTimestamp=1699...&practiceId=1&entityTypes=appointments,pets
```

**Response**:

```json
{
  "success": true,
  "timestamp": 1699...,
  "changes": [
    {
      "entityType": "appointments",
      "operation": "update",
      "id": 456,
      "data": { /* updated appointment */ },
      "updatedAt": "2024-11-10T12:00:00Z"
    }
  ],
  "hasMore": false
}
```

## Network Monitoring & Auto-Sync

### Initialization

```typescript
// In app initialization
import { initializeNetworkMonitoring } from "@/lib/offline/core/network-monitor";

initializeNetworkMonitoring({
  syncOnReconnect: true,
  autoSyncEnabled: true,
});
```

### React Hook Usage

```typescript
import { useNetworkStatus } from "@/hooks/offline/use-network-status";

function MyComponent() {
  const { status, isOnline, isOffline, isSlow, timeSinceOnline, triggerSync } =
    useNetworkStatus();

  return (
    <div>
      Status: {status}
      {isOffline && `Offline for ${Math.floor(timeSinceOnline / 1000)}s`}
      <button onClick={triggerSync}>Sync Now</button>
    </div>
  );
}
```

### Auto-Sync Behavior

- Automatically triggers when network is restored
- Only syncs if there are pending operations
- Prevents duplicate syncs (checks if sync in progress)
- Handles slow connections gracefully

## Database Connection Safety

### Verified Connection Pattern

All sync operations use the verified connection pattern to prevent race conditions:

```typescript
// 1. Get fresh database connection
const db = await indexedDBManager.initialize(tenantId);

// 2. Verify store exists
if (!Array.from(db.objectStoreNames).includes(storeName)) {
  return [];
}

// 3. Use verified db for all operations
const tx = db.transaction(storeName, "readwrite");
const store = tx.objectStore(storeName);
// ... perform operations
```

This prevents "object store not found" errors by ensuring the same database instance is used throughout the operation.

## Testing Sync

### Manual Test Procedure

1. **Go Offline**

   - Open DevTools → Network tab
   - Select "Offline" from throttling dropdown

2. **Create Data Offline**

   ```typescript
   // Create an appointment while offline
   await createAppointment({
     title: "Test Appointment",
     petId: 1,
     practitionerId: 2,
     date: new Date(),
     duration: 30,
   });
   ```

3. **Verify Queue**

   ```typescript
   const stats = await syncQueueStorage.getStats();
   console.log(`Pending operations: ${stats.pending}`);
   ```

4. **Go Online**

   - Change throttling to "Online"
   - Sync should trigger automatically

5. **Check Results**

   ```typescript
   const result = await getSyncEngine().getLastResult();
   console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);
   ```

6. **Verify Server Data**
   - Check database for new appointment
   - Verify temp ID was mapped to real ID

### Conflict Testing

1. **Create Concurrent Edits**

   - Update appointment on server
   - Update same appointment offline
   - Go online and sync

2. **Verify Conflict Detection**

   ```typescript
   const conflicts = await conflictStorage.getUnresolvedConflicts();
   console.log(`Conflicts: ${conflicts.length}`);
   ```

3. **Resolve Conflict**
   ```typescript
   await resolveConflict(conflict.id, {
     strategy: "merge",
     appliedAt: Date.now(),
   });
   ```

## Performance Considerations

- **Batch Size**: Default 50 operations per sync
- **Retry Logic**: Max 3 retries with exponential backoff
- **Index Usage**: Status and timestamp indexes for fast queries
- **Connection Caching**: Tenant databases cached for performance
- **Incremental Sync**: Only pull changes since last sync

## Error Handling

All sync operations include comprehensive error handling:

- Network errors → Retry with backoff
- Validation errors → Skip with logging
- Conflicts → Save to conflict store
- Critical errors → Stop sync and notify user

## Security

- Tenant isolation enforced at database level
- Practice isolation via store prefixes
- User permissions checked before operations
- Audit trail for all sync operations
