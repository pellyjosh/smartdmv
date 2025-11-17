# Temporary ID Update Handling

## Problem Statement

When creating records offline with temporary IDs (e.g., `#temp_1762961725737_vymfno7f1`), subsequent updates to those records were being queued as UPDATE operations. This caused issues because:

1. **Temp IDs indicate non-existent server records**: A temp ID means the record doesn't exist on the server yet
2. **Updates should be CREATE operations**: If the record isn't on the server, it needs to be created, not updated
3. **Server returns permanent IDs**: After syncing a CREATE, the server returns the real ID which replaces the temp ID locally

## Solution

Modified `queueOperation()` in `/src/lib/offline/storage/sync-queue-storage.ts` to intelligently handle updates to temp IDs:

### Temp ID Update Logic

When queueing an UPDATE operation on a temp ID:

1. **Check for existing CREATE**: Look for a pending CREATE operation for the same entity
2. **If CREATE exists**:

   - Merge the update data into the existing CREATE operation
   - Update the timestamp to reflect latest change
   - Return the existing CREATE operation ID
   - **Result**: Single CREATE operation with merged data

3. **If no CREATE exists**:
   - Convert the UPDATE operation to a CREATE operation
   - Queue as CREATE with the update data
   - **Result**: New CREATE operation

### Code Implementation

```typescript
// TEMP ID HANDLING: If updating a temp ID, it should remain a CREATE
let finalOperation = operation.operation;
let finalData = operation.data;

if (operation.operation === "update" && isTempId(operation.entityId)) {
  console.log(
    `[SyncQueue] ⚠️ Detected UPDATE on temp ID ${operation.entityId} - checking for existing CREATE`
  );

  // Check if there's already a CREATE operation for this temp ID
  const existingOperations = await getOperationsByEntity(
    operation.entityType,
    operation.entityId,
    context.tenantId
  );

  const existingCreate = existingOperations.find(
    (op) => op.operation === "create" && op.status === "pending"
  );

  if (existingCreate) {
    // Merge updates into existing CREATE operation
    const mergedData = {
      ...existingCreate.data,
      ...operation.data, // Updates override existing data
    };

    // Update the existing CREATE operation with merged data
    if (existingCreate.id) {
      // Update operation in IndexedDB...
      return existingCreate.id;
    }
  } else {
    // No existing CREATE found - convert UPDATE to CREATE
    finalOperation = "create";
  }
}
```

## Benefits

### 1. **Correct Operation Type**

- Temp ID records always sync as CREATE, never UPDATE
- Server receives CREATE requests for new records
- No 404 errors from trying to UPDATE non-existent records

### 2. **Data Consolidation**

- Multiple edits to a temp ID record result in a single CREATE operation
- Reduces sync queue size and network requests
- Preserves all user changes in final CREATE

### 3. **Proper ID Mapping**

- Server creates record and returns permanent ID
- Sync engine maps temp ID → real ID
- All references to temp ID are updated automatically

## Example Workflow

### Scenario: Create Client Offline, Then Edit Multiple Times

```typescript
// 1. User creates client offline
const tempId = "temp_1762961725737_vymfno7f1";
createClient({
  name: "John Doe",
  email: "john@example.com",
});
// Queue: CREATE temp_1762961725737_vymfno7f1 with { name: "John Doe", email: "john@example.com" }

// 2. User edits client name (still offline)
updateClient(tempId, {
  name: "John Smith",
});
// Queue: Same CREATE, merged to { name: "John Smith", email: "john@example.com" }

// 3. User edits client phone (still offline)
updateClient(tempId, {
  phone: "555-1234",
});
// Queue: Same CREATE, merged to { name: "John Smith", email: "john@example.com", phone: "555-1234" }

// 4. User goes online and syncs
sync();
// Server receives: CREATE with all merged data
// Server returns: { id: 42, name: "John Smith", ... }
// Local DB: temp_1762961725737_vymfno7f1 → 42
// ID mapping saved: temp_1762961725737_vymfno7f1 → 42
```

### Without This Fix

```typescript
// Queue would have:
// 1. CREATE temp_1762961725737_vymfno7f1 (name: "John Doe")
// 2. UPDATE temp_1762961725737_vymfno7f1 (name: "John Smith")  ❌ WRONG
// 3. UPDATE temp_1762961725737_vymfno7f1 (phone: "555-1234")   ❌ WRONG

// Sync would fail:
// - CREATE succeeds → server ID 42
// - UPDATE temp_1762961725737_vymfno7f1 fails → 404 (doesn't exist on server)
// - UPDATE temp_1762961725737_vymfno7f1 fails → 404 (doesn't exist on server)
```

