# Permission Caching Debug Guide

## Issue

Permissions tab showing no roles even though user is SUPER_ADMIN.

## Step-by-Step Debugging

### Step 1: Clear Existing Databases

Open browser console and run:

```javascript
indexedDB.databases().then((dbs) => {
  dbs.forEach((db) => {
    if (db.name.startsWith("SmartDMV_Tenant_")) {
      indexedDB.deleteDatabase(db.name);
      console.log("Deleted:", db.name);
    }
  });
});
```

### Step 2: Refresh and Login

1. Refresh the page
2. Login as SUPER_ADMIN user
3. **Watch the console carefully** for these logs:

#### Expected Login Flow Logs:

```
[useOfflineInit] Effect triggered, user: { id: "X", role: "SUPER_ADMIN" }
[useOfflineInit] Tenant: { name: "...", subdomain: "..." }
[useOfflineInit] ✅ Valid practice ID: 1 (type: number)
[useOfflineInit] 🚀 Starting initialization for user: X practice: 1

[StorageManager] 🔧 Initialize called with: { tenantId: "...", practiceId: 1, userId: ... }
[StorageManager] 🎯 Setting tenant context: { tenantId: "...", practiceId: "1" }
[StorageManager] 📂 Initializing database for tenant: ...
[TenantDB] 📂 Opening database: SmartDMV_Tenant_...
[TenantDB] ✅ Successfully opened: SmartDMV_Tenant_... v1
[TenantDB] 🏥 Registering practice: 1 for tenant: ...
[TenantDB] ✅ Practice registered: 1 in tenant: ...

[useOfflineInit] ✅ Initialization complete

[useOfflineInit] 📋 Caching permissions for user: {
  userId: "X",
  role: "SUPER_ADMIN",
  roles: [],
  rolesLength: 0
}

[useOfflineInit] No assigned roles found, creating synthetic role from user.role: SUPER_ADMIN
[useOfflineInit] Created synthetic role: { name: "SUPER_ADMIN", ... }
[useOfflineInit] Saving permissions: {
  rolesCount: 1,
  roleNames: ['SUPER_ADMIN'],
  assignments: 1
}

[PermissionStorage] 📥 savePermissions called with: {
  userId: X,
  userIdType: "number",
  tenantId: "...",
  practiceId: 1,
  practiceIdType: "number",
  rolesCount: 1,
  roleNames: ['SUPER_ADMIN'],
  ...
}

[PermissionStorage] 📊 Extracted permissions: {
  allPermissionsCount: 65,  // (13 entities × 5 actions)
  effectiveResourcesCount: 13,
  effectiveResources: ['pets', 'appointments', 'clients', ...]
}

[PermissionStorage] 💾 About to save cache to IndexedDB: {
  cacheId: "perm_...",
  store: "permissions",
  rolesInCache: [{ name: 'SUPER_ADMIN', perms: 65 }]
}

[PermissionStorage] 🏢 Current tenant context: {
  tenantId: "...",
  practiceId: "1"
}

[PermissionStorage] ✅ Cached permissions for user X in store 'permissions'

[PermissionStorage] 🔍 Verification - Total caches in store: 1
[PermissionStorage] 🔍 Cache IDs: [{
  id: "perm_...",
  userId: X,
  tenantId: "...",
  roles: 1
}]

[useOfflineInit] ✅ User permissions cached to IndexedDB
```

### Step 3: Check IndexedDB

#### Option A: Run Debug Script

Open console and paste the contents of `/public/debug-permission-cache.js`

Expected output:

```
🔍 ========== PERMISSION CACHE DEBUG ==========
📂 Found 1 databases: ['SmartDMV_Tenant_smartvet']
✅ Found 1 tenant database(s): ['SmartDMV_Tenant_smartvet']

📊 ========== CHECKING: SmartDMV_Tenant_smartvet ==========
✅ Database opened - Version: 1
📋 Object stores (X): ['auth', 'sessions', 'permissions', 'cache', ...]
✅ 'permissions' store EXISTS

📊 Store details:
  - Key path: id
  - Auto increment: true
  - Index names: ['userId', 'tenantId', 'cachedAt']

📦 Permission records found: 1

✅ Permission records:

  Record 1:
    - ID: perm_...
    - User ID: 1 (type: number)
    - Tenant ID: smartvet
    - Practice ID: 1
    - Roles (1): ['SUPER_ADMIN']
    - Role Assignments: 1
    - All Permissions: 65
    - Effective Permissions: ['pets', 'appointments', ...]
    - Cached At: ...
    - Expires At: ...
    - Is Expired: false

    📋 Role Details:
      - SUPER_ADMIN (SUPER_ADMIN)
        Permissions: 65
        Sample: ['pets:create', 'pets:read', 'pets:update', ...]
```

#### Option B: Manual Check

