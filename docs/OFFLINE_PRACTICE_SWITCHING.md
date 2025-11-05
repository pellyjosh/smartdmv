# Offline Practice Switching Implementation

**Date**: November 2, 2025  
**Feature**: Multi-practice offline support with conflict-free data isolation

## Overview

This document describes the implementation of offline practice switching for ADMINISTRATOR and SUPER_ADMIN users. The system allows users to switch between practices without network connectivity while maintaining data isolation and preventing sync conflicts.

## Architecture

### Core Components

1. **Practice Storage** (`src/lib/offline/storage/practice-storage.ts`)

   - Caches accessible practices in IndexedDB on login
   - Stores current practice selection for offline use
   - Provides practice lookup and validation

2. **Practice Context Manager** (`src/lib/offline/managers/practice-context-manager.ts`)

   - Manages active practice context
   - Handles online/offline practice switching
   - Queues practice switches for sync when back online

3. **Practice-Scoped Storage** (`src/lib/offline/managers/practice-scoped-storage.ts`)

   - Wraps data operations with practice isolation
   - Automatically prefixes store names with practice ID
   - Ensures data doesn't conflict between practices

4. **IndexedDB Schema Updates** (`src/lib/offline/core/indexed-db-schema.ts`)
   - Added `practices` store for accessible practices cache
   - Added `current_practice` store for quick practice lookup
   - Added `getPracticeStoreName()` helper for practice-specific stores

## Data Isolation Strategy

### Store Naming Convention

```typescript
// Base store name
"appointments";

// Tenant-isolated store
"tenant_innova_appointments";

// Practice-isolated store (new)
"tenant_innova_practice_1_appointments";
```

### Entity Metadata

All entities stored offline include practice metadata:

```typescript
{
  id: 123,
  data: { /* entity data */ },
  metadata: {
    tenantId: 'innova',
    practiceId: '1',          // NEW: Practice ID for isolation
    userId: 42,
    createdAt: 1234567890,
    lastModified: 1234567890,
    syncStatus: 'pending'
  }
}
```

## User Flow

### 1. Login

```typescript
// When user logs in (auth-cache.ts)
if (user.role === "ADMINISTRATOR" || user.role === "SUPER_ADMIN") {
  // Fetch all accessible practices
  const practicePromises = accessiblePracticeIds.map((id) =>
    fetch(`/api/practices/${id}`)
  );

  // Cache practices in IndexedDB
  await cacheAccessiblePractices(userId, practices, currentPracticeId);
}
```

**Result**: User's accessible practices stored in IndexedDB `practices` store

### 2. Practice Switching (Online)

```typescript
// UserContext.tsx
const switchPractice = async (newPracticeId: string) => {
  if (navigator.onLine) {
    // Use server action
    const updatedUser = await switchPracticeAction(userId, newPracticeId);
    setUser(updatedUser);
  }
};
```

**Result**: Server updates database, returns updated user object

### 3. Practice Switching (Offline)

```typescript
// UserContext.tsx
const switchPractice = async (newPracticeId: string) => {
  if (!navigator.onLine) {
    // Use local cache
    const success = await switchPracticeOffline(userId, newPracticeId);

    if (success) {
      // Update local state
      setUser({ ...user, currentPracticeId: newPracticeId });

      // Queue for sync
      await queuePracticeSwitchSync(userId, newPracticeId);
    }
  }
};
```

**Result**:

- Current practice updated in IndexedDB
- User state updated locally
- Switch queued for server sync when online

### 4. Creating Data (Offline)

```typescript
// Using practice-scoped storage
import { saveOfflineEntity } from "@/lib/offline";

// Automatically uses current practice context
await saveOfflineEntity("appointments", appointment);

// Stored as: tenant_innova_practice_1_appointments
```

**Result**: Data saved to practice-specific store

### 5. Switching Practice (Offline)

```typescript
// User switches from Practice 1 to Practice 2
await switchPracticeOffline(userId, "2");

// Create new appointment
await saveOfflineEntity("appointments", newAppointment);

// Stored as: tenant_innova_practice_2_appointments
```

