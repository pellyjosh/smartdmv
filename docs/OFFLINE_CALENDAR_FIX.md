# Offline Calendar Fix - Stop 503 Pinging

**Date**: January 9, 2025  
**Issue**: Calendar continuously pinging API when offline, causing 503 errors  
**Status**: ✅ FIXED

## Problem Description

When offline, the enhanced calendar component was:

1. **Continuously retrying** failed API requests (503 Service Unavailable)
2. **Refetching every 5 seconds** even when network was down
3. **Not using IndexedDB** for offline appointments storage
4. **Showing 503 errors** instead of gracefully handling offline state

### Error Logs

```
GET /api/appointments/by-date/2025-11-13?practiceId=1 503 (Service Unavailable)
Request queued for sync when connection is restored
```

React Query was retrying indefinitely with exponential backoff, causing excessive logging and poor UX.

## Solution Implemented

### 1. **Network-Aware Query Configuration**

Added `useNetworkStatus()` hook and configured React Query to respect offline state:

```typescript
import { useNetworkStatus } from "@/hooks/use-network-status";

const { isOnline } = useNetworkStatus();

const { data: appointments = [] } = useQuery({
  queryKey: ["/api/appointments/by-date", formattedDate, practiceId],
  queryFn: async () => {
    /* fetch logic */
  },

  // Only auto-refresh when online
  refetchInterval: isOnline ? 5000 : false,
  refetchOnWindowFocus: isOnline,

  // Disable retries when offline to prevent continuous 503 errors
  retry: isOnline ? 3 : false,

  // Don't throw errors in render, handle gracefully
  throwOnError: false,
});
```

**Benefits:**

- ✅ No more continuous retries when offline
- ✅ No background refetching while disconnected
- ✅ Immediate stop when network goes down
- ✅ Auto-resume when network restored

### 2. **Offline-Aware Month Range Queries**

Updated the month range query to bail out early when offline:

```typescript
useEffect(() => {
  // Don't fetch when offline to prevent 503 errors
  if (!isOnline) {
    setDatesWithAppointments(new Set());
    return;
  }

  // ... fetch appointments for month
}, [visibleMonth, practiceId, isOnline]);
```

**Result**: Calendar dots won't update while offline, preventing unnecessary API calls.

### 3. **Offline Appointment Creation**

Integrated offline appointments hook for create operations:

```typescript
import { useOfflineAppointments } from "@/hooks/offline/appointments/use-offline-appointments";

const { createAppointment: createOfflineAppointment } =
  useOfflineAppointments();

const createAppointmentMutation = useMutation({
  mutationFn: async (data) => {
    // When offline, use offline storage instead of API
    if (!isOnline) {
      console.log("[Calendar] Offline mode - saving to IndexedDB");
      const offlineData = transformToOfflineFormat(data);
      return await createOfflineAppointment(offlineData);
    }

    // Online mode - use API
    return await apiRequest("POST", "/api/appointments", data);
  },
  onSuccess: () => {
    // Only refetch when online
    if (isOnline) {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    }

    toast({
      title: isOnline ? "Appointment scheduled" : "Appointment saved offline",
      description: isOnline
        ? "The appointment has been successfully created."
        : "Saved locally and will sync when you're back online.",
    });
  },
});
```

**Offline Flow:**

1. User submits appointment form while offline
2. Data saved to IndexedDB immediately
3. Added to sync queue for later processing
4. User sees "Saved offline" toast
5. When network restored, auto-syncs to server

### 4. **User Feedback Improvements**

Enhanced toast messages to indicate offline state:

```typescript
toast({
  title: isOnline ? "Appointment scheduled" : "Appointment saved offline",
  description: isOnline
    ? "The appointment has been successfully created."
    : "The appointment has been saved locally and will sync when you're back online.",
});
```

## Files Modified

### `/src/components/admin/appointments/enhanced-calendar.tsx`

**Changes:**

1. Added `useNetworkStatus()` import and hook usage
2. Added `useOfflineAppointments()` import and hook usage
3. Updated query configuration with offline-aware settings:
   - `refetchInterval: isOnline ? 5000 : false`
   - `refetchOnWindowFocus: isOnline`
   - `retry: isOnline ? 3 : false`
4. Added early return in month range query when offline
5. Updated `createAppointmentMutation` to use IndexedDB when offline
6. Enhanced success toast messages for offline mode

**Lines Changed:** ~30 lines across 4 sections

## Testing Checklist

### Online Mode ✅

- [x] Appointments load normally
- [x] Auto-refresh every 5 seconds
- [x] Create appointment calls API
- [x] Calendar dots show on month view

### Offline Mode ✅

- [x] No 503 errors in console
- [x] No continuous retries
- [x] Calendar stops refetching
- [x] Create appointment saves to IndexedDB
- [x] "Saved offline" toast shown
- [x] Appointment added to sync queue

### Network Switching ✅

- [x] Going offline stops queries immediately
- [x] Going online resumes queries
- [x] Pending appointments sync automatically

## Benefits Achieved

1. **Better Performance**: No wasted network requests when offline
2. **Improved UX**: Clear feedback about offline state
3. **Data Preservation**: Appointments saved locally, not lost
4. **Automatic Sync**: Changes sync when connection restored
5. **Cleaner Console**: No more 503 error spam

## Related Components

This fix follows the same pattern as:

- `/src/app/(main)/admin/appointments/page.tsx` - Main appointments page
- `/src/hooks/use-appointments.ts` - Hybrid appointments hook
- `/src/hooks/offline/appointments/use-offline-appointments.ts` - Offline storage

## Next Steps (Optional)

1. **Extend to Other Calendars**: Apply same pattern to other calendar views
2. **Offline Indicator**: Show offline badge on calendar header
3. **Sync Status**: Display pending sync count on calendar
4. **Conflict Resolution**: Handle conflicts when syncing offline changes

---

**Result**: Calendar now gracefully handles offline state without excessive API calls or error spam.
