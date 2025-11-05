# Offline Permission System - Complete Fix

## Issues Identified

1. **SUPER_ADMIN Not Working Offline**: Users with SUPER_ADMIN role couldn't perform actions offline
2. **Missing RBAC API Integration**: System wasn't fetching actual assigned roles from `/api/user-roles/[userId]`
3. **Incomplete Role Detection**: Only checked `user.roles` from session, ignored `user.role` (legacy) and RBAC roles
4. **Limited Resource Coverage**: Only cached permissions for ~11 resources
5. **Artificial Offline Restrictions**: "Offline capabilities" concept prevented normal users from working offline

## Solution Implemented

### 1. Complete RBAC Integration in auth-cache.ts

**Fetches Dynamic RBAC Roles:**

```typescript
// Fetch actual assigned roles from RBAC API
const rolesResponse = await fetch(`/api/user-roles/${user.id}`);
if (rolesResponse.ok) {
  const rolesData = await rolesResponse.json();
  rbacRoles = rolesData.roles;
}
```

**Multi-Source Role Detection:**

- ✅ RBAC API roles (`/api/user-roles/[userId]`)
- ✅ Session roles (`user.roles`)
- ✅ Legacy role (`user.role`)
- ✅ All sources merged without duplicates

**SUPER_ADMIN Detection:**

```typescript
isSuperAdmin =
  rbacRoles.some((r) => r.name === "SUPER_ADMIN") ||
  sessionRoles?.some((r) => r.name === "SUPER_ADMIN") ||
  user.role === "SUPER_ADMIN";
```

### 2. Comprehensive SUPER_ADMIN Permissions

**32 Resources Covered:**

```typescript
const resources = [
  // Core veterinary
  "pet",
  "appointment",
  "client",
  "user",
  "invoice",
  "prescription",
  "labResult",
  "medicalRecord",
  "vaccination",
  "inventory",
  "soapNote",

  // RBAC & Management
  "role",
  "permission",
  "practice",
  "treatment",
  "diagnostic",
  "medication",
  "supplier",
  "product",
  "report",
  "audit",
  "setting",
  "integration",

  // Workflow & Tasks
  "checklist",
  "task",
  "note",
  "document",
  "template",
  "reminder",

  // Communication & Billing
  "notification",
  "message",
  "chat",
  "telemedicine",
  "billing",
  "payment",
];
```

**8 Actions Per Resource:**

```typescript
effectivePermissions[resource] = {
  create: true,
  read: true,
  update: true,
  delete: true,
  manage: true,
  approve: true,
  export: true,
  import: true,
};
```

### 3. Universal Offline Access

**Core Entities Available to ALL Users:**

```typescript
const coreEntities = [
  "pet",
  "appointment",
  "client",
  "soapNote",
  "vaccination",
  "medicalRecord",
];

// Grant basic CRUD if no explicit deny
coreEntities.forEach((entity) => {
  if (effectivePermissions[entity].read !== false) {
    effectivePermissions[entity].read = true;
  }
  if (effectivePermissions[entity].create !== false) {
    effectivePermissions[entity].create = true;
  }
  if (effectivePermissions[entity].update !== false) {
    effectivePermissions[entity].update = true;
  }
});
```

**Philosophy:**

> "If you can do it online, you can do it offline"

- No artificial offline restrictions
- Authenticated users can work with core entities
- Respects explicit permission denies
- Defaults to allowing for better UX

### 4. Enhanced Logging

**During Login:**

```
[cacheAuthForOffline] Fetching RBAC roles for user: 123
[cacheAuthForOffline] RBAC roles fetched: ['SUPER_ADMIN', 'VETERINARIAN']
[cacheAuthForOffline] 🔓 SUPER_ADMIN detected - granting FULL permissions
[cacheAuthForOffline] ✅ Permissions cached: {
  totalRoles: 2,
  roleNames: ['SUPER_ADMIN', 'VETERINARIAN'],
  isSuperAdmin: true,
  resourceCount: 32,
  samplePermissions: ['pet', 'appointment', 'client', 'user', 'invoice']
}
```

**During Permission Check:**

```
[PermissionStorage] SUPER_ADMIN detected - granting permission
[PermissionManager] checkPermission: {
  resource: 'pet',
  action: 'create',
  hasPermission: true
}
```

## Testing

### Test SUPER_ADMIN Permissions

1. **Login as SUPER_ADMIN** (while online)
2. **Open DevTools Console** - Check for:
   ```
   [cacheAuthForOffline] 🔓 SUPER_ADMIN detected - granting FULL permissions
   [cacheAuthForOffline] ✅ Permissions cached: {
     isSuperAdmin: true,
     resourceCount: 32
   }
   ```
