# Offline Mode - Sprint 2: Sync Engine Implementation

**Status**: Ready to Start 🚀  
**Duration**: Days 6-10 (5 days)  
**Prerequisites**: Sprint 1 Complete ✅

## Sprint 1 Status Review

### ✅ Completed

- [x] Tenant-aware IndexedDB schema (v2 with practice isolation)
- [x] Offline authentication storage with token obfuscation
- [x] Permission-aware storage manager with RBAC
- [x] Basic sync queue with priority support
- [x] Practice-specific data isolation
- [x] Offline practice switching
- [x] Auto-initializing storage manager
- [x] 28 core offline files created
- [x] UI components (OfflineIndicator, SyncStatus, etc.)
- [x] React hooks (useOfflineAuth, useOfflinePermissions, useSyncQueue)

### 🔧 Recent Fixes

- Fixed userId type mismatch (string vs number) in IndexedDB
- Added ADMINISTRATOR role support alongside SUPER_ADMIN
- Enhanced logging for debugging
- Auto-initialization for storage manager
- Comprehensive RBAC API integration

## Sprint 2 Goals: Sync Engine

### Objective

Build a robust sync engine that handles bidirectional synchronization between local IndexedDB and the server, with intelligent conflict detection and resolution.

---

## Implementation Tasks

### Task 1: Sync Engine Core (Day 6-7)

**File**: `src/lib/offline/sync/sync-engine.ts`

#### Features to Implement:

```typescript
class SyncEngine {
  // Core sync methods
  async syncToServer(): Promise<SyncResult>;
  async syncFromServer(): Promise<SyncResult>;
  async bidirectionalSync(): Promise<SyncResult>;

  // Conflict detection
  async detectConflicts(operation: SyncOperation): Promise<Conflict | null>;
  async resolveConflict(
    conflict: Conflict,
    strategy: ConflictStrategy
  ): Promise<void>;

  // Batch processing
  async processSyncBatch(operations: SyncOperation[]): Promise<BatchResult>;
  async syncEntityType(entityType: string): Promise<EntitySyncResult>;
}
```

#### Conflict Detection Strategy:

1. **Version-based**: Compare `version` and `serverVersion`
2. **Timestamp-based**: Compare `lastModified` with server timestamp
3. **Hash-based**: Compare data hash for deep equality check

#### Conflict Resolution Strategies:

- `server-wins`: Server data overwrites local
- `client-wins`: Local data overwrites server
- `manual`: Queue for user resolution
- `merge`: Attempt intelligent merge (field-level)
- `last-write-wins`: Most recent timestamp wins

**Acceptance Criteria**:

- [ ] Sync engine processes queue in dependency order
- [ ] Detects conflicts using all three methods
- [ ] Supports all 5 resolution strategies
- [ ] Handles network failures gracefully
- [ ] Batch size configurable (default: 50 operations)
- [ ] Progress callbacks for UI updates

---

### Task 2: Temporary ID System (Day 7-8)

**Files**:

- `src/lib/offline/sync/temp-id-resolver.ts`
- `src/lib/offline/storage/id-mapping-storage.ts`

#### Features to Implement:

```typescript
class TempIdResolver {
  // ID management
  generateTempId(entityType: string): string;
  mapTempToReal(tempId: string, realId: number): Promise<void>;
  resolveTempId(tempId: string): Promise<number | null>;

  // Batch resolution
  resolveDependentOperations(mapping: IdMapping): Promise<void>;
  updateReferences(
    entityType: string,
    oldId: string,
    newId: number
  ): Promise<void>;

  // Validation
  isTempId(id: string | number): boolean;
  getPendingMappings(): Promise<IdMapping[]>;
}
```

#### Temp ID Format:

```
temp_<timestamp>_<random>_<entityType>

Example: temp_1730534400000_a7b3c2_pet
```

#### ID Resolution Flow:

1. **Create locally**: Entity gets temp ID
2. **Queue for sync**: Operation added to queue
3. **Sync to server**: Server creates entity, returns real ID
4. **Map IDs**: Store temp→real mapping
5. **Update references**: Find all entities referencing temp ID
6. **Replace IDs**: Update with real ID throughout database

**Acceptance Criteria**:

- [ ] Temp IDs are unique and sortable by timestamp
- [ ] All relationships updated when ID resolved
- [ ] Cascade updates to dependent entities
- [ ] Failed operations retain temp IDs
- [ ] Mapping persists across sessions