**Result**: New data saved to different practice store - no conflicts!

### 6. Sync When Online

```typescript
// Sync manager processes queue
const pendingOps = await getPendingOperations();

for (const op of pendingOps) {
  // Each operation includes practiceId
  console.log(op.practiceId); // '1' or '2'

  // Server knows which practice the data belongs to
  await syncToServer(op);
}
```

**Result**: Server receives practice context with each operation

## Key Features

### ✅ Conflict-Free Architecture

- **Practice Isolation**: Each practice has separate IndexedDB stores
- **Metadata Tracking**: Every entity tagged with `practiceId`
- **Sync Queue Context**: Queue items include practice information
- **No Collisions**: Data from different practices can't conflict

### ✅ Seamless UX

- **Transparent Switching**: Works offline without error messages
- **State Preservation**: Each practice maintains its own data
- **Visual Feedback**: Shows which practice is active
- **Smart Sync**: Syncs practice switch first, then data

### ✅ Admin Features

- **Multi-Practice Support**: ADMINISTRATOR and SUPER_ADMIN can switch
- **Access Control**: Only accessible practices shown in dropdown
- **Current Practice Display**: Shows active practice name
- **Offline Indicator**: Visual cue when offline

## Implementation Details

### IndexedDB Schema (v2)

```typescript
// New stores
practices: {
  keyPath: 'userId',
  indexes: ['userId']
}

current_practice: {
  keyPath: 'userId',
  indexes: ['userId']
}

// Updated entity stores
appointments: {
  keyPath: 'id',
  indexes: [
    'metadata.practiceId',  // NEW
    'metadata.tenantId',
    'metadata.syncStatus'
  ]
}
```

### Cached Practice Data Structure

```typescript
{
  userId: '42',
  practices: [
    {
      id: '1',
      name: 'Main Clinic',
      subdomain: 'main',
      companyId: 'innova',
      isActive: true,
      cached_at: '2025-11-02T...'
    },
    {
      id: '2',
      name: 'Branch Office',
      subdomain: 'branch',
      companyId: 'innova',
      isActive: true,
      cached_at: '2025-11-02T...'
    }
  ],
  currentPracticeId: '1',
  cached_at: '2025-11-02T...'
}
```

### Sync Queue Item with Practice

```typescript
{
  id: 1,
  tenantId: 'innova',
  practiceId: 1,        // Practice context
  userId: 42,
  entityType: 'appointments',
  entityId: 'temp_123',
  operation: 'create',
  data: { /* appointment data */ },
  timestamp: 1234567890,
  status: 'pending',
  priority: 'normal'
}
```

## API Changes

### New Functions

**Practice Storage**:

- `cacheAccessiblePractices(userId, practices, currentPracticeId)`
- `getCachedAccessiblePractices(userId)`
- `switchPracticeOffline(userId, practiceId)`
- `getCurrentPracticeId(userId)`
- `getCachedPracticeById(userId, practiceId)`

**Practice Context**:

- `initializePracticeContext(userId, practiceId, tenantId)`
- `getCurrentPracticeContext()`
- `switchPractice(userId, practiceId, tenantId)`
- `hasAccessToPractice(userId, practiceId)`

**Practice-Scoped Storage**:

- `saveOfflineEntity(storeName, entity, practiceId?)`
- `getOfflineEntity(storeName, id, practiceId?)`
- `getAllOfflineEntities(storeName, practiceId?)`
- `deleteOfflineEntity(storeName, id, practiceId?)`
- `clearPracticeData(practiceId, tenantId)`
- `getPracticeDataStats(practiceId, tenantId)`

## Usage Examples

### Check User's Accessible Practices

```typescript
import { getCachedAccessiblePractices } from "@/lib/offline";

const data = await getCachedAccessiblePractices(userId);
console.log(data.practices); // Array of practices
console.log(data.currentPracticeId); // Active practice
```

