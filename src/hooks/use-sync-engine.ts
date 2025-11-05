/**
 * useSyncEngine Hook
 * React hook for sync operations and status management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSyncEngine, performSync } from '@/lib/offline/sync/sync-engine';
import type { 
  SyncResult, 
  SyncConfig, 
  SyncProgress, 
  SyncStatus,
  Conflict 
} from '@/lib/offline/types/sync-engine.types';
import * as conflictStorage from '@/lib/offline/storage/conflict-storage';

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
    if (isSyncing) {
      console.warn('Sync already in progress');
      return null;
    }

    try {
      setIsSyncing(true);
      setStatus('preparing');
      
      const result = await performSync(config);
      
      setLastResult(result);
      setStatus(result.success ? 'success' : 'partial-success');
      
      // Refresh conflicts after sync
      await refreshConflicts();
      
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      setStatus('error');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, config]);

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
    const all = await conflictStorage.getAllConflicts();
    const unresolved = await conflictStorage.getUnresolvedConflicts();
    setConflicts(all);
    setUnresolvedConflicts(unresolved);
  }, []);

  /**
   * Load conflicts on mount
   */
  useEffect(() => {
    refreshConflicts();
  }, [refreshConflicts]);

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
    stats
  };
}
