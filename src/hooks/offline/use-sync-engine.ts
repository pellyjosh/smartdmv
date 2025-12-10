/**
 * useSyncEngine Hook
 * React hook for sync operations and status management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSyncEngine, performSync } from '@/lib/offline/sync/sync-engine';
import { pullFreshDataIfNeeded } from '@/lib/sync-service';
import { useNetworkStatus } from '@/hooks/offline/use-network-status';
import { syncQueueManager } from '@/lib/offline/managers/sync-queue-manager';
import { syncEventEmitter } from '@/lib/offline/events/sync-events';
import type { 
  SyncResult, 
  SyncConfig, 
  SyncProgress, 
  SyncStatus,
  Conflict 
} from '@/lib/offline/types/sync-engine.types';
import * as conflictStorage from '@/lib/offline/storage/conflict-storage';
import { indexedDBManager } from '@/lib/offline/db/manager';
import { getOfflineTenantContext } from '@/lib/offline/core/tenant-context';
import { initializeOfflineSystem } from '@/lib/offline/utils/offline-init';

export interface UseSyncEngineReturn {
  // Sync operations
  sync: () => Promise<SyncResult | null>;
  cancelSync: () => void;
  
  // Status
  isSyncing: boolean;
  status: SyncStatus;
  progress: SyncProgress;
  lastResult: SyncResult | null;
  
  // Conflicts
  conflicts: Conflict[];
  unresolvedConflicts: Conflict[];
  resolveConflict: (conflictId: number, strategy: Conflict['resolution']) => Promise<void>;
  bulkResolveConflicts: (ids: number[], strategy: string) => Promise<void>;
  refreshConflicts: () => Promise<void>;
  
  // Stats
  stats: {
    totalSynced: number;
    totalFailed: number;
    totalConflicts: number;
  };
  
  // Auto-sync control
  isAutoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
}

export function useSyncEngine(config?: Partial<SyncConfig>): UseSyncEngineReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [progress, setProgress] = useState<SyncProgress>({
    status: 'idle',
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    conflicts: 0,
    percentage: 0
  });
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [unresolvedConflicts, setUnresolvedConflicts] = useState<Conflict[]>([]);
  const [isAutoSyncEnabled, setAutoSyncEnabled] = useState(false); // Auto-sync DISABLED by default to prevent spam
  
  const { isOnline } = useNetworkStatus();
  const lastOnlineRef = useRef(isOnline);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const isSyncingRef = useRef(false); // Use ref to track syncing state
  
  const syncEngineRef = useRef(getSyncEngine({
    ...config,
    progressCallback: (prog) => {
      setProgress(prog);
      setStatus(prog.status);
    },
    conflictCallback: (conflict) => {
      setConflicts(prev => [...prev, conflict]);
    }
  }));

  /**
   * Perform sync operation
   */
  const sync = useCallback(async (): Promise<SyncResult | null> => {
    // Use ref to avoid race conditions
    if (isSyncingRef.current) {
      console.log('[useSyncEngine] Sync already in progress (ref check), skipping');
      return null;
    }

    try {
      console.log('[useSyncEngine] Starting sync operation...');
      isSyncingRef.current = true;
      setIsSyncing(true);
      setStatus('preparing');

      try {
        const current = indexedDBManager.getCurrentTenant();
        if (!current.tenantId) {
          const ctx = await getOfflineTenantContext();
          if (ctx) {
            await initializeOfflineSystem({
              tenantId: ctx.tenantId,
              practiceId: ctx.practiceId,
              userId: ctx.userId,
            });
          } else {
            const meRes = await fetch('/api/auth/me', { credentials: 'include' });
            const me = meRes.ok ? await meRes.json() : null;
            const tenantRes = await fetch('/api/tenant/current');
            const tenantJson = tenantRes.ok ? await tenantRes.json() : null;
            const tid = tenantJson?.tenant?.id?.toString();
            const pidRaw = me?.currentPracticeId ?? me?.practiceId;
            const uidRaw = me?.id;
            const pid = typeof pidRaw === 'string' ? parseInt(pidRaw, 10) : pidRaw;
            const uid = typeof uidRaw === 'string' ? parseInt(uidRaw, 10) : uidRaw;
            if (tid && pid && uid) {
              await initializeOfflineSystem({ tenantId: tid, practiceId: pid, userId: uid });
            }
          }
        }
      } catch (e) {}
      
      const result = await performSync(config);
      
      console.log('[useSyncEngine] Sync completed:', result);
      setLastResult(result);
      setStatus(result.success ? 'success' : 'partial-success');
      
      // Refresh conflicts after sync
      await refreshConflicts();
      
      return result;
    } catch (error) {
      // Check if it's the "already in progress" error - not a real error
      if (error instanceof Error && error.message.includes('Sync already in progress')) {
        console.log('[useSyncEngine] Sync engine busy, skipping this call');
        return null;
      }
      
      console.error('[useSyncEngine] Sync failed:', error);
      setStatus('error');
      return null;
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      // Small delay before allowing next sync to prevent rapid retriggers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }, [config]); // Minimal dependencies to prevent recreating

  /**
   * Cancel ongoing sync (not fully implemented yet)
   */
  const cancelSync = useCallback(() => {
    console.log('Cancel sync requested');
    setStatus('cancelled');
    setIsSyncing(false);
  }, []);

  /**
   * Resolve a conflict
   */
  const resolveConflict = useCallback(async (
    conflictId: number,
    resolution: Conflict['resolution']
  ) => {
    await conflictStorage.resolveConflict(conflictId, resolution!);
    await refreshConflicts();
  }, []);

  /**
   * Bulk resolve conflicts
   */
  const bulkResolveConflicts = useCallback(async (
    ids: number[],
    strategy: string
  ) => {
    await conflictStorage.bulkResolveConflicts(ids, strategy as any);
    await refreshConflicts();
  }, []);

  /**
   * Refresh conflicts from storage
   */
  const refreshConflicts = useCallback(async () => {
    try {
      // Check if tenant context is set before loading conflicts
      const { tenantId } = indexedDBManager.getCurrentTenant();
      if (!tenantId) {
        console.log('[useSyncEngine] No tenant context, skipping conflict refresh');
        return;
      }

      const all = await conflictStorage.getAllConflicts();
      const unresolved = await conflictStorage.getUnresolvedConflicts();
      setConflicts(all);
      setUnresolvedConflicts(unresolved);
    } catch (error) {
      console.error('[useSyncEngine] Error refreshing conflicts:', error);
      setConflicts([]);
      setUnresolvedConflicts([]);
    }
  }, []);

  /**
   * Load conflicts on mount
   */
  useEffect(() => {
    refreshConflicts();
  }, [refreshConflicts]);

  /**
   * Auto-sync when network comes back online
   */
  useEffect(() => {
    if (!isAutoSyncEnabled) return;

    // Detect network reconnection
    if (isOnline && !lastOnlineRef.current) {
      console.log('[useSyncEngine] Network reconnected, scheduling auto-sync...');
      
      // Small delay to ensure network is stable
      const timeout = setTimeout(() => {
        if (!isSyncingRef.current) {
          sync();
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }

    lastOnlineRef.current = isOnline;
  }, [isOnline, isAutoSyncEnabled]); // Don't include sync in deps

  /**
   * Periodic background sync for pending operations
   */
  useEffect(() => {
    if (!isAutoSyncEnabled || !isOnline) return;

    const checkAndSync = async () => {
      try {
        // Skip if already syncing
        if (isSyncingRef.current) {
          console.log('[useSyncEngine] Skipping periodic check - sync in progress');
          return;
        }

        // Check if tenant context is set
        const { tenantId } = indexedDBManager.getCurrentTenant();
        if (!tenantId) return;

        // Check for pending operations
        const stats = await syncQueueManager.getStats();
        if (stats.pending > 0) {
          console.log(`[useSyncEngine] Periodic auto-sync: ${stats.pending} pending operations`);
          await sync();
        } else {
          await pullFreshDataIfNeeded();
        }
      } catch (error) {
        console.error('[useSyncEngine] Auto-sync check error:', error);
      }
    };

    // Check every 30 seconds when online
    const interval = setInterval(checkAndSync, 30000);

    // Also check immediately after a short delay
    const initialTimeout = setTimeout(checkAndSync, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [isAutoSyncEnabled, isOnline]); // Don't include sync in deps

  /**
   * Listen to sync events (when operations are added)
   */
  useEffect(() => {
    if (!isAutoSyncEnabled || !isOnline) return;

    const handleSyncEvent = () => {
      // Skip if already syncing
      if (isSyncingRef.current) {
        console.log('[useSyncEngine] Skipping sync event - already syncing');
        return;
      }

      // Debounce sync calls - wait 2 seconds after last event
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        if (!isSyncingRef.current && isOnline) {
          console.log('[useSyncEngine] Sync triggered by operation add event');
          sync();
        }
      }, 2000);
    };

    // Subscribe to sync events
    const unsubscribe = syncEventEmitter.subscribe(handleSyncEvent);

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isAutoSyncEnabled, isOnline]); // Don't include sync in deps

  /**
   * Calculate stats
   */
  const stats = {
    totalSynced: lastResult?.synced || 0,
    totalFailed: lastResult?.failed || 0,
    totalConflicts: conflicts.length
  };

  return {
    sync,
    cancelSync,
    isSyncing,
    status,
    progress,
    lastResult,
    conflicts,
    unresolvedConflicts,
    resolveConflict,
    bulkResolveConflicts,
    refreshConflicts,
    stats,
    isAutoSyncEnabled,
    setAutoSyncEnabled,
  };
}