---

### Task 3: Relationship Integrity Manager (Day 8-9)

**File**: `src/lib/offline/sync/relationship-manager.ts`

#### Features to Implement:

```typescript
class RelationshipManager {
  // Dependency tracking
  extractRelationships(entityType: string, data: any): RelationshipMap;
  buildDependencyGraph(operations: SyncOperation[]): DependencyNode[];
  topologicalSort(graph: DependencyNode[]): SyncOperation[];

  // Integrity validation
  validateRelationships(entity: any): ValidationResult;
  checkReferentialIntegrity(): Promise<IntegrityReport>;

  // Orphan handling
  findOrphanedEntities(): Promise<OrphanedEntity[]>;
  resolveOrphans(strategy: "delete" | "keep" | "queue"): Promise<void>;
}
```

#### Relationship Types:

```typescript
interface RelationshipMap {
  petId?: number | string;
  clientId?: number | string;
  appointmentId?: number | string;
  practitionerId?: number | string;
  // ... other foreign keys
}
```

#### Dependency Graph Example:

```
Client (id: 1)
  └─> Pet (id: temp_123, clientId: 1)
      └─> Appointment (id: temp_456, petId: temp_123)
          └─> SOAPNote (id: temp_789, appointmentId: temp_456)
```

**Sync Order**: Client → Pet → Appointment → SOAPNote

**Acceptance Criteria**:

- [ ] Extracts all foreign key relationships
- [ ] Builds correct dependency graph
- [ ] Syncs in topological order
- [ ] Detects circular dependencies
- [ ] Handles orphaned entities
- [ ] Validates referential integrity before sync

---

### Task 4: Conflict Resolution UI (Day 9-10)

**Files**:

- `src/components/offline/ConflictResolutionModal.tsx`
- `src/components/offline/ConflictDiffViewer.tsx`
- `src/components/offline/ConflictList.tsx`

#### Components to Build:

##### ConflictResolutionModal

```tsx
interface ConflictResolutionModalProps {
  conflict: Conflict;
  onResolve: (strategy: ConflictStrategy, mergedData?: any) => Promise<void>;
  onDismiss: () => void;
}
```

**Features**:

- Side-by-side comparison of local vs server data
- Field-level diff highlighting
- Quick resolution buttons (Keep Local, Use Server, Merge)
- Manual merge interface for field-by-field selection
- Preview merged result before applying

##### ConflictDiffViewer

```tsx
interface ConflictDiffViewerProps {
  localData: any;
  serverData: any;
  entityType: string;
  onFieldSelect?: (field: string, source: "local" | "server") => void;
}
```

**Features**:

- JSON diff with color coding
- Field-by-field comparison
- Visual indicators: Added (green), Removed (red), Changed (yellow)
- Support for nested objects
- Expandable/collapsible sections

##### ConflictList

```tsx
interface ConflictListProps {
  conflicts: Conflict[];
  onResolveConflict: (conflictId: number) => void;
  onBulkResolve: (strategy: ConflictStrategy) => Promise<void>;
}
```

**Features**:

- Paginated list of all conflicts
- Bulk resolution controls
- Filter by entity type
- Sort by timestamp
- Resolution status badges

**Acceptance Criteria**:

- [ ] Modal shows clear visual diff
- [ ] User can select field-level merge
- [ ] Preview before confirming resolution
- [ ] Bulk resolution for similar conflicts
- [ ] Undo last resolution action
- [ ] Accessible keyboard navigation

---

## Additional Sprint 2 Files

### Types

**`src/lib/offline/types/sync-engine.types.ts`**

```typescript
interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  operations: SyncOperation[];
  errors: SyncError[];
  duration: number;
}

interface Conflict {
  id: number;
  operation: SyncOperation;
  localData: any;
  serverData: any;
  detectedAt: number;
  conflictType: "version" | "timestamp" | "data";
  affectedFields: string[];
}

interface ConflictStrategy {
  type: "server-wins" | "client-wins" | "manual" | "merge" | "last-write-wins";
  mergedData?: any;
}

interface IdMapping {
  tempId: string;
  realId: number;
  entityType: string;
  createdAt: number;
  syncedAt: number;
}
```

### Storage

**`src/lib/offline/storage/conflict-storage.ts`**

- Store detected conflicts
- Track resolution history
- Query conflicts by entity type
- Statistics and reporting

