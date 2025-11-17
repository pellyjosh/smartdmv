/**
 * Offline Vaccinations Hook
 * Handles vaccination CRUD operations with offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import * as entityStorage from '@/lib/offline/storage/entity-storage';
import type { EntityType } from '@/lib/offline/types/storage.types';

export type VaccinationStatus = 'completed' | 'scheduled' | 'missed' | 'cancelled';
export type AdministrationRoute = 'subcutaneous' | 'intramuscular' | 'intranasal' | 'oral' | 'topical';

export interface Vaccination {
  id?: string | number;
  petId: number;
  practiceId: number;
  vaccineTypeId?: number | null;
  vaccineName: string;
  manufacturer?: string | null;
  lotNumber?: string | null;
  serialNumber?: string | null;
  expirationDate?: string | null;
  administrationDate: string;
  administrationSite?: string | null;
  route?: AdministrationRoute | null;
  dose?: string | null;
  administeringVetId?: number | null;
  nextDueDate?: string | null;
  status: VaccinationStatus;
  reactions?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  
  // Relationships (populated from IndexedDB)
  pet?: any;
  vaccineType?: any;
  administeringVet?: any;
  
  // Computed fields for display
  petName?: string;
  vaccineTypeName?: string | null;
  administeringVetName?: string | null;
  
  // Offline metadata
  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: number;
    userId?: number;
  };
}

export interface UseOfflineVaccinationsReturn {
  // Data
  vaccinations: Vaccination[];
  isLoading: boolean;
  error: string | null;
  
  // Network status
  isOnline: boolean;
  hasPendingChanges: boolean;
  
  // CRUD Operations
  createVaccination: (vaccination: Omit<Vaccination, 'id'>) => Promise<Vaccination>;
  updateVaccination: (id: string | number, vaccination: Partial<Vaccination>) => Promise<Vaccination>;
  deleteVaccination: (id: string | number) => Promise<void>;
  getVaccination: (id: string | number) => Promise<Vaccination | null>;
  
  // Filtering
  getCompletedVaccinations: () => Vaccination[];
  getScheduledVaccinations: () => Vaccination[];
  getVaccinationsByStatus: (status: VaccinationStatus) => Vaccination[];
  getVaccinationsByPet: (petId: string | number) => Vaccination[];
  getUpcomingVaccinations: (days?: number) => Vaccination[];
  getExpiredVaccinations: () => Vaccination[];
  
  // Sync operations
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Stats
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'vaccinations';

export function useOfflineVaccinations(): UseOfflineVaccinationsReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: vaccinations, save, update, remove, getById, refetch, isLoading, error: storageError } = 
    useOfflineStorage<Vaccination>({ entityType: ENTITY_TYPE, autoLoad: true });
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

  // Create vaccination
  const createVaccination = useCallback(async (vaccination: Omit<Vaccination, 'id'>): Promise<Vaccination> => {
    try {
      console.log('[useOfflineVaccinations] Create vaccination:', vaccination);
      
      // Generate temporary ID for offline
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove any existing metadata to avoid conflicts
      const { metadata: _, ...vaccinationData } = vaccination as any;
      
      // Normalize numeric fields
      const numericFields = ['petId', 'practiceId', 'vaccineTypeId', 'administeringVetId'];
      numericFields.forEach(field => {
        if (vaccinationData[field] !== null && vaccinationData[field] !== undefined) {
          const value = vaccinationData[field];
          if (typeof value === 'string') {
            const num = parseInt(value, 10);
            if (!isNaN(num)) {
              vaccinationData[field] = num;
            }
          }
        }
      });
      
      // Fetch and attach relationships
      try {
        if (vaccinationData.petId) {
          const pet = await entityStorage.getEntity<any>('pets', vaccinationData.petId);
          if (pet) {
            vaccinationData.pet = pet;
            vaccinationData.petName = pet.name;
          }
        }
        
        if (vaccinationData.vaccineTypeId) {
          const vaccineType = await entityStorage.getEntity<any>('vaccine_types', vaccinationData.vaccineTypeId);
          if (vaccineType) {
            vaccinationData.vaccineType = vaccineType;
            vaccinationData.vaccineTypeName = vaccineType.name;
          }
        }
        
        if (vaccinationData.administeringVetId) {
          const vet = await entityStorage.getEntity<any>('clients', vaccinationData.administeringVetId);
          if (vet) {
            vaccinationData.administeringVet = vet;
            vaccinationData.administeringVetName = vet.name || vet.email;
          }
        }
      } catch (error) {
        console.warn('[useOfflineVaccinations] Failed to fetch relationships:', error);
      }
      
      const newVaccination: Vaccination = {
        ...vaccinationData,
        id: tempId,
        administrationDate: vaccinationData.administrationDate || new Date().toISOString(),
        status: vaccinationData.status || 'completed',
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending' as const,
        }
      };
      
      // Save to IndexedDB
      const result = await save(newVaccination);
      
      // Add to sync queue
      await addOperation(ENTITY_TYPE, tempId, 'create', newVaccination);
      
      console.log('[useOfflineVaccinations] Vaccination created:', result);
      
      toast({
        title: isOnline ? 'Vaccination created' : 'Vaccination saved offline',
        description: isOnline
          ? 'The vaccination has been created and will sync automatically'
          : 'Vaccination will be created when you\'re back online',
      });
      
      return result!;
    } catch (err: any) {
      console.error('[useOfflineVaccinations] Create error:', err);
      toast({
        title: 'Failed to create vaccination',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  // Update vaccination
  const updateVaccination = useCallback(async (id: string | number, updates: Partial<Vaccination>): Promise<Vaccination> => {
    try {
      console.log('[useOfflineVaccinations] Update vaccination:', id, updates);
      
      // Get current vaccination
      const current = await getById(id);
      if (!current) {
        throw new Error('Vaccination not found');
      }
      
      // Remove metadata from updates to avoid conflicts
      const { metadata: _, ...updateData } = updates as any;
      
      // Normalize numeric fields
      const numericFields = ['petId', 'practiceId', 'vaccineTypeId', 'administeringVetId'];
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
      
      // Merge updates with current data
      const updated: Vaccination = {
        ...current,
        ...updateData,
        id,
        metadata: {
          ...current.metadata,
          lastModified: Date.now(),
          syncStatus: 'pending' as const,
        }
      };
      
      // Re-fetch relationships if IDs changed
      try {
        if (updateData.petId && updateData.petId !== current.petId) {
          const pet = await entityStorage.getEntity<any>('pets', updateData.petId);
          if (pet) {
            updated.pet = pet;
            updated.petName = pet.name;
          }
        }
        
        if (updateData.vaccineTypeId && updateData.vaccineTypeId !== current.vaccineTypeId) {
          const vaccineType = await entityStorage.getEntity<any>('vaccine_types', updateData.vaccineTypeId);
          if (vaccineType) {
            updated.vaccineType = vaccineType;
            updated.vaccineTypeName = vaccineType.name;
          }
        }
        
        if (updateData.administeringVetId && updateData.administeringVetId !== current.administeringVetId) {
          const vet = await entityStorage.getEntity<any>('clients', updateData.administeringVetId);
          if (vet) {
            updated.administeringVet = vet;
            updated.administeringVetName = vet.name || vet.email;
          }
        }
      } catch (error) {
        console.warn('[useOfflineVaccinations] Failed to fetch relationships:', error);
      }
      
      // Update in IndexedDB
      const result = await update(id, updated);
      
      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'update', updated);
      
      console.log('[useOfflineVaccinations] Vaccination updated:', result);
      
      toast({
        title: isOnline ? 'Vaccination updated' : 'Update saved offline',
        description: isOnline
          ? 'The vaccination has been updated and will sync automatically'
          : 'Changes will sync when you\'re back online',
      });
      
      return result!;
    } catch (err: any) {
      console.error('[useOfflineVaccinations] Update error:', err);
      toast({
        title: 'Failed to update vaccination',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [update, getById, addOperation, isOnline, toast]);

  // Delete vaccination
  const deleteVaccination = useCallback(async (id: string | number): Promise<void> => {
    try {
      console.log('[useOfflineVaccinations] Delete vaccination:', id);
      
      // Remove from IndexedDB
      await remove(id);
      
      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'delete', { id });
      
      console.log('[useOfflineVaccinations] Vaccination deleted');
      
      toast({
        title: isOnline ? 'Vaccination deleted' : 'Deletion saved offline',
        description: isOnline
          ? 'The vaccination has been deleted and will sync automatically'
          : 'Deletion will sync when you\'re back online',
      });
    } catch (err: any) {
      console.error('[useOfflineVaccinations] Delete error:', err);
      toast({
        title: 'Failed to delete vaccination',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [remove, addOperation, isOnline, toast]);

  // Get vaccination by ID
  const getVaccination = useCallback(async (id: string | number): Promise<Vaccination | null> => {
    try {
      return await getById(id);
    } catch (err: any) {
      console.error('[useOfflineVaccinations] Get error:', err);
      return null;
    }
  }, [getById]);

  // Filtering functions
  const getCompletedVaccinations = useCallback((): Vaccination[] => {
    return vaccinations.filter(v => v.status === 'completed');
  }, [vaccinations]);

  const getScheduledVaccinations = useCallback((): Vaccination[] => {
    return vaccinations.filter(v => v.status === 'scheduled');
  }, [vaccinations]);

  const getVaccinationsByStatus = useCallback((status: VaccinationStatus): Vaccination[] => {
    return vaccinations.filter(v => v.status === status);
  }, [vaccinations]);

  const getVaccinationsByPet = useCallback((petId: string | number): Vaccination[] => {
    const normalizedPetId = typeof petId === 'string' ? parseInt(petId, 10) : petId;
    return vaccinations.filter(v => v.petId === normalizedPetId);
  }, [vaccinations]);

  const getUpcomingVaccinations = useCallback((days: number = 30): Vaccination[] => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    return vaccinations.filter(v => {
      if (!v.nextDueDate) return false;
      const dueDate = new Date(v.nextDueDate);
      return dueDate >= today && dueDate <= futureDate;
    });
  }, [vaccinations]);

  const getExpiredVaccinations = useCallback((): Vaccination[] => {
    const today = new Date();
    return vaccinations.filter(v => {
      if (!v.expirationDate) return false;
      const expDate = new Date(v.expirationDate);
      return expDate < today && v.status === 'completed';
    });
  }, [vaccinations]);

  // Sync operations
  const syncNow = useCallback(async (): Promise<void> => {
    try {
      console.log('[useOfflineVaccinations] Manual sync triggered');
      await retryFailed();
      await refreshQueue();
      await refetch();
      
      toast({
        title: 'Sync complete',
        description: 'Vaccinations have been synchronized',
      });
    } catch (err: any) {
      console.error('[useOfflineVaccinations] Sync error:', err);
      toast({
        title: 'Sync failed',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [retryFailed, refreshQueue, refetch, toast]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      await refetch();
    } catch (err: any) {
      console.error('[useOfflineVaccinations] Refresh error:', err);
    }
  }, [refetch]);

  // Calculate stats
  const syncedCount = vaccinations.filter(v => v.metadata?.syncStatus === 'synced').length;
  const errorCount = vaccinations.filter(v => v.metadata?.syncStatus === 'error').length;
  const hasPendingChanges = pendingCount > 0;

  return {
    // Data
    vaccinations,
    isLoading,
    error,
    
    // Network status
    isOnline,
    hasPendingChanges,
    
    // CRUD Operations
    createVaccination,
    updateVaccination,
    deleteVaccination,
    getVaccination,
    
    // Filtering
    getCompletedVaccinations,
    getScheduledVaccinations,
    getVaccinationsByStatus,
    getVaccinationsByPet,
    getUpcomingVaccinations,
    getExpiredVaccinations,
    
    // Sync operations
    syncNow,
    refresh,
    
    // Stats
    pendingCount,
    syncedCount,
    errorCount,
  };
}