1. Open DevTools → Application → IndexedDB
2. Expand `SmartDMV_Tenant_{subdomain}`
3. Click on `permissions` store
4. You should see 1 record with:
   - `userId`: your user ID (number)
   - `tenantId`: your subdomain (string)
   - `practiceId`: practice ID (number)
   - `roles`: Array with 1 object containing `name: "SUPER_ADMIN"`
   - `allPermissions`: Array with 65 permission objects
   - `effectivePermissions`: Object with 13 resources

### Step 4: Test Permissions Tab

1. Navigate to `/admin/offline-demo`
2. Click on "Permissions" tab
3. Click "Test Permissions" button

Expected results:

- ✅ Create Pet: **Allowed**
- ✅ Read Pet: **Allowed**
- ✅ Update Pet: **Allowed**
- ✅ Delete Pet: **Allowed**
- ✅ Administrator Role: **Yes**
- ✅ Current User → All Roles: "SUPER_ADMIN"

### Step 5: If Still Not Working

Check the permission retrieval logs:

```
[PermissionManager] 🔍 getUserRoles context: {
  userId: X,
  userIdType: "number",
  tenantId: "...",
  practiceId: 1
}

[PermissionStorage] 📋 getUserRoles called: { userId: X, tenantId: "..." }

[PermissionStorage] getPermissions called with: {
  userId: X,
  userIdType: "number",
  tenantId: "..."
}

[PermissionStorage] Found caches: {
  count: 1,
  cacheUserIds: [{ userId: X, type: "number", tenantId: "..." }]
}

[PermissionManager] 📋 getUserRoles result: {
  rolesCount: 1,
  roleNames: ['SUPER_ADMIN']
}
```

## Common Issues

### Issue 1: No Permission Records Created

**Symptoms**:

- Console shows: `[PermissionStorage] 🔍 Verification - Total caches in store: 0`
- No records in IndexedDB permissions store

**Causes**:

1. Database not initialized before saving
2. Tenant context not set
3. Error during save (check for red error logs)

**Solution**:

- Check for errors in console
- Verify `[StorageManager] ✅ Database initialized` appears before permission saving
- Verify `[PermissionStorage] 🏢 Current tenant context` shows correct tenant

### Issue 2: Records Created But Not Retrieved

**Symptoms**:

- IndexedDB shows permission record
- Console shows: `[PermissionStorage] Found caches: { count: 0 }`

**Causes**:

1. UserID type mismatch (string vs number)
2. TenantID mismatch
3. Querying wrong database

**Solution**:

- Check userId types match: `console.log(typeof userId, userId)`
- Check tenantId values match exactly
- Verify you're querying the same tenant database

### Issue 3: Empty Roles Array

**Symptoms**:

- Record exists with `roles: []`
- Console shows: `[useOfflineInit] roles: [], rolesLength: 0`

**Causes**:

1. User has no entries in `user_roles` table
2. Synthetic role creation failed
3. `user.role` is undefined

**Solution**:

- Check `user.role` value in console
- Verify synthetic role creation log appears
- Check for errors in `getSyntheticPermissionsForRole()`

### Issue 4: Expired Cache

**Symptoms**:

- Record exists but shows `isExpired: true`

**Solution**:

- Clear and re-login (caches expire after 24 hours)

## Success Checklist

- [ ] Database created: `SmartDMV_Tenant_{subdomain}`
- [ ] `permissions` store exists with indexes
- [ ] Permission record saved with userId, tenantId, practiceId
- [ ] Roles array contains `{ name: "SUPER_ADMIN", permissions: [...] }`
- [ ] `allPermissions` array has 65 items
- [ ] `effectivePermissions` object has 13 keys
- [ ] Record not expired (`expiresAt > Date.now()`)
- [ ] getUserRoles returns 1 role
- [ ] hasRole('SUPER_ADMIN') returns true
- [ ] Permissions tab shows "Allowed" for all actions

## Quick Test Commands

Run these in browser console after login:

```javascript
// 1. Check if database exists
indexedDB.databases().then((dbs) => console.log(dbs.map((d) => d.name)));

// 2. Check current tenant context
const { indexedDBManager } = await import("/src/lib/offline/db/index.ts");
console.log(indexedDBManager.getCurrentTenant());

// 3. Get all permission caches
const caches = await indexedDBManager.getAll("permissions");
console.log("Permission caches:", caches);

// 4. Test permission check
const { permissionManager } = await import(
  "/src/lib/offline/managers/permission-manager.ts"
);
const roles = await permissionManager.getUserRoles();
console.log("User roles:", roles);

// 5. Check specific permission
const canCreate = await permissionManager.canCreate("pets");
console.log("Can create pets:", canCreate);
```

## Next Steps

If you've followed all steps and permissions still don't show:

1. Share the console logs (all `[useOfflineInit]` and `[PermissionStorage]` logs)
2. Share the output from debug script
3. Share screenshot of IndexedDB permissions store
4. Check browser console for any red errors
