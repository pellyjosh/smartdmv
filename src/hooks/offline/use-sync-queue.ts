/**
 * React hook for sync queue operations
 */

import { useState, useEffect, useCallback } from 'react';
import { syncQueueManager } from '@/lib/offline/managers/sync-queue-manager';
import { indexedDBManager } from '@/lib/offline/db';
import { syncEventEmitter } from '@/lib/offline/events/sync-events';
import type {
  SyncOperation,
  SyncQueueStats,
  SyncPriority,
  SyncOperationType,
} from '@/lib/offline/types/sync.types';

export interface UseSyncQueueReturn {
  stats: SyncQueueStats | null;
  pendingOperations: SyncOperation[];
  failedOperations: SyncOperation[];
  conflictedOperations: SyncOperation[];
  isLoading: boolean;
  addOperation: (
    entityType: string,
    entityId: number | string,
    operation: SyncOperationType,
    data?: any,
    priority?: SyncPriority
  ) => Promise<number | null>;
  retryFailed: () => Promise<number>;
  clearCompleted: () => Promise<number>;
  refresh: () => Promise<void>;
}

export function useSyncQueue(): UseSyncQueueReturn {
  const [stats, setStats] = useState<SyncQueueStats | null>(null);
  const [pendingOperations, setPendingOperations] = useState<SyncOperation[]>([]);
  const [failedOperations, setFailedOperations] = useState<SyncOperation[]>([]);
  const [conflictedOperations, setConflictedOperations] = useState<SyncOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    try {
      // Check if tenant context is set before accessing database
      const { tenantId } = indexedDBManager.getCurrentTenant();
      if (!tenantId) {
        console.log('[useSyncQueue] No tenant context, skipping load');
        setStats(null);
        setPendingOperations([]);
        setFailedOperations([]);
        setConflictedOperations([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      const [queueStats, pending, failed, conflicted] = await Promise.all([
        syncQueueManager.getStats(),
        syncQueueManager.getPending(),
        syncQueueManager.getFailed(),
        syncQueueManager.getConflicted(),
      ]);

      setStats(queueStats);
      setPendingOperations(pending);
      setFailedOperations(failed);
      setConflictedOperations(conflicted);
    } catch (error) {
      console.error('[useSyncQueue] Load error:', error);
      setStats(null);
      setPendingOperations([]);
      setFailedOperations([]);
      setConflictedOperations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addOperation = useCallback(async (
    entityType: string,
    entityId: number | string,
    operation: SyncOperationType,
    data?: any,
    priority: SyncPriority = 'normal'
  ): Promise<number | null> => {
    try {
      const id = await syncQueueManager.addOperation(
        entityType,
        entityId,
        operation,
        data,
        priority
      );
      await loadQueue(); // Refresh
      
      // Trigger sync event so sync engine can pick it up
      syncEventEmitter.trigger();
      
      return id;
    } catch (error) {
      console.error('[useSyncQueue] Add operation error:', error);
      return null;
    }
  }, [loadQueue]);

  const retryFailed = useCallback(async (): Promise<number> => {
    try {
      const count = await syncQueueManager.retryFailed();
      await loadQueue(); // Refresh
      return count;
    } catch (error) {
      console.error('[useSyncQueue] Retry failed error:', error);
      return 0;
    }
  }, [loadQueue]);

  const clearCompleted = useCallback(async (): Promise<number> => {
    try {
      const count = await syncQueueManager.clearCompleted();
      await loadQueue(); // Refresh
      return count;
    } catch (error) {
      console.error('[useSyncQueue] Clear completed error:', error);
      return 0;
    }
  }, [loadQueue]);

  const refresh = useCallback(async () => {
    await loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    loadQueue();

    // Refresh every 10 seconds
    const interval = setInterval(loadQueue, 10000);

    return () => clearInterval(interval);
  }, [loadQueue]);

  return {
    stats,
    pendingOperations,
    failedOperations,
    conflictedOperations,
    isLoading,
    addOperation,
    retryFailed,
    clearCompleted,
    refresh,
  };
}
