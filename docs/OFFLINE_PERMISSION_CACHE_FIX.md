# Offline Permission Cache Fix - November 3, 2025

## Issue

Permissions tab showing "Denied" for all actions even though user is logged in as SUPER_ADMIN. Role information not displaying correctly in offline mode.

## Root Cause Analysis

1. **Missing Role Assignment Data**: Users without entries in `user_roles` table had empty `roles` array
2. **No Fallback to user.role**: System wasn't falling back to the primary `user.role` field (SUPER_ADMIN, ADMINISTRATOR, etc.)
3. **Empty Permissions Cache**: When `user.roles` was empty, permissions cache was created with no roles or permissions

## Solution

### 1. Synthetic Role Generation

Added fallback logic in `use-offline-initialization.ts` to create synthetic roles when `user.roles` is empty:

```typescript
function getSyntheticPermissionsForRole(role: string): any[] {
  const allPermissions = ["create", "read", "update", "delete", "manage"];
  const entities = [
    "pets",
    "appointments",
    "clients",
    "invoices",
    "inventory",
    "prescriptions",
    "medicalRecords",
    "vaccinations",
    "practitioners",
    "users",
    "roles",
    "practices",
    "settings",
  ];

  switch (role) {
    case "SUPER_ADMIN":
      // Super admin has all permissions on all entities
      return entities.flatMap((entity) =>
        allPermissions.map((action) => ({
          resource: entity,
          action: action,
          granted: true,
        }))
      );

    case "ADMINISTRATOR":
    // Admin has most permissions except system-wide settings
    // ...

    // ... other roles
  }
}
```

### 2. Enhanced Permission Caching

Modified the permission caching logic in `use-offline-initialization.ts`:

```typescript
// Cache user permissions
try {
  console.log('[useOfflineInit] 📋 Caching permissions for user:', {
    userId: user.id,
    role: user.role,
    roles: (user as any).roles,
    rolesLength: (user as any).roles?.length || 0,
  });

  // Get roles from user object
  let roles = (user as any).roles || [];

  // If no assigned roles, create a synthetic role from user.role
  if (!roles || roles.length === 0) {
    console.log('[useOfflineInit] No assigned roles found, creating synthetic role from user.role:', user.role);

    // Create a synthetic role based on the user's primary role
    const syntheticRole = {
      id: -1, // Synthetic ID
      name: user.role,
      displayName: user.role,
      description: `Primary role: ${user.role}`,
      isSystemDefined: true,
      isCustom: false,
      practiceId: undefined,
      permissions: getSyntheticPermissionsForRole(user.role),
    };

    roles = [syntheticRole];
    console.log('[useOfflineInit] Created synthetic role:', syntheticRole);
  }

  // ... save permissions
}
```

### 3. Role Name Checking

The permission system now checks roles by name:

- `SUPER_ADMIN` - Full system access
- `ADMINISTRATOR` - Most operational permissions
- `PRACTICE_ADMINISTRATOR` - Practice-level management
- `VETERINARIAN` - Clinical operations
- `PRACTICE_MANAGER` - Practice operations

## Data Flow

### Login → Permission Caching

```
1. User logs in
   ↓
2. /api/auth/me returns user object
   - user.role: 'SUPER_ADMIN' (primary role from users table)
   - user.roles: [] (from user_roles table - may be empty)
   ↓
3. use-offline-initialization.ts
   - Checks user.roles array
   - If empty: Creates synthetic role from user.role
   - If populated: Uses roles from user_roles table
   ↓
4. Saves to IndexedDB (permissions store)
   - roles: [{ name: 'SUPER_ADMIN', permissions: [...] }]
   - effectivePermissions: { pets: { create: true, read: true, ... }, ... }
   ↓
5. Permission checks work offline
```

### Permission Check Flow

```
useOfflinePermissions.hasRole('SUPER_ADMIN')
  ↓
permissionManager.hasRole('SUPER_ADMIN')
  ↓
permissionManager.getUserRoles()
  ↓
permissionStorage.getUserRoles(userId, tenantId)
  ↓
Gets from IndexedDB permissions store
  ↓
Returns: [{ name: 'SUPER_ADMIN', ... }]
  ↓
Checks: roles.some(r => r.name === 'SUPER_ADMIN')
  ↓
Returns: true
```

## Synthetic Permission Structure

For SUPER_ADMIN:

