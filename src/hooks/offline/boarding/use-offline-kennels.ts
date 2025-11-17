/**
 * Offline Kennels Hook
 * Handles kennel CRUD operations with offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import type { EntityType } from '@/lib/offline/types/storage.types';
import type { Kennel } from '@/db/schemas/boardingSchema';

export interface UseOfflineKennelsReturn {
  kennels: Kennel[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  hasPendingChanges: boolean;

  createKennel: (kennel: Omit<Kennel, 'id'>) => Promise<Kennel>;
  updateKennel: (id: string | number, updates: Partial<Kennel>) => Promise<Kennel>;
  deleteKennel: (id: string | number) => Promise<void>;
  getKennel: (id: string | number) => Promise<Kennel | null>;

  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;

  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'kennels';

export function useOfflineKennels(): UseOfflineKennelsReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: kennels, save, update, remove, getById, refetch, isLoading, error: storageError } =
    useOfflineStorage<Kennel>({ entityType: ENTITY_TYPE, autoLoad: true });
  const { addOperation, retryFailed, clearCompleted, stats, refresh: refreshQueue } = useSyncQueue();

  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (storageError) setError(storageError);
  }, [storageError]);

  useEffect(() => {
    if (stats) setPendingCount(stats.pending + stats.failed);
  }, [stats]);

  const createKennel = useCallback(async (kennel: Omit<Kennel, 'id'>): Promise<Kennel> => {
    try {
      console.log('[useOfflineKennels] Create kennel:', kennel);
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newKennel: Kennel = {
        ...kennel,
        id: tempId as any,
        isActive: kennel.isActive ?? true,
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      const result = await save(newKennel);
      await addOperation(ENTITY_TYPE, tempId, 'create', newKennel);

      toast({
        title: isOnline ? 'Kennel created' : 'Kennel saved offline',
        description: isOnline ? 'Kennel created and will sync' : 'Kennel saved locally and will sync when online',
      });

      return result!;
    } catch (err: any) {
      console.error('[useOfflineKennels] Create error:', err);
      toast({ title: 'Failed to create kennel', description: err.message || 'Unknown error', variant: 'destructive' });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  const updateKennel = useCallback(async (id: string | number, updates: Partial<Kennel>): Promise<Kennel> => {
    try {
      console.log('[useOfflineKennels] Update kennel:', id, updates);
      const current = await getById(id);
      if (!current) {
        throw new Error(`Kennel with id ${id} not found`);
      }

      const updated = await update(id, updates);
      if (!updated) {
        throw new Error('Failed to update kennel');
      }

      await addOperation(ENTITY_TYPE, id, 'update', updates);

      toast({
        title: isOnline ? 'Kennel updated' : 'Kennel updated offline',
        description: isOnline ? 'Kennel updated and will sync' : 'Kennel updated locally and will sync when online',
      });

      return updated;
    } catch (err: any) {
      console.error('[useOfflineKennels] Update error:', err);
      toast({ title: 'Failed to update kennel', description: err.message || 'Unknown error', variant: 'destructive' });
      throw err;
    }
  }, [getById, update, addOperation, isOnline, toast]);

  const deleteKennel = useCallback(async (id: string | number): Promise<void> => {
    try {
      console.log('[useOfflineKennels] Delete kennel:', id);
      const success = await remove(id);
      if (!success) {
        throw new Error(`Kennel with id ${id} not found`);
      }

      await addOperation(ENTITY_TYPE, id, 'delete');

      toast({
        title: isOnline ? 'Kennel deleted' : 'Kennel deleted offline',
        description: isOnline ? 'Kennel deleted and will sync' : 'Kennel deleted locally and will sync when online',
      });
    } catch (err: any) {
      console.error('[useOfflineKennels] Delete error:', err);
      toast({ title: 'Failed to delete kennel', description: err.message || 'Unknown error', variant: 'destructive' });
      throw err;
    }
  }, [remove, addOperation, isOnline, toast]);

  const getKennel = useCallback(async (id: string | number): Promise<Kennel | null> => {
    try {
      return await getById(id);
    } catch (err: any) {
      console.error('[useOfflineKennels] Get error:', err);
      return null;
    }
  }, [getById]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      await refetch();
      await refreshQueue();
    } catch (err: any) {
      console.error('[useOfflineKennels] Refresh error:', err);
      setError(err.message || 'Failed to refresh');
    }
  }, [refetch, refreshQueue]);

  const syncNow = useCallback(async (): Promise<void> => {
    // Trigger sync for this entity type
    // This would typically call the sync engine
    console.log('[useOfflineKennels] Sync now triggered');
    await refresh();
  }, [refresh]);

  const hasPendingChanges = pendingCount > 0;
  const syncedCount = stats?.completed || 0;
  const errorCount = stats?.failed || 0;

  return {
    kennels,
    isLoading,
    error,
    isOnline,
    hasPendingChanges,

    createKennel,
    updateKennel,
    deleteKennel,
    getKennel,

    refresh,
    syncNow,

    pendingCount,
    syncedCount,
    errorCount,
  };
}