### Utilities

**`src/lib/offline/utils/diff-utils.ts`**

- Deep object comparison
- Field-level diff generation
- Merge strategy helpers
- Data hash generation

### Hooks

**`src/hooks/use-sync-engine.ts`**

```typescript
export function useSyncEngine() {
  const sync = useCallback(async () => { ... });
  const syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  const progress: SyncProgress;
  const conflicts: Conflict[];
  const resolveConflict: (id, strategy) => Promise<void>;
  return { sync, syncStatus, progress, conflicts, resolveConflict };
}
```

---

## Testing Requirements

### Unit Tests

- [ ] Sync engine processes operations correctly
- [ ] Temp ID generation is unique
- [ ] Dependency graph builds correctly
- [ ] Topological sort handles circular deps
- [ ] Conflict detection catches all types
- [ ] ID resolution updates all references

### Integration Tests

- [ ] End-to-end sync flow (create → sync → resolve ID)
- [ ] Multiple entity types sync in order
- [ ] Conflict resolution applies correctly
- [ ] Network failure recovery
- [ ] Partial sync completion

### Edge Cases

- [ ] Sync with no network
- [ ] Sync with partial network failure
- [ ] Very large sync batches (1000+ operations)
- [ ] Concurrent sync attempts
- [ ] Server rejects some operations
- [ ] Circular dependency detection

---

## Performance Targets

| Metric                           | Target  | Measured |
| -------------------------------- | ------- | -------- |
| Sync 100 operations              | < 2s    | -        |
| Detect conflicts                 | < 500ms | -        |
| Resolve conflict                 | < 100ms | -        |
| Build dependency graph (500 ops) | < 1s    | -        |
| Temp ID resolution               | < 50ms  | -        |

---

## API Endpoints Required

### Sync Endpoints

```typescript
POST /api/sync/upload
  - Body: { operations: SyncOperation[] }
  - Returns: { results: SyncResult[], idMappings: IdMapping[] }

POST /api/sync/download
  - Body: { lastSync: timestamp, entityTypes: string[] }
  - Returns: { entities: Entity[], deletions: Deletion[] }

GET /api/sync/conflicts
  - Returns: { conflicts: ServerConflict[] }

POST /api/sync/resolve-conflict
  - Body: { conflictId: number, resolution: ConflictResolution }
  - Returns: { success: boolean, entity: Entity }
```

---

## Success Metrics

At the end of Sprint 2, we should have:

### Functionality

- ✅ Sync engine that processes queue in order
- ✅ Intelligent conflict detection
- ✅ 5 conflict resolution strategies
- ✅ Temp ID system with cascade updates
- ✅ Dependency graph and topological sorting
- ✅ Referential integrity validation

### UI/UX

- ✅ Conflict resolution modal
- ✅ Visual diff viewer
- ✅ Conflict list with bulk actions
- ✅ Sync progress indicator
- ✅ Real-time sync status updates

### Developer Experience

- ✅ Clear API for triggering sync
- ✅ React hooks for sync operations
- ✅ Comprehensive error handling
- ✅ Detailed logging for debugging

---

## Next Sprint Preview

**Sprint 3: Data Sync (Days 11-15)**

- Initial data download optimization
- Incremental sync (delta updates)
- File attachment handling
- Storage quota management
- Background sync scheduling

---

## Getting Started

### Day 6 Morning:

1. Create sync engine file structure
2. Implement basic SyncEngine class
3. Add conflict detection logic
4. Write unit tests for conflict detection

### Day 6 Afternoon:

5. Implement batch processing
6. Add progress callbacks
7. Test with sample operations

### Continue through Day 10...

---

## Questions to Address

1. **Conflict Resolution**: Should we auto-resolve simple conflicts (e.g., only metadata changed)?
2. **Batch Size**: Optimal number of operations per sync batch?
3. **Retry Logic**: How many times to retry failed operations?
4. **Network Detection**: Should we auto-pause sync when offline?
5. **User Notification**: Toast notifications for sync events?

---

## Resources

- **IndexedDB Docs**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Topological Sort**: https://en.wikipedia.org/wiki/Topological_sorting
- **Conflict-free Replicated Data Types (CRDT)**: https://crdt.tech/
- **Optimistic UI**: https://www.apollographql.com/docs/react/performance/optimistic-ui/

---

**Let's build an amazing sync engine! 🚀**
