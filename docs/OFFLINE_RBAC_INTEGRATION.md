# Offline RBAC Integration

## Problem

SUPER_ADMIN users were seeing "Denied" for all permissions in offline mode, despite having full access when online. The offline permission system wasn't respecting the RBAC system's special handling for SUPER_ADMIN roles.

## Root Cause

The offline permission caching system was saving role data but not properly evaluating RBAC permissions:

1. **auth-cache.ts**: Was saving user roles but not building proper `effectivePermissions` based on RBAC logic
2. **permission-storage.ts**: `buildEffectivePermissions()` only looked at role.permissions arrays, missing SUPER_ADMIN special handling
3. **No RBAC Integration**: Offline system never called the RBAC `checkPermission` function that has SUPER_ADMIN shortcuts

## Solution

### 1. Enhanced Permission Caching (auth-cache.ts)

During login, the system now:

```typescript
// Detect SUPER_ADMIN role
const isSuperAdmin = userRoles.some((r: any) => r.name === 'SUPER_ADMIN');

if (isSuperAdmin) {
  // Grant all permissions for all resources
  const resources = ['pet', 'appointment', 'client', 'user', 'invoice', ...];
  resources.forEach(resource => {
    effectivePermissions[resource] = {
      create: true,
      read: true,
      update: true,
      delete: true,
    };
  });
} else {
  // Build permissions from role arrays for non-SUPER_ADMIN users
  userRoles.forEach((role: any) => {
    role.permissions.forEach((perm: any) => {
      if (perm.granted !== false) {
        effectivePermissions[perm.resource][perm.action] = true;
      }
    });
  });
}
```

**Key Changes:**

- Explicitly checks for SUPER_ADMIN role name
- Grants all CRUD permissions for all resources to SUPER_ADMIN
- Properly builds effectivePermissions object that's cached in IndexedDB
- Falls back to primary role check if user.roles is not available

### 2. Enhanced Permission Checking (permission-storage.ts)

Added double-check for SUPER_ADMIN in the `hasPermission` function:

```typescript
export async function hasPermission(
  userId: number,
  tenantId: string,
  resource: string,
  action: "create" | "read" | "update" | "delete"
): Promise<boolean> {
  const cache = await getPermissions(userId, tenantId);

  // Check if user is SUPER_ADMIN (safety check)
  const isSuperAdmin = cache.roles?.some((r) => r.name === "SUPER_ADMIN");
  if (isSuperAdmin) {
    return true; // Always allow for SUPER_ADMIN
  }

  // Check effectivePermissions
  const resourcePerms = cache.effectivePermissions[resource];
  return resourcePerms?.[action] || false;
}
```

**Benefits:**

- Provides safety net if effectivePermissions weren't built correctly
- Respects RBAC system's SUPER_ADMIN behavior
- Detailed logging for debugging

### 3. Enhanced Logging (permission-manager.ts)

Added detailed logging to track permission checks:

```typescript
console.log("[PermissionManager] checkPermission:", {
  resource: request.resource,
  action: request.action,
  hasPermission,
  userId: request.userId,
  tenantId: request.tenantId,
});
```

## Testing

To verify the fix works:

1. **Login as SUPER_ADMIN** while online
2. **Go to /admin/offline-demo**
3. **Check Permissions tab** - Should show "Allowed" for all actions
4. **Go offline** (DevTools Network → Offline)
5. **Refresh the page**
6. **Verify permissions still show "Allowed"**

Expected console output when checking permissions:

```
[PermissionStorage] SUPER_ADMIN detected - granting permission
[PermissionManager] checkPermission: { resource: 'pet', action: 'create', hasPermission: true }
```

## Architecture Flow

### Online (During Login)

```
User Login
  ↓
authActions.signInWithCredentials()
  ↓
cacheAuthForOffline()
  ↓
Check if SUPER_ADMIN → Grant all permissions
  ↓
Save to IndexedDB effectivePermissions
```

### Offline (Permission Check)

```
Component calls useOfflinePermissions()
  ↓
permissionManager.checkPermission()
  ↓
permissionStorage.hasPermission()
  ↓
Check SUPER_ADMIN role → Return true
  ↓
OR check effectivePermissions[resource][action]
```

## Key Files Modified

1. **src/lib/auth-cache.ts** (lines 141-230)

   - Enhanced permission caching with SUPER_ADMIN detection
   - Builds complete effectivePermissions object
   - Fallback for primary role

2. **src/lib/offline/storage/permission-storage.ts** (lines 152-185)

   - Added SUPER_ADMIN safety check in hasPermission
   - Enhanced logging for debugging
   - More detailed permission checks

3. **src/lib/offline/managers/permission-manager.ts** (lines 73-114)
   - Added detailed logging for permission checks
   - Better error reporting

## RBAC System Integration

The offline system now mirrors the RBAC system's behavior:

**Online RBAC (src/lib/rbac/utils.ts:69-70)**

```typescript
if (assignedRolesFromApi.some((r) => r.name === "SUPER_ADMIN")) {
  return { allowed: true };
}
```

**Offline System (src/lib/auth-cache.ts)**

```typescript
const isSuperAdmin = userRoles.some((r: any) => r.name === "SUPER_ADMIN");
if (isSuperAdmin) {
  // Grant all permissions
}
```

Both systems now use the same logic for SUPER_ADMIN detection and permission granting.

## Resources Covered

All standard resources receive full CRUD permissions for SUPER_ADMIN:

- pet
- appointment
- client
- user
- invoice
- prescription
- labResult
- medicalRecord
- vaccination
- inventory
- soapNote

## Future Enhancements

1. **Dynamic RBAC Evaluation**: During caching, call actual RBAC `checkPermission` for each resource/action instead of simple role array iteration
2. **Permission Sync**: Add background sync to update permissions when coming online
3. **Cache Invalidation**: Implement cache expiry and refresh mechanisms
4. **Audit Trail**: Track offline permission checks for security auditing
5. **Custom Resources**: Support for dynamically added resources beyond the standard set

## Related Documentation

- **RBAC_INTEGRATION.md**: Core RBAC system documentation
- **OFFLINE_SPRINT_1_COMPLETE.md**: Offline infrastructure overview
- **OFFLINE_AUTH_CACHING.md**: Authentication caching details
- **src/lib/rbac/utils.ts**: Online RBAC permission checking
