# Offline Sync System Documentation

## Overview

The SmartDMV offline sync system enables full offline functionality with bidirectional synchronization, conflict detection, and resolution strategies.

## Architecture

### Components

1. **Sync Engine** (`src/lib/offline/sync/sync-engine.ts`)
   - Orchestrates push and pull operations
   - Handles batch processing
   - Manages conflict detection
   - Progress tracking and callbacks

2. **Sync Queue** (`src/lib/offline/sync/sync-queue.ts`)
   - Queues offline operations (CREATE, UPDATE, DELETE)
   - Persists operations to IndexedDB
   - Tracks operation status and retries

3. **Network Monitor** (`src/lib/offline/core/network-monitor.ts`)
   - Detects online/offline transitions
   - Auto-triggers sync on reconnect
   - Connection quality assessment

4. **API Endpoints**
   - `/api/sync/push` - Receives offline changes from client
   - `/api/sync/pull` - Sends server changes to client

## Database Schema

### No Separate `clients` Table

**Important**: The system does NOT have a separate `clients` table. Instead:
- **Clients are `users`** with specific roles (CLIENT)
- `pets.ownerId` references `users.id`
- `appointments.clientId` references `users.id`

This is critical for understanding the data relationships.

## Data Flow

### Creating an Appointment Offline

```typescript
// 1. User creates appointment offline
const appointment = {
  title: "Checkup",
  type: "checkup",
  date: new Date(),
  durationMinutes: 30,
  petId: 123,
  practitionerId: 456,
  practiceId: 1,
  // Note: NO clientId in request
};

// 2. Stored in IndexedDB with temp ID
await syncQueue.addOperation({
  operation: 'create',
  entityType: 'appointments',
  data: appointment,
  tempId: 'temp_appt_12345' // Generated locally
});

// 3. When online, sync engine pushes to server
POST /api/sync/push
{
  operations: [{
    operation: 'create',
    entityType: 'appointments',
    data: { ...appointment },
    tempId: 'temp_appt_12345'
  }]
}

// 4. Server processes appointment
// - Validates pet exists
// - Derives clientId from pet.ownerId
// - Inserts into database
// - Returns real ID

// 5. Client receives ID mapping
{
  tempId: 'temp_appt_12345',
  realId: 789,
  success: true
}

// 6. Client updates local records
// - Replace temp ID with real ID
// - Remove from sync queue
```

### Appointment Creation Logic (Server-Side)

```typescript
// From /api/sync/push route.ts
if (op.entityType === 'appointments') {
  // Derive clientId from pet
  if (dataWithoutId.petId) {
    const pet = await db.query.pets.findFirst({
      where: eq(pets.id, dataWithoutId.petId),
    });
    
    if (pet) {
      finalData.clientId = pet.ownerId; // ✅ Set from pet's owner
    }
  }
  
  // Convert date string to Date object
  if (finalData.date && typeof finalData.date === 'string') {
    finalData.date = new Date(finalData.date);
  }
  
  // Convert duration to string (schema requirement)
  if (finalData.durationMinutes && typeof finalData.durationMinutes === 'number') {
    finalData.durationMinutes = finalData.durationMinutes.toString();
  }
}

// Insert appointment
const [newRecord] = await db.insert(appointments).values(finalData).returning();
```

## Sync Push Endpoint (`/api/sync/push`)

### Request Format

```typescript
POST /api/sync/push
{
  operations: [
    {
      id: 1,                           // Operation ID (optional)
      operation: 'create',             // 'create' | 'update' | 'delete'
      entityType: 'appointments',      // Entity type
      entityId: 'temp_123',            // Temp or real ID
      data: { /* entity data */ },     // Full entity data
      timestamp: 1699564800000,        // Client timestamp
      version: 1,                      // Version number (optional)
      userId: 'user_123',              // User performing action
      practiceId: 1,                   // Practice ID
      tenantId: 'smartvet'             // Tenant ID
    }
  ],
  clientTimestamp: 1699564800000
}
```

### Response Format

```typescript
{
  success: true,
  processed: 5,
  failed: 0,
  conflicts: 1,
  results: [
    {
      operationId: 1,
      success: true,
      realId: 789,              // Real database ID
      tempId: 'temp_123',       // Original temp ID
      entityType: 'appointments'
    },
    {
      operationId: 2,
      success: false,
      conflict: true,
      entityType: 'appointments',
      conflictData: {
        localData: { /* client version */ },
        serverData: { /* server version */ },
        conflictType: 'timestamp',
        affectedFields: ['title', 'date']
      }
    }
  ]
}
```