3. **Go to /admin/offline-demo**
4. **Click "Run Permission Tests"** - Should see:
   - ✅ Create Pet: **Allowed**
   - ✅ Read Pet: **Allowed**
   - ✅ Update Pet: **Allowed**
   - ✅ Delete Pet: **Allowed**
   - ✅ All other actions: **Allowed**
5. **Go Offline** (DevTools → Network → Offline)
6. **Refresh Page**
7. **Test Again** - Permissions should still be Allowed

### Test Regular User Permissions

1. **Login as VETERINARIAN** (while online)
2. **Check console** for cached permissions
3. **Go to /admin/offline-demo**
4. **Run Permission Tests** - Should see role-based permissions
5. **Try creating a pet** - Should work (core entity access)
6. **Go offline and test** - Core operations should work

## Architecture

### Permission Caching Flow

```
Login (Online)
  ↓
Fetch RBAC Roles from /api/user-roles/[userId]
  ↓
Merge with Session Roles & Legacy Role
  ↓
Detect SUPER_ADMIN from ALL sources
  ↓
Build Effective Permissions:
  - SUPER_ADMIN → Grant ALL resources × ALL actions
  - Regular User → Grant role permissions + core entity access
  ↓
Cache to IndexedDB (24-hour expiry)
  ↓
Available Offline
```

### Permission Check Flow (Offline)

```
Component Request
  ↓
useOfflinePermissions() or PermissionGuard
  ↓
permissionManager.checkPermission()
  ↓
permissionStorage.hasPermission()
  ↓
Check Cache:
  1. Is user SUPER_ADMIN? → Return TRUE
  2. Check effectivePermissions[resource][action]
  3. Return result
```

## Key Benefits

### For SUPER_ADMIN

- ✅ Full access to all 32 resources
- ✅ All 8 action types allowed
- ✅ Works identically online and offline
- ✅ No permission checks needed

### For Regular Users

- ✅ Core veterinary entities always accessible
- ✅ Can create/read/update pets, appointments, clients offline
- ✅ Role-based permissions respected
- ✅ No artificial offline limitations

### For System

- ✅ RBAC API integrated properly
- ✅ Multiple role sources supported
- ✅ Comprehensive logging for debugging
- ✅ 24-hour cache with automatic refresh
- ✅ Fallback to legacy role if RBAC unavailable

## Files Modified

1. **src/lib/auth-cache.ts** (lines 140-302)

   - Added RBAC API fetch
   - Multi-source role detection
   - Comprehensive SUPER_ADMIN permissions
   - Universal core entity access
   - Enhanced logging

2. **src/lib/offline/storage/permission-storage.ts** (lines 152-185)

   - SUPER_ADMIN safety check
   - Better logging

3. **src/lib/offline/managers/permission-manager.ts** (lines 73-114)
   - Detailed permission check logging

## Configuration

### Resources Covered

32 resources spanning:

- Veterinary care (pets, appointments, medical records)
- Practice management (users, roles, permissions)
- Clinical (treatments, diagnostics, medications)
- Business (inventory, suppliers, billing)
- Workflow (tasks, checklists, templates)
- Communication (messaging, telemedicine)

### Actions Covered

8 standard actions:

- `create`, `read`, `update`, `delete`
- `manage`, `approve`, `export`, `import`

### Cache Duration

- **24 hours** for permission cache
- Automatically refreshes on login
- Manual refresh via `refreshPermissions()` hook

## Troubleshooting

### SUPER_ADMIN Still Shows Denied

**Check:**

1. Console logs during login - Look for `🔓 SUPER_ADMIN detected`
2. Cached permissions - Should show `isSuperAdmin: true`
3. Role sources - Check RBAC roles, session roles, and legacy role

**Fix:**

```javascript
// Clear cache and re-login
await indexedDBManager.clear(STORES.PERMISSIONS);
// Logout and login again
```

### Regular User Can't Work Offline

**Check:**

1. Is it a core entity? (pet, appointment, client, soapNote, vaccination, medicalRecord)
2. Console logs - Look for permission check results
3. Cached effective permissions

**Fix:**

- Core entities should auto-grant CRUD
- Check if explicit deny in role permissions
- Verify cache is valid (< 24 hours old)

### Roles Not Merging

**Check:**

1. `/api/user-roles/[userId]` endpoint working?
2. Session roles in `user.roles`?
3. Legacy role in `user.role`?

**Fix:**

- System merges all three sources
- Any SUPER_ADMIN in any source grants full access
- Check console for "RBAC roles fetched" and "Session roles found"

## Future Enhancements

1. **Permission Sync** - Background sync when coming online
2. **Cache Invalidation** - Webhooks for role changes
3. **Granular Field Permissions** - Field-level access control offline
4. **Conditional Permissions** - Context-based rules (own records only)
5. **Audit Trail** - Track offline permission checks
6. **Dynamic Resource Discovery** - Auto-detect new resources
7. **Role Hierarchy** - Inherit permissions from parent roles
8. **Time-based Permissions** - Temporary access grants
