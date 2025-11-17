/**
 * Offline Boarding Hook
 * Handles boarding stay CRUD operations with offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import * as entityStorage from '@/lib/offline/storage/entity-storage';
import type { EntityType } from '@/lib/offline/types/storage.types';

export type BoardingStayStatus = 'scheduled' | 'checked_in' | 'checked_out' | 'cancelled';

export interface BoardingStay {
  id?: string | number;
  petId: number;
  kennelId: number;
  checkInDate: string;
  plannedCheckOutDate: string;
  actualCheckOutDate?: string | null;
  status: BoardingStayStatus;
  specialInstructions?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  reservationNotes?: string | null;
  belongingsDescription?: string | null;
  dailyRate?: string | null;
  practiceId?: number;
  createdById?: number;
  createdAt?: string;
  updatedAt?: string | null;

  // Relationships
  pet?: any;
  kennel?: any;
  createdBy?: any;

  // Display helpers
  petName?: string;
  kennelName?: string;
  createdByName?: string;

  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: number;
    userId?: number;
  };
}

export interface UseOfflineBoardingReturn {
  stays: BoardingStay[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  hasPendingChanges: boolean;

  createStay: (stay: Omit<BoardingStay, 'id'>) => Promise<BoardingStay>;
  updateStay: (id: string | number, updates: Partial<BoardingStay>) => Promise<BoardingStay>;
  deleteStay: (id: string | number) => Promise<void>;
  getStay: (id: string | number) => Promise<BoardingStay | null>;

  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;

  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'boarding_stays';

export function useOfflineBoarding(): UseOfflineBoardingReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: stays, save, update, remove, getById, refetch, isLoading, error: storageError } =
    useOfflineStorage<BoardingStay>({ entityType: ENTITY_TYPE, autoLoad: true });
  const { addOperation, retryFailed, clearCompleted, stats, refresh: refreshQueue } = useSyncQueue();

  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (storageError) setError(storageError);
  }, [storageError]);

  useEffect(() => {
    if (stats) setPendingCount(stats.pending + stats.failed);
  }, [stats]);

  const createStay = useCallback(async (stay: Omit<BoardingStay, 'id'>): Promise<BoardingStay> => {
    try {
      console.log('[useOfflineBoarding] Create stay:', stay);
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { metadata: _, ...stayData } = stay as any;

      // Attach relationships (best-effort)
      try {
        if (stayData.petId) {
          const pet = await entityStorage.getEntity<any>('pets', stayData.petId);
          if (pet) {
            stayData.pet = pet;
            stayData.petName = pet.name;
          }
        }
        if (stayData.kennelId) {
          const kennel = await entityStorage.getEntity<any>('kennels', stayData.kennelId);
          if (kennel) {
            stayData.kennel = kennel;
            stayData.kennelName = kennel.name;
          }
        }
      } catch (err) {
        console.warn('[useOfflineBoarding] Relationship fetch failed:', err);
      }

      const newStay: BoardingStay = {
        ...stayData,
        id: tempId,
        createdAt: new Date().toISOString(),
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      const result = await save(newStay);
      await addOperation(ENTITY_TYPE, tempId, 'create', newStay);

      toast({
        title: isOnline ? 'Boarding stay created' : 'Boarding stay saved offline',
        description: isOnline ? 'Stay created and will sync' : 'Stay saved locally and will sync when online',
      });

      return result!;
    } catch (err: any) {
      console.error('[useOfflineBoarding] Create error:', err);
      toast({ title: 'Failed to create stay', description: err.message || 'Unknown error', variant: 'destructive' });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  const updateStay = useCallback(async (id: string | number, updates: Partial<BoardingStay>): Promise<BoardingStay> => {
    try {
      console.log('[useOfflineBoarding] Update stay:', id, updates);
      const current = await getById(id);
      if (!current) throw new Error('Stay not found');

      const { metadata: _, ...updateData } = updates as any;
      const updated: BoardingStay = {
        ...current,
        ...updateData,
        id,
        metadata: {
          ...current.metadata,
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      // Re-fetch relationships if changed
      try {
        if (updateData.petId && updateData.petId !== current.petId) {
          const pet = await entityStorage.getEntity<any>('pets', updateData.petId);
          if (pet) {
            updated.pet = pet;
            updated.petName = pet.name;
          }
        }
        if (updateData.kennelId && updateData.kennelId !== current.kennelId) {
          const kennel = await entityStorage.getEntity<any>('kennels', updateData.kennelId);
          if (kennel) {
            updated.kennel = kennel;
            updated.kennelName = kennel.name;
          }
        }
      } catch (err) {
        console.warn('[useOfflineBoarding] Relationship refresh failed:', err);
      }

      const result = await update(id, updated as any);
      await addOperation(ENTITY_TYPE, id, 'update', updated);

      toast({
        title: isOnline ? 'Boarding stay updated' : 'Update saved offline',
        description: isOnline ? 'Stay updated and will sync' : 'Update saved locally and will sync when online',
      });

      return result!;
    } catch (err: any) {
      console.error('[useOfflineBoarding] Update error:', err);
      toast({ title: 'Failed to update stay', description: err.message || 'Unknown error', variant: 'destructive' });
      throw err;
    }
  }, [getById, update, addOperation, isOnline, toast]);

  const deleteStay = useCallback(async (id: string | number): Promise<void> => {
    try {
      console.log('[useOfflineBoarding] Delete stay:', id);
      await remove(id);
      await addOperation(ENTITY_TYPE, id, 'delete', { id });

      toast({
        title: isOnline ? 'Boarding stay deleted' : 'Deletion saved offline',
        description: isOnline ? 'Stay deleted and will sync' : 'Deletion saved locally and will sync when online',
      });
    } catch (err: any) {
      console.error('[useOfflineBoarding] Delete error:', err);
      toast({ title: 'Failed to delete stay', description: err.message || 'Unknown error', variant: 'destructive' });
      throw err;
    }
  }, [remove, addOperation, isOnline, toast]);

  const getStay = useCallback(async (id: string | number): Promise<BoardingStay | null> => {
    try {
      return await getById(id);
    } catch (err) {
      console.error('[useOfflineBoarding] Get error:', err);
      return null;
    }
  }, [getById]);

  const syncNow = useCallback(async (): Promise<void> => {
    try {
      await retryFailed();
      await refreshQueue();
      await refetch();
      toast({ title: 'Sync complete', description: 'Boarding data synchronized' });
    } catch (err: any) {
      console.error('[useOfflineBoarding] Sync error:', err);
      toast({ title: 'Sync failed', description: err.message || 'Unknown error', variant: 'destructive' });
    }
  }, [retryFailed, refreshQueue, refetch, toast]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      await refetch();
    } catch (err: any) {
      console.error('[useOfflineBoarding] Refresh error:', err);
    }
  }, [refetch]);

  const syncedCount = stays.filter(s => s.metadata?.syncStatus === 'synced').length;
  const errorCount = stays.filter(s => s.metadata?.syncStatus === 'error').length;
  const hasPendingChanges = pendingCount > 0;

  return {
    stays,
    isLoading,
    error,
    isOnline,
    hasPendingChanges,
    createStay,
    updateStay,
    deleteStay,
    getStay,
    refresh,
    syncNow,
    pendingCount,
    syncedCount,
    errorCount,
  };
}
