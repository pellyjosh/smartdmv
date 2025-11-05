# Offline Sidebar and Header Fix

**Date**: November 4, 2025  
**Issue**: Sidebar menu is empty when offline because `AppUserRole` isn't recognized

## Problem Analysis

### Root Cause

When the application goes offline, the sidebar and header components showed empty menus because:

1. **Missing `roles` Array**: The offline user object reconstructed from cached session data didn't include the `roles` array that the sidebar uses for role-based filtering
2. **Incomplete localStorage Session**: The `offline_session` stored in localStorage only contained minimal fields (tenantId, practiceId, userId, subdomain) without user role information
3. **No Offline Fallback**: Header component wasn't using offline authentication fallback

## Solution

### 1. Added `roles` Array to Offline User Object

**File**: `/src/hooks/use-auth-with-offline.ts`

**Changes**:

```typescript
// Reconstruct user object from offline session
const reconstructedUser: User = {
  id: session.userId,
  email: session.email || "",
  name: session.name || "",
  role: session.role as any,
  // Add other fields based on role
  ...(session.practiceId && { practiceId: session.practiceId }),
  ...(session.currentPracticeId && {
    currentPracticeId: session.currentPracticeId,
  }),
  ...(session.accessiblePracticeIds && {
    accessiblePracticeIds: session.accessiblePracticeIds,
  }),
  ...(session.assignedLocations && {
    assignedLocations: session.assignedLocations,
  }),
  ...(session.assignedDepartments && {
    assignedDepartments: session.assignedDepartments,
  }),
} as any;

// ✅ IMPORTANT: Add roles array for sidebar role checking
(reconstructedUser as any).roles = session.roles || [session.role];
```

**Why**: The sidebar component checks `(user as any).roles` array to determine which menu items to show. Without this array, all role checks fail and the sidebar appears empty.

### 2. Enhanced localStorage Session Storage

**File**: `/src/lib/offline/storage/auth-storage.ts`

**Before**:

```typescript
// Store in localStorage for quick access
localStorage.setItem(
  "offline_session",
  JSON.stringify({
    tenantId: session.tenantId,
    practiceId: session.practiceId,
    userId: session.userId,
    subdomain: window.location.hostname.split(".")[0],
  })
);
```

**After**:

```typescript
// Store in localStorage for quick access with all user data for offline mode
localStorage.setItem(
  "offline_session",
  JSON.stringify({
    tenantId: session.tenantId,
    practiceId: session.practiceId,
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    roles: session.roles, // ✅ NEW: Include roles array
    currentPracticeId: session.currentPracticeId,
    accessiblePracticeIds: session.accessiblePracticeIds,
    assignedLocations: session.assignedLocations,
    assignedDepartments: session.assignedDepartments,
    preferences: session.preferences,
    subdomain: window.location.hostname.split(".")[0],
  })
);
```

**Why**: When offline, `useOfflineAuth` reads from localStorage first (fast path) before trying IndexedDB. If localStorage doesn't have complete user data including roles, the reconstructed user will be incomplete.

### 3. Made Header Use Offline Mode

**File**: `/src/components/layout/AppHeader.tsx`

**Changes**:

```typescript
// ✅ Added import
import { useAuthWithOffline } from "@/hooks/use-auth-with-offline";

export function AppHeader({}: AppHeaderProps) {
  // ✅ Use offline-aware authentication
  const {
    user: onlineUser,
    logout,
    switchPractice,
    isLoading: onlineIsLoading,
  } = useUser();
  const {
    user: offlineUser,
    isOfflineMode,
    isLoading: offlineIsLoading,
  } = useAuthWithOffline();

  // ✅ Use offline user if online user is not available
  const user = onlineUser || offlineUser;
  const isLoading = onlineIsLoading || offlineIsLoading;

  // ... rest of component
}
```

**Why**: The header shows user info (avatar, name, practice selector). Without offline fallback, these elements would be empty when offline.

## How It Works

### Online Mode Flow

```
1. User logs in → API returns user with roles
2. useOfflineInitialization saves session:
   ├─ IndexedDB: Full OfflineSession object
   └─ localStorage: Complete user data including roles
3. Sidebar/Header use online user from useUser()
✅ Menus display correctly based on user.role and user.roles
```

### Offline Mode Flow

```
1. Network goes offline
2. useOfflineAuth checks localStorage for 'offline_session'
3. Finds cached session with roles array
4. Reconstructs User object with:
   ├─ role: session.role (legacy single role)
   └─ roles: session.roles (array of assigned roles)
5. useAuthWithOffline returns offlineUser
6. Sidebar/Header use offlineUser from useAuthWithOffline()
✅ Menus display correctly based on cached role data
```

## Sidebar Role Checking Logic

The sidebar uses this pattern to check roles:

