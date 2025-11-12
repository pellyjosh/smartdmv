/**
 * Offline Pets Hook
 * Handles pet CRUD operations with offline support including photo uploads
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import * as entityStorage from '@/lib/offline/storage/entity-storage';
import type { EntityType } from '@/lib/offline/types/storage.types';

export interface Pet {
  id?: string | number;
  name: string;
  species: string;
  breed?: string | null;
  dateOfBirth?: string | null;
  weight?: string | null;
  allergies?: string | null;
  color?: string | null;
  gender?: string | null;
  microchipNumber?: string | null;
  pet_type?: string | null;
  ownerId: number;
  practiceId: number;
  photoPath?: string | null;
  createdAt?: string;
  updatedAt?: string;
  
  // Relationships (populated from IndexedDB)
  owner?: any;
  
  // Computed fields
  ownerName?: string;
  ownerEmail?: string;
  
  // Offline metadata
  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: number;
    userId?: number;
    pendingPhoto?: File; // Store photo file for later upload
  };
}

export interface UseOfflinePetsReturn {
  // Data
  pets: Pet[];
  isLoading: boolean;
  error: string | null;
  
  // Network status
  isOnline: boolean;
  hasPendingChanges: boolean;
  
  // CRUD Operations
  createPet: (pet: Omit<Pet, 'id'>, photo?: File | null) => Promise<Pet>;
  updatePet: (id: string | number, pet: Partial<Pet>, photo?: File | null) => Promise<Pet>;
  deletePet: (id: string | number) => Promise<void>;
  getPet: (id: string | number) => Promise<Pet | null>;
  
  // Filtering
  getPetsByOwner: (ownerId: string | number) => Pet[];
  getPetsBySpecies: (species: string) => Pet[];
  
  // Sync operations
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Stats
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'pets';

export function useOfflinePets(): UseOfflinePetsReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: pets, save, update, remove, getById, refetch, isLoading, error: storageError } = 
    useOfflineStorage<Pet>({ entityType: ENTITY_TYPE, autoLoad: true });
  const { addOperation, retryFailed, clearCompleted, stats, refresh: refreshQueue } = useSyncQueue();
  
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Update error from storage
  useEffect(() => {
    if (storageError) {
      setError(storageError);
    }
  }, [storageError]);

  // Update pending count from stats
  useEffect(() => {
    if (stats) {
      setPendingCount(stats.pending + stats.failed);
    }
  }, [stats]);

  // Create pet
  const createPet = useCallback(async (pet: Omit<Pet, 'id'>, photo?: File | null): Promise<Pet> => {
    try {
      // Generate temporary ID for offline
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove any existing metadata to avoid conflicts
      const { metadata: _, ...petData } = pet as any;
      
      // Normalize numeric fields
      const numericFields = ['ownerId', 'practiceId'];
      numericFields.forEach(field => {
        if (petData[field] !== null && petData[field] !== undefined) {
          const value = petData[field];
          if (typeof value === 'string') {
            const num = parseInt(value, 10);
            if (!isNaN(num)) {
              petData[field] = num;
            }
          }
        }
      });
      
      // Fetch and attach owner relationship
      if (petData.ownerId) {
        try {
          const owner = await entityStorage.getEntity<any>('clients', petData.ownerId);
          if (owner) {
            petData.owner = owner;
            petData.ownerName = owner.name;
            petData.ownerEmail = owner.email;
          }
        } catch (error) {
          console.warn('[useOfflinePets] Failed to fetch owner:', error);
        }
      }
      
      const newPet: Pet = {
        ...petData,
        id: tempId,
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending' as const,
          pendingPhoto: photo || undefined,
        }
      };

      console.log('[useOfflinePets] Creating pet:', newPet);

      // Save to IndexedDB (will throw on error)
      const saved = await save(newPet);

      // Add to sync queue
      const syncData = { ...petData };
      if (photo) {
        // Store photo info in sync data
        syncData._hasPhoto = true;
        syncData._photoName = photo.name;
        syncData._photoType = photo.type;
      }
      
      await addOperation(ENTITY_TYPE, tempId, 'create', syncData);

      toast({
        title: isOnline ? 'Pet created' : 'Pet saved offline',
        description: isOnline 
          ? 'The pet has been created and will sync automatically'
          : 'The pet will sync when you\'re back online',
      });

      return saved!;
    } catch (err: any) {
      console.error('[useOfflinePets] Create error:', err);
      toast({
        title: 'Failed to create pet',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  // Update pet
  const updatePet = useCallback(async (id: string | number, updates: Partial<Pet>, photo?: File | null): Promise<Pet> => {
    try {
      const existing = await getById(id);
      if (!existing) {
        throw new Error('Pet not found');
      }

      // Remove metadata from updates
      const { metadata: _, ...updateData } = updates as any;
      
      // Normalize numeric fields
      const numericFields = ['ownerId', 'practiceId'];
      numericFields.forEach(field => {
        if (updateData[field] !== null && updateData[field] !== undefined) {
          const value = updateData[field];
          if (typeof value === 'string') {
            const num = parseInt(value, 10);
            if (!isNaN(num)) {
              updateData[field] = num;
            }
          }
        }
      });
      
      // Update owner relationship if ownerId changed
      if (updateData.ownerId && updateData.ownerId !== existing.ownerId) {
        try {
          const owner = await entityStorage.getEntity<any>('clients', updateData.ownerId);
          if (owner) {
            updateData.owner = owner;
            updateData.ownerName = owner.name;
            updateData.ownerEmail = owner.email;
          }
        } catch (error) {
          console.warn('[useOfflinePets] Failed to fetch owner:', error);
        }
      }

      const updatedData: Pet = {
        ...existing,
        ...updateData,
        id, // Ensure ID doesn't change
        metadata: {
          ...existing.metadata,
          lastModified: Date.now(),
          syncStatus: 'pending',
          pendingPhoto: photo || existing.metadata?.pendingPhoto,
        }
      };

      // Update in IndexedDB (will throw on error)
      const result = await update(id, updatedData);

      // Add to sync queue
      const syncData = { ...updateData };
      if (photo) {
        syncData._hasPhoto = true;
        syncData._photoName = photo.name;
        syncData._photoType = photo.type;
      }
      
      await addOperation(ENTITY_TYPE, id, 'update', syncData);

      toast({
        title: isOnline ? 'Pet updated' : 'Changes saved offline',
        description: isOnline
          ? 'The pet has been updated and will sync automatically'
          : 'Changes will sync when you\'re back online',
      });

      return result!;
    } catch (err: any) {
      console.error('[useOfflinePets] Update error:', err);
      toast({
        title: 'Failed to update pet',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [getById, update, addOperation, isOnline, toast]);

  // Delete pet
  const deletePet = useCallback(async (id: string | number): Promise<void> => {
    try {
      // Soft delete in IndexedDB
      await remove(id);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'delete', { id });

      toast({
        title: isOnline ? 'Pet deleted' : 'Deletion saved offline',
        description: isOnline
          ? 'The pet has been deleted and will sync automatically'
          : 'Deletion will sync when you\'re back online',
      });
    } catch (err: any) {
      console.error('[useOfflinePets] Delete error:', err);
      toast({
        title: 'Failed to delete pet',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [remove, addOperation, isOnline, toast]);

  // Get single pet
  const getPet = useCallback(async (id: string | number): Promise<Pet | null> => {
    return getById(id);
  }, [getById]);

  // Filter by owner
  const getPetsByOwner = useCallback((ownerId: string | number): Pet[] => {
    const numericOwnerId = typeof ownerId === 'string' ? parseInt(ownerId, 10) : ownerId;
    return pets.filter(pet => pet.ownerId === numericOwnerId);
  }, [pets]);

  // Filter by species
  const getPetsBySpecies = useCallback((species: string): Pet[] => {
    return pets.filter(pet => pet.species === species);
  }, [pets]);

  // Sync now
  const syncNow = useCallback(async (): Promise<void> => {
    try {
      await retryFailed();
      await refreshQueue();
      await refetch();
      
      toast({
        title: 'Sync initiated',
        description: 'Syncing your offline changes...',
      });
    } catch (err: any) {
      toast({
        title: 'Sync failed',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [retryFailed, refreshQueue, refetch, toast]);

  // Refresh data
  const refresh = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  return {
    pets,
    isLoading,
    error,
    isOnline,
    hasPendingChanges: pendingCount > 0,
    createPet,
    updatePet,
    deletePet,
    getPet,
    getPetsByOwner,
    getPetsBySpecies,
    syncNow,
    refresh,
    pendingCount,
    syncedCount: pets.filter(p => p.metadata?.syncStatus === 'synced').length,
    errorCount: pets.filter(p => p.metadata?.syncStatus === 'error').length,
  };
}