## Sync Pull Endpoint (`/api/sync/pull`)

### Request Format

```typescript
GET /api/sync/pull?lastSyncTimestamp=1699564800000&practiceId=1&entityTypes=appointments,pets
```

### Response Format

```typescript
{
  success: true,
  timestamp: 1699565000000,  // Server timestamp
  changes: [
    {
      entityType: 'appointments',
      operation: 'create',     // 'create' | 'update' | 'delete'
      data: { /* full entity */ },
      id: 789,
      version: 1,
      updatedAt: '2024-11-10T12:00:00Z'
    }
  ],
  hasMore: false,
  nextTimestamp: 1699565000000
}
```

## Conflict Detection

### When Conflicts Occur

A conflict is detected when:
1. Server record was modified after client's last sync
2. Client has local changes to the same record
3. Changes affect the same fields

### Conflict Detection Logic

```typescript
function detectConflict(
  serverData: any,
  localData: any,
  localTimestamp: number
): { type: string; affectedFields: string[] } | null {
  const serverModified = new Date(serverData.updatedAt).getTime();
  
  if (serverModified > localTimestamp) {
    // Find conflicting fields
    const affectedFields: string[] = [];
    
    for (const key in localData) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      
      if (JSON.stringify(serverData[key]) !== JSON.stringify(localData[key])) {
        affectedFields.push(key);
      }
    }

    if (affectedFields.length > 0) {
      return { type: 'timestamp', affectedFields };
    }
  }

  return null;
}
```

## Conflict Resolution

### Resolution Strategies

1. **Server Wins** - Discard local changes, use server version
2. **Client Wins** - Overwrite server with local changes
3. **Last Write Wins** - Use the most recently modified version
4. **Merge** - Intelligently merge non-conflicting fields (auto-resolvable)
5. **Manual** - User decides field-by-field

### Resolution UI

Located at:
- Admin → Offline Demo → Sync tab → SyncEnginePanel
- OfflineIndicator (top-right) shows conflicts count

## UI Components

### 1. SyncEnginePanel

**Location**: `/src/components/offline/SyncEnginePanel.tsx`

**Features**:
- Manual "Sync Now" button
- Real-time sync progress (percentage, operations count)
- Last sync result summary
- Conflict list with unresolved count
- Resolution dialog with strategy selection

**Usage**:
```tsx
import { SyncEnginePanel } from '@/components/offline';

<SyncEnginePanel />
```

### 2. OfflineIndicator

**Location**: `/src/components/offline/OfflineIndicator.tsx`

**Features**:
- Shows online/offline status
- Displays pending operations count
- Manual "Sync Now" button (when online with pending ops)
- Auto-hides when synced
- Fixed position (top-right corner)

**Updated**: Now includes manual sync trigger

### 3. SyncStatus

**Location**: Offline Demo page

**Features**:
- Legacy component showing basic sync stats
- Displays last sync time
- Queue status
- Will be replaced by SyncEnginePanel

## Hooks

### useSyncEngine

```typescript
const {
  sync,                    // Trigger manual sync
  isSyncing,              // Sync in progress
  progress,               // { percentage, processed, total }
  lastResult,             // Last sync result
  conflicts,              // All conflicts
  unresolvedConflicts,    // Unresolved conflicts only
  resolveConflict,        // Resolve single conflict
  refreshConflicts        // Reload conflicts from storage
} = useSyncEngine();
```

### useSyncQueue

```typescript
const {
  stats,                  // { pending, failed, completed }
  operations,             // All queued operations
  addOperation,           // Add new operation
  removeOperation,        // Remove operation
  clearCompleted          // Clear completed operations
} = useSyncQueue();
```

### useNetworkStatus

```typescript
const {
  isOnline,              // Boolean: online status
  isTransitioning,       // Boolean: status changing
  connectionQuality      // 'excellent' | 'good' | 'poor' | 'offline'
} = useNetworkStatus();
```

## Auto-Sync Configuration

Auto-sync is controlled by two flags in the network monitor:

```typescript
// Initialize with auto-sync enabled
initializeNetworkMonitoring({
  syncOnReconnect: true,    // Trigger sync when going online
  autoSyncEnabled: true     // Allow automatic syncing
});
```

### Auto-Sync Trigger Conditions

All three conditions must be met:

```typescript
if (syncOnReconnect && autoSyncEnabled && wasOffline) {
  await triggerAutoSync();
}
```

### Debugging Auto-Sync

Check browser console for these logs:

```
📶 [NetworkMonitor] Network connection restored
[NetworkMonitor] wasOffline: true, syncOnReconnect: true, autoSyncEnabled: true
[NetworkMonitor] ✅ Conditions met, triggering auto-sync
```

If auto-sync doesn't trigger:

```
[NetworkMonitor] ⏭️ Auto-sync skipped - conditions not met
```

## Testing the Sync System

### Manual Testing Steps

1. **Go Offline**
   - Open DevTools → Network tab
   - Select "Offline" throttling

2. **Create Data Offline**
   - Create an appointment with a pet
   - Verify it appears in UI with temp ID
   - Check IndexedDB (Application → IndexedDB → sync_operations)

3. **Go Online**
   - Change Network throttling back to "Online"
   - Watch OfflineIndicator for sync progress
   - Or click "Sync Now" button manually

4. **Verify Sync**
   - Check browser console for sync logs
   - Verify appointment has real ID
   - Check database for new record
   - Ensure clientId was derived from pet.ownerId

5. **Test Conflicts**
   - Edit same appointment offline and on server
   - Trigger sync
   - Verify conflict appears in SyncEnginePanel
   - Test each resolution strategy

### Console Logging

Enable verbose logging:

```typescript
// In browser console
localStorage.setItem('DEBUG_OFFLINE', 'true');
```

Key log prefixes:
- `[SyncPush]` - Push endpoint logs
- `[SyncPull]` - Pull endpoint logs
- `[SyncEngine]` - Sync orchestration logs
- `[NetworkMonitor]` - Network status changes

## Common Issues & Solutions

### Issue: Auto-Sync Not Triggering

**Symptoms**: Online with pending operations, but sync doesn't start

**Debug**:
1. Check browser console for network monitor logs
2. Verify all three conditions are true:
   - `wasOffline: true`
   - `syncOnReconnect: true`
   - `autoSyncEnabled: true`

**Solutions**:
- If `wasOffline` is false: Browser started online, network monitor didn't detect transition
  - **Fix**: Use manual "Sync Now" button
- If `syncOnReconnect` is false: Flag not set during initialization
  - **Fix**: Check `initializeNetworkMonitoring()` call
- If `autoSyncEnabled` is false: Auto-sync was disabled
  - **Fix**: Re-enable in settings or code

### Issue: Appointment Not Created

**Symptoms**: Sync succeeds but no appointment in database

**Debug**:
1. Check server logs for errors
2. Verify pet exists with ID from request
3. Check that clientId was derived

**Solution**:
- Ensure `petId` is valid and pet exists
- Server will fail if pet not found

### Issue: ClientId is NULL

**Symptoms**: Appointment created but clientId is null

**Debug**:
1. Check if pet has `ownerId` set
2. Verify pet query succeeded on server

**Solution**:
- Ensure pet has valid `ownerId`
- Create pet with owner first

### Issue: Conflicts Not Appearing

**Symptoms**: Expected conflict but none shown

**Debug**:
1. Check `conflictedOperations` in IndexedDB
2. Verify timestamps (server modified > client last sync)
3. Check affected fields are actually different

**Solution**:
- Ensure server record was modified after client's last sync
- Check field values are different (JSON comparison)

## Performance Considerations

### Batch Size Limits

```typescript
// Pull endpoint limits
limit: 100  // Max records per entity type per pull
```

For large datasets, implement pagination:

```typescript
let hasMore = true;
let lastTimestamp = 0;

while (hasMore) {
  const result = await fetch(`/api/sync/pull?lastSyncTimestamp=${lastTimestamp}`);
  const data = await result.json();
  
  // Process changes
  await processChanges(data.changes);
  
  hasMore = data.hasMore;
  lastTimestamp = data.nextTimestamp || data.timestamp;
}
```

### Network Optimization

- Compress request/response bodies (gzip)
- Use incremental sync (timestamp-based)
- Batch operations (don't sync one-by-one)
- Debounce auto-sync triggers

## Future Enhancements

1. **Optimistic Locking** - Version-based conflict detection
2. **Delta Sync** - Send only changed fields
3. **Compression** - gzip large payloads
4. **Retry Logic** - Exponential backoff for failed operations
5. **Conflict Auto-Resolution** - Smart merging algorithms
6. **Background Sync** - Use Service Workers for background syncing
7. **Offline-First Architecture** - Complete offline capability

## Related Documentation

- `OFFLINE_SYNC_SYSTEM.md` (this file)
- `OFFLINE_FEATURE_PROTECTION.md` - Feature availability
- `OFFLINE_TENANT_ISOLATION.md` - Multi-tenant considerations
- `OFFLINE_API_CACHE_FIX.md` - API response caching