## Testing Guide

### Manual Test Steps

1. **Create Record Offline**

   ```typescript
   // Go offline (Network tab → Offline)
   // Create a new client
   // Check sync queue → should see CREATE with temp ID
   ```

2. **Edit Same Record Multiple Times**

   ```typescript
   // Edit client name
   // Edit client email
   // Edit client phone
   // Check sync queue → should still see 1 CREATE with all changes merged
   ```

3. **Go Online and Sync**

   ```typescript
   // Go online
   // Trigger sync
   // Check:
   // - Server created record with permanent ID
   // - Local record updated with permanent ID
   // - Sync queue cleared
   // - ID mapping saved (temp → permanent)
   ```

4. **Verify ID Mapping**
   ```typescript
   // Check IndexedDB → ID_MAPPINGS store
   // Should see: temp_... → permanent_id
   ```

### Automated Test Cases

```typescript
describe("Temp ID Update Handling", () => {
  it("should merge multiple updates into single CREATE", async () => {
    const tempId = generateTempId("clients");

    // Create
    await queueOperation({
      operation: "create",
      entityType: "clients",
      entityId: tempId,
      data: { name: "John" },
    });

    // Update 1
    await queueOperation({
      operation: "update",
      entityType: "clients",
      entityId: tempId,
      data: { email: "john@test.com" },
    });

    // Update 2
    await queueOperation({
      operation: "update",
      entityType: "clients",
      entityId: tempId,
      data: { phone: "555-1234" },
    });

    const operations = await getPendingOperations();
    expect(operations).toHaveLength(1);
    expect(operations[0].operation).toBe("create");
    expect(operations[0].data).toEqual({
      name: "John",
      email: "john@test.com",
      phone: "555-1234",
    });
  });

  it("should convert UPDATE to CREATE if no existing CREATE", async () => {
    const tempId = generateTempId("clients");

    // Only update (no create first)
    await queueOperation({
      operation: "update",
      entityType: "clients",
      entityId: tempId,
      data: { name: "John" },
    });

    const operations = await getPendingOperations();
    expect(operations[0].operation).toBe("create");
  });
});
```

## Related Files

- `/src/lib/offline/storage/sync-queue-storage.ts` - Main implementation
- `/src/lib/offline/utils/encryption.ts` - `isTempId()` helper
- `/src/lib/offline/sync/temp-id-resolver.ts` - Temp ID mapping logic
- `/src/lib/offline/sync/sync-engine.ts` - Sync processing

## Console Logs

The implementation includes detailed logging to help debug temp ID handling:

```
[SyncQueue] ⚠️ Detected UPDATE on temp ID temp_1762961725737_vymfno7f1 - checking for existing CREATE
[SyncQueue] ✅ Found existing CREATE (id: 123) - merging updates
[SyncQueue] ✅ Merged UPDATE into existing CREATE (id: 123)
```

or

```
[SyncQueue] ⚠️ Detected UPDATE on temp ID temp_1762961725737_vymfno7f1 - checking for existing CREATE
[SyncQueue] ✅ No existing CREATE found - converting UPDATE to CREATE
[SyncQueue] ✅ Queued create for clients temp_1762961725737_vymfno7f1
```

## Edge Cases Handled

1. **Multiple concurrent updates**: All updates merge into single CREATE
2. **Updates before CREATE completes**: Merges happen even if CREATE is in_progress
3. **Failed CREATEs**: Updates still merge into failed CREATE for retry
4. **Cross-practice updates**: Tenant isolation maintained
5. **Relationship references**: Temp IDs in relationships handled by `temp-id-resolver.ts`

## Performance Considerations

- **Reduced queue size**: Multiple operations consolidated into one
- **Faster sync**: Fewer API calls to server
- **Less network traffic**: Single CREATE instead of CREATE + multiple UPDATEs
- **Cleaner sync history**: Simpler audit trail

## Future Enhancements

1. **Batch temp ID resolution**: Resolve multiple temp IDs in single API call
2. **Optimistic UI updates**: Update UI immediately with temp ID, swap to real ID when available
3. **Conflict resolution**: Handle cases where temp ID data conflicts with server state
4. **Relationship cascade**: Auto-update all related entities when temp ID is resolved