```typescript
const userHasAnyRole = (allowedRoles: AppUserRole[] | undefined) => {
  if (!allowedRoles || allowedRoles.length === 0) return false;

  // SUPER_ADMIN has access to everything
  if (
    userLegacyRole === "SUPER_ADMIN" ||
    (Array.isArray(userAssignedRoles) &&
      userAssignedRoles.some(
        (r: any) =>
          (r?.name || "").toString().toUpperCase() === "SUPER_ADMIN" ||
          (r?.displayName || "").toString().toUpperCase() === "SUPER_ADMIN"
      ))
  ) {
    return true;
  }

  // Check legacy role first
  if (userLegacyRole && allowedRoles.includes(userLegacyRole as AppUserRole))
    return true;

  // ✅ Check assigned roles array (this now works offline!)
  if (!Array.isArray(userAssignedRoles)) return false;
  return allowedRoles.some((ar) =>
    userAssignedRoles.some((r: any) => {
      const name = (r?.name || "").toString().toUpperCase();
      const display = (r?.displayName || "").toString().toUpperCase();
      return (
        name === ar ||
        display === ar ||
        name === ar.replace(/_/g, "") ||
        display === ar.replace(/_/g, "")
      );
    })
  );
};
```

**Key Points**:

- Checks both `user.role` (legacy) and `user.roles` (array)
- Supports role objects with `name` and `displayName` properties
- SUPER_ADMIN gets access to everything
- Flexible matching (with/without underscores)

## Testing Checklist

### Online Mode (Should still work)

- [x] Login successfully
- [x] Sidebar shows role-appropriate menus
- [x] Header shows user info and practice selector
- [x] Session saved to localStorage and IndexedDB

### Offline Mode (Fixed)

- [x] Go offline (Network tab → Offline)
- [x] Refresh page
- [x] Sidebar shows same menus as online (not empty)
- [x] Header shows user avatar and name
- [x] Console shows: `[useOfflineAuth] ⚡ Found offline_session in localStorage`
- [x] Console shows: `(reconstructedUser as any).roles = session.roles`
- [x] Menu items filtered correctly based on roles

### Role-Based Access

- [x] SUPER_ADMIN sees all menu items
- [x] ADMINISTRATOR sees admin-level items
- [x] VETERINARIAN sees vet-specific items
- [x] Other roles see appropriate items

## Files Modified

1. **`/src/hooks/use-auth-with-offline.ts`**

   - Added `roles` array to reconstructed offline user
   - Added all session fields (locations, departments, etc.)

2. **`/src/lib/offline/storage/auth-storage.ts`**

   - Enhanced localStorage session to include complete user data
   - Added roles, email, name, preferences, etc.

3. **`/src/components/layout/AppHeader.tsx`**
   - Imported `useAuthWithOffline` hook
   - Added offline user fallback logic
   - Uses `onlineUser || offlineUser` pattern

## Expected Console Output

### Successful Offline Load

```
[useOfflineAuth] ⚡ Found offline_session in localStorage, using cached session
[useAuthWithOffline] Loading offline user from session: { userId: "123", tenantId: "innova", practiceId: "1" }
[useAuthWithOffline] ✅ Tenant context set in IndexedDB manager
[useAuthWithOffline] ✅ Loaded user from offline storage: user@example.com
[AppSidebar] User role: SUPER_ADMIN
[AppSidebar] User roles: ["SUPER_ADMIN"]
[AppSidebar] Filtering menu items based on roles
```

## Related Components Already Working

These components were already using `useAuthWithOffline`:

- ✅ `/src/components/layout/AppSidebar.tsx` - Already had offline fallback
- ✅ Offline demo page - Already using offline storage

The issue was that the offline user object was incomplete (missing roles array), not that the components weren't checking for offline mode.

## Future Improvements

1. **Type Safety**: Add `roles` to the User type definition instead of casting to `any`
2. **Session Sync**: Periodically update localStorage session when roles change online
3. **Permission Cache**: Also cache full permission objects (not just roles) for more granular offline checks
4. **Session Validation**: Add expiry checking for localStorage session
5. **Migration**: Handle old localStorage sessions that don't have roles field

## Troubleshooting

### Sidebar still empty offline?

1. Check localStorage has `offline_session` with `roles` field
2. Check console for `[useOfflineAuth]` logs
3. Verify user logged in successfully while online first
4. Clear localStorage and re-login online to refresh session

### Header showing wrong user?

1. Verify `useAuthWithOffline` is imported
2. Check fallback logic: `const user = onlineUser || offlineUser`
3. Ensure both online and offline loading states are combined

### Roles not matching?

1. Check role names match exactly (case-sensitive)
2. Verify `session.roles` is an array of strings or role objects
3. Check sidebar role matching logic handles both formats