```typescript
{
  id: -1,
  name: 'SUPER_ADMIN',
  displayName: 'SUPER_ADMIN',
  description: 'Primary role: SUPER_ADMIN',
  isSystemDefined: true,
  isCustom: false,
  practiceId: undefined,
  permissions: [
    { resource: 'pets', action: 'create', granted: true },
    { resource: 'pets', action: 'read', granted: true },
    { resource: 'pets', action: 'update', granted: true },
    { resource: 'pets', action: 'delete', granted: true },
    { resource: 'pets', action: 'manage', granted: true },
    // ... repeated for all entities
  ]
}
```

## Files Modified

1. **src/hooks/use-offline-initialization.ts**
   - Added `getSyntheticPermissionsForRole()` function
   - Enhanced permission caching logic
   - Added fallback for empty user.roles

## Testing

### 1. Check Console Logs

After login, you should see:

```
[useOfflineInit] 📋 Caching permissions for user: {
  userId: "1",
  role: "SUPER_ADMIN",
  roles: [],
  rolesLength: 0
}
[useOfflineInit] No assigned roles found, creating synthetic role from user.role: SUPER_ADMIN
[useOfflineInit] Created synthetic role: { name: 'SUPER_ADMIN', ... }
[useOfflineInit] Saving permissions: {
  rolesCount: 1,
  roleNames: ['SUPER_ADMIN'],
  assignments: 1
}
[useOfflineInit] ✅ User permissions cached to IndexedDB
```

### 2. Check IndexedDB

**DevTools → Application → IndexedDB → SmartDMV*Tenant*{subdomain} → permissions**

Should see:

- `id`: temp ID
- `userId`: your user ID
- `tenantId`: subdomain
- `practiceId`: practice ID
- `roles`: Array with one item: `{ name: 'SUPER_ADMIN', permissions: [...] }`
- `effectivePermissions`: Object with all entity permissions

### 3. Test Permissions Tab

Navigate to `/admin/offline-demo` → Permissions tab → Click "Test Permissions"

Should show:

- ✅ All actions "Allowed" (create, read, update, delete pets)
- ✅ "Administrator" role check: Yes
- ✅ Current User → All Roles: "SUPER_ADMIN"

## Integration with RBAC

### user_roles Table (Optional)

If user has entries in `user_roles` table:

```sql
SELECT ur.*, r.name, r.permissions
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = ? AND ur.is_active = true
```

System will use these roles directly.

### users Table (Fallback)

If `user_roles` is empty:

```sql
SELECT role FROM users WHERE id = ?
```

System creates synthetic role from this field.

## Role Hierarchy

Permission levels (highest to lowest):

1. **SUPER_ADMIN** - Full system access

   - All CRUD on all entities
   - System settings
   - Practice management

2. **ADMINISTRATOR** - System-wide operations

   - All CRUD except system settings
   - Multi-practice access

3. **PRACTICE_ADMINISTRATOR** - Practice management

   - All CRUD within practice
   - User management (limited)

4. **VETERINARIAN** - Clinical operations

   - Create, read, update, delete clinical entities
   - No administrative functions

5. **PRACTICE_MANAGER** - Practice operations

   - Create, read, update, delete operational entities
   - No clinical or administrative functions

6. **Other Roles** - Limited access
   - Read-only permissions

## Benefits

1. **Works with or without user_roles entries** - Falls back to user.role field
2. **Offline-first** - Permissions cached at login, available offline
3. **Consistent checking** - Same role names used in online and offline mode
4. **Extensible** - Easy to add new roles or modify permissions
5. **Debug-friendly** - Detailed console logging

## Migration Path

For users currently without `user_roles` entries:

1. **Immediate** - System works with synthetic roles from user.role
2. **Gradual** - Populate user_roles table over time
3. **Transparent** - No user-facing changes required

## Future Enhancements

1. **Dynamic sync** - Refresh permissions from server periodically
2. **Granular overrides** - Per-user permission overrides
3. **Time-based permissions** - Expiring access grants
4. **Audit logging** - Track permission checks

## Related Files

- `src/hooks/use-offline-initialization.ts` - Permission caching
- `src/lib/offline/storage/permission-storage.ts` - Permission storage
- `src/lib/offline/managers/permission-manager.ts` - Permission checking
- `src/app/api/auth/me/route.ts` - User data API
- `src/lib/rbac/dynamic-roles.ts` - Role fetching from DB
