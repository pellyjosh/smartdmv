# Fixing IndexedDB Version Conflicts

## Problem

You're seeing these errors:

```
Error: The operation failed because the stored database is a higher version than the version requested.
DatabaseError: Failed to get all pet
DatabaseError: Failed to initialize storage manager
Error: No tenant context set. Call setCurrentTenant() first or pass tenantId parameter.
```

## Root Cause

The browser has cached an IndexedDB database with a higher version number than what the code is trying to open. This happens when:

1. Database schema changes during development
2. Multiple practice registrations increment the version
3. Browser caches the database across code changes

## Solution

You need to **clear all IndexedDB databases** and start fresh.

### Option 1: Quick Fix (Browser DevTools)

1. **Open Chrome/Edge DevTools** (F12 or right-click → Inspect)
2. **Go to Application tab** → Storage → IndexedDB
3. **Delete all `SmartDMV_Tenant_*` databases**:
   - Right-click each database → Delete
   - Refresh the list to ensure they're gone
4. **Refresh the page** (Cmd/Ctrl + R)

### Option 2: Console Script (Recommended)

1. **Open Browser Console** (F12 → Console tab)
2. **Paste and run this script**:

```javascript
// Clear all SmartDMV IndexedDB databases
indexedDB.databases().then((databases) => {
  const smartDMVDbs = databases.filter(
    (db) => db.name && db.name.startsWith("SmartDMV_Tenant")
  );
  console.log("Found " + smartDMVDbs.length + " SmartDMV databases");
  smartDMVDbs.forEach((db) => {
    console.log("Deleting: " + db.name + " (v" + db.version + ")");
    indexedDB.deleteDatabase(db.name);
  });
  console.log("✅ All SmartDMV databases cleared. Refresh the page.");
});
```

3. **Refresh the page** after seeing the success message

### Option 3: Use Cleanup Utility (In Code)

If you need to programmatically reset databases:

```typescript
import { deleteAllDatabases, listAllDatabases } from "@/lib/offline";

// List all databases first
const databases = await listAllDatabases();
console.log("Databases:", databases);

// Delete all SmartDMV databases
await deleteAllDatabases();

// Or delete specific tenant
import { deleteTenantDatabase } from "@/lib/offline";
await deleteTenantDatabase("smartvet");
```

## After Clearing Databases

Once databases are cleared:

1. **Refresh the page** - The application will:

   - Detect user login via `useOfflineInitialization()` hook
   - Call `setCurrentTenant(tenantId, practiceId)`
   - Create fresh database: `SmartDMV_Tenant_smartvet`
   - Create practice stores: `practice_1_pets`, `practice_1_appointments`, etc.

2. **Check console logs** - You should see:

   ```
   [useOfflineInit] Initializing offline system for user: <userId>
   [StorageManager] Initializing with: { tenantId: 'smartvet', practiceId: '1', userId: ... }
   [TenantDB] Opening database: SmartDMV_Tenant_smartvet
   [TenantDB] Successfully opened: SmartDMV_Tenant_smartvet v1
   [StorageManager] Initialized successfully
   ```

3. **Verify in DevTools** - Application → IndexedDB:
   - `SmartDMV_Tenant_smartvet` should exist
   - Should contain stores: `practice_1_pets`, `practice_1_appointments`, etc.
   - Check a store to see it has the correct indexes

## Prevention

To avoid version conflicts in the future:

1. **During development**: Clear IndexedDB when switching branches or making schema changes
2. **Use the cleanup utility**: Add a dev-only button to call `deleteAllDatabases()`
3. **Version management**: The new architecture handles versions dynamically, so this should be rare

## Troubleshooting

### Still seeing "No tenant context set" error?

Check if the `useOfflineInitialization()` hook is running:

```typescript
// In (main)/layout.tsx
import { useOfflineInitialization } from "@/hooks/use-offline-initialization";

export default function MainLayout({ children }) {
  useOfflineInitialization(); // ← This must be called
  // ...
}
```

### Database not creating stores?

The `registerPractice()` method should run automatically. Check:

1. User object has `practiceId` property
2. Console shows: `[TenantDB] Creating X stores for practice: Y`
3. No errors during upgrade process

### Multiple practice stores not appearing?

If you switch practices, new stores should be created automatically:

```typescript
import { switchOfflinePractice } from "@/lib/offline";
await switchOfflinePractice("smartvet", "2"); // Switch to practice 2
```

## Developer Tools

### Add a Reset Button (Development Only)

```typescript
// components/DevTools.tsx
import { deleteAllDatabases } from "@/lib/offline";

export function DevTools() {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <button
      onClick={async () => {
        if (confirm("Clear all offline databases and reload?")) {
          await deleteAllDatabases();
          window.location.reload();
        }
      }}
      className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2"
    >
      🗑️ Reset IndexedDB
    </button>
  );
}
```

### Console Helpers

Add these to your browser console for quick debugging:

```javascript
// List all databases
indexedDB.databases().then(console.log);

// Check current version
indexedDB.open("SmartDMV_Tenant_smartvet").onsuccess = (e) => {
  const db = e.target.result;
  console.log("Version:", db.version);
  console.log("Stores:", Array.from(db.objectStoreNames));
  db.close();
};

// Force delete specific database
indexedDB.deleteDatabase("SmartDMV_Tenant_smartvet");
```

## Summary

**Quick Fix**: Open DevTools → Application → IndexedDB → Delete all `SmartDMV_*` databases → Refresh page

The new tenant isolation architecture will automatically recreate databases with the correct structure when you log in.
