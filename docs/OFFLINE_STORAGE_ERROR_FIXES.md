# Offline Appointment Storage Error Fixes

**Date**: January 9, 2025  
**Issues**: Multiple errors when saving appointments offline  
**Status**: 🔧 IN PROGRESS

## Errors Identified

### 1. **Service Worker Cache Error**

```
Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache':
Request method 'POST' is unsupported
```

**Cause**: Service worker attempting to cache POST requests  
**Solution**: ✅ FIXED - Only cache GET requests

**File**: `public/sw.js` line 254

**Fix Applied**:

```javascript
// Before
if (response && response.status === 200) {
  cache.put(request, responseClone);
}

// After
if (request.method === "GET" && response && response.status === 200) {
  cache.put(request, responseClone);
}
```

### 2. **IndexedDB Save Validation Error**

```
DatabaseError: Failed to save appointments
at saveEntity (entity-storage.ts:77:11)
```

**Cause**: Validation failing on appointment entity structure

**Potential Issues**:

1. Metadata conflict - appointment object already had metadata property
2. Missing tenant context fields (tenantId, practiceId, userId)
3. Incorrect data structure being passed

**Fixes Applied**:

#### A. Remove Conflicting Metadata

File: `src/hooks/offline/appointments/use-offline-appointments.ts`

```typescript
// Before
const newAppointment: Appointment = {
  ...appointment,
  id: tempId,
  metadata: {
    ...appointment.metadata, // ❌ This could cause conflicts
    lastModified: Date.now(),
    syncStatus: "pending",
  },
};

// After
const { metadata: _, ...appointmentData } = appointment as any;

const newAppointment: Appointment = {
  ...appointmentData,
  id: tempId,
  metadata: {
    // ✅ Clean metadata
    lastModified: Date.now(),
    syncStatus: "pending" as const,
  },
};
```

#### B. Don't Pass Metadata from Calendar Component

File: `src/components/admin/appointments/enhanced-calendar.tsx`

```typescript
// Before
const offlineAppointmentData = {
  clientId: finalAppointmentData.petId.toString(),
  petId: finalAppointmentData.petId.toString(),
  // ...
  metadata: {
    // ❌ Don't add metadata here
    practiceId: practiceId,
    userId: userId,
    tenantId: practiceId,
  },
};

// After
const offlineAppointmentData = {
  clientId: finalAppointmentData.petId.toString(),
  petId: finalAppointmentData.petId.toString(),
  // ...
  // ✅ Let useOfflineAppointments add metadata
};
```

#### C. Enhanced Debug Logging

File: `src/lib/offline/storage/entity-storage.ts`

Added comprehensive logging to diagnose validation failures:

```typescript
console.log("[EntityStorage] Attempting to save:", entityType);
console.log("[EntityStorage] Tenant context:", context);
console.log("[EntityStorage] Generated metadata:", metadata);
console.log(
  "[EntityStorage] Entity to validate:",
  JSON.stringify(entity, null, 2)
);

const validation = validateEntity(entity);
if (!validation.valid) {
  console.error("[EntityStorage] Validation failed:", validation.errors);
  console.error("[EntityStorage] Entity:", JSON.stringify(entity, null, 2));
  throw new ValidationError(validation.errors);
}
```

## Validation Requirements

From `src/lib/offline/utils/validation.ts`:

```typescript
function validateEntity(entity: any): { valid: boolean; errors: string[] } {
  // Required fields
  if (!entity.id) errors.push("Entity must have an id");
  if (!entity.metadata) errors.push("Entity must have metadata");

  // Required metadata fields
  if (!metadata.tenantId) errors.push("Metadata must have tenantId");
  if (!metadata.practiceId) errors.push("Metadata must have practiceId");
  if (!metadata.userId) errors.push("Metadata must have userId");

  return { valid: errors.length === 0, errors };
}
```

## Data Flow

### Offline Appointment Creation

```
1. Calendar Form Submit
   ↓
2. Transform to offline format (enhanced-calendar.tsx)
   {
     clientId, petId, practitionerId,
     appointmentDate, startTime, endTime,
     appointmentType, status, reason, notes
   }
   ↓
3. useOfflineAppointments.createAppointment()
   - Generate temp ID
   - Add metadata { lastModified, syncStatus }
   ↓
4. useOfflineStorage.save()
   ↓
5. StorageManager.saveEntity()
   ↓
6. entityStorage.saveEntity()
   - Get tenant context
   - Generate full metadata { tenantId, practiceId, userId, ... }
   - Wrap in OfflineEntity { id, data, metadata }
   - Validate
   - Save to IndexedDB
```

### Entity Structure in IndexedDB

```typescript
{
  id: "temp_1731159876543_abc123",
  data: {
    id: "temp_1731159876543_abc123",
    clientId: "123",
    petId: "123",
    // ... appointment fields
  },
  metadata: {
    tenantId: "innova",
    practiceId: 1,
    userId: "1",
    createdAt: 1731159876543,
    lastModified: 1731159876543,
    syncStatus: "pending",
    version: 1
  }
}
```

## Files Modified

1. `public/sw.js` - Fixed POST request caching
2. `src/hooks/offline/appointments/use-offline-appointments.ts` - Removed metadata conflicts
3. `src/components/admin/appointments/enhanced-calendar.tsx` - Removed manual metadata
4. `src/lib/offline/storage/entity-storage.ts` - Enhanced debug logging

## Testing Steps

### To Test Fix:

1. **Go Offline**: Disable network in DevTools
2. **Open Calendar**: Navigate to appointments page
3. **Create Appointment**: Fill form and submit
4. **Check Console**: Look for debug logs:
   ```
   [EntityStorage] Attempting to save: appointments
   [EntityStorage] Tenant context: { tenantId, practiceId, userId }
   [EntityStorage] Generated metadata: { ... }
   [EntityStorage] Entity to validate: { ... }
   ```
5. **Expected**: Entity validated and saved successfully
6. **Failure**: Check validation errors in console

### Common Validation Failures:

- **No tenant context**: User not authenticated or offline init not run
- **Missing metadata fields**: tenantId, practiceId, or userId null/undefined
- **Conflicting metadata**: Appointment object has metadata property

## Next Steps

1. ✅ Test with network offline
2. ⏳ Verify tenant context is available
3. ⏳ Confirm validation passes
4. ⏳ Check IndexedDB for saved appointment
5. ⏳ Test sync when network restored

## Known Issues to Investigate

- Tenant context may not be initialized before offline storage attempted
- Practice ID might be string vs number mismatch
- User ID might not be available in offline context

---

**Status**: Awaiting browser test to confirm fixes