### Switch Practice

```typescript
import { switchPractice } from "@/context/UserContext";

// Works both online and offline
await switchPractice("2");
```

### Save Data with Practice Context

```typescript
import { saveOfflineEntity } from "@/lib/offline";

// Automatically scoped to current practice
await saveOfflineEntity("appointments", {
  id: "temp_123",
  data: appointmentData,
  metadata: {
    tenantId: "innova",
    practiceId: 1, // Set automatically if not provided
    userId: 42,
    createdAt: Date.now(),
    lastModified: Date.now(),
    syncStatus: "pending",
  },
});
```

### Query Practice-Specific Data

```typescript
import { getAllOfflineEntities } from "@/lib/offline";

// Get appointments for current practice
const appointments = await getAllOfflineEntities("appointments");

// Get appointments for specific practice
const practiceAppointments = await getAllOfflineEntities("appointments", "2");
```

## Testing Checklist

### Offline Practice Switching

- [ ] Login as ADMINISTRATOR with multiple practices
- [ ] Verify practices cached in IndexedDB
- [ ] Go offline (disable network)
- [ ] Switch to different practice
- [ ] Create appointment in Practice 1
- [ ] Switch to Practice 2
- [ ] Create appointment in Practice 2
- [ ] Verify separate stores created
- [ ] Go back online
- [ ] Verify practice switch synced
- [ ] Verify appointments synced to correct practices

### Data Isolation

- [ ] Create data in Practice 1
- [ ] Switch to Practice 2
- [ ] Verify Practice 1 data not visible
- [ ] Create data in Practice 2
- [ ] Switch back to Practice 1
- [ ] Verify Practice 2 data not visible
- [ ] Verify each practice has own data

### Sync Conflict Prevention

- [ ] Create data in Practice 1 offline
- [ ] Switch to Practice 2 offline
- [ ] Create data in Practice 2 offline
- [ ] Go online
- [ ] Verify both sets of data sync
- [ ] Verify no conflicts
- [ ] Verify practice context preserved

## Migration Notes

### Existing Data

Existing offline data will continue to work but won't have practice isolation. Consider:

1. Clear offline data on next login
2. Migrate existing data to practice-specific stores
3. Add practice metadata to existing entities

### Code Updates Required

Components using direct IndexedDB access should migrate to:

```typescript
// Before
await indexedDBManager.put("appointments", appointment);

// After
import { saveOfflineEntity } from "@/lib/offline";
await saveOfflineEntity("appointments", appointment);
```

## Future Enhancements

1. **Practice Sync Settings**: Per-practice sync intervals
2. **Practice Data Export**: Export data for specific practice
3. **Practice Storage Limits**: Set storage quotas per practice
4. **Cross-Practice Reports**: Aggregate data from multiple practices
5. **Practice Archival**: Archive old practice data
6. **Practice Permissions**: Fine-grained permissions per practice

## Files Modified

1. ✅ `src/lib/offline/storage/practice-storage.ts` (NEW)
2. ✅ `src/lib/offline/managers/practice-context-manager.ts` (NEW)
3. ✅ `src/lib/offline/managers/practice-scoped-storage.ts` (NEW)
4. ✅ `src/lib/offline/core/indexed-db-schema.ts` (UPDATED)
5. ✅ `src/lib/auth-cache.ts` (UPDATED)
6. ✅ `src/context/UserContext.tsx` (UPDATED)
7. ✅ `src/components/layout/AppHeader.tsx` (UPDATED)
8. ✅ `src/lib/offline/index.ts` (UPDATED)

## Conclusion

This implementation provides a robust offline practice switching experience with:

- ✅ Complete data isolation between practices
- ✅ Conflict-free synchronization
- ✅ Seamless online/offline transitions
- ✅ Admin and Super Admin support
- ✅ Automatic practice context management
- ✅ Comprehensive practice data tracking

The system ensures that data created in one practice never conflicts with data from another practice, even when switching while offline.
