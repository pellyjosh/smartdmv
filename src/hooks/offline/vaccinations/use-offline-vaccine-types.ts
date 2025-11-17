/**
 * Offline Vaccine Types Hook
 * Handles vaccine type CRUD operations with offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import type { EntityType } from '@/lib/offline/types/storage.types';

export interface VaccineType {
  id?: string | number;
  name: string;
  type: 'core' | 'non-core' | 'optional';
  species: string;
  manufacturer?: string | null;
  description?: string | null;
  diseasesProtected?: string | null;
  recommendedSchedule?: string | null;
  durationOfImmunity?: string | null;
  sideEffects?: string | null;
  contraindications?: string | null;
  isActive: boolean;
  practiceId: number;
  createdAt?: string;
  updatedAt?: string | null;
  
  // Offline metadata
  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: number;
    userId?: number;
  };
}

export interface UseOfflineVaccineTypesReturn {
  // Data
  vaccineTypes: VaccineType[];
  isLoading: boolean;
  error: string | null;
  
  // Network status
  isOnline: boolean;
  
  // Read-only operations (vaccine types are managed online only)
  getVaccineType: (id: string | number) => Promise<VaccineType | null>;
  
  // Filtering
  getActiveVaccineTypes: () => VaccineType[];
  getVaccineTypesBySpecies: (species: string) => VaccineType[];
  getVaccineTypesByType: (type: 'core' | 'non-core' | 'optional') => VaccineType[];
  getCoreVaccineTypes: () => VaccineType[];
  
  // Sync operations
  refresh: () => Promise<void>;
}

const ENTITY_TYPE: EntityType = 'vaccine_types';

export function useOfflineVaccineTypes(): UseOfflineVaccineTypesReturn {
  const { isOnline } = useNetworkStatus();
  const { data: vaccineTypes, getById, refetch, isLoading, error: storageError } = 
    useOfflineStorage<VaccineType>({ entityType: ENTITY_TYPE, autoLoad: true });
  
  const [error, setError] = useState<string | null>(null);

  // Update error from storage
  useEffect(() => {
    if (storageError) {
      setError(storageError);
    }
  }, [storageError]);

  // Get vaccine type by ID
  const getVaccineType = useCallback(async (id: string | number): Promise<VaccineType | null> => {
    try {
      return await getById(id);
    } catch (err: any) {
      console.error('[useOfflineVaccineTypes] Get error:', err);
      return null;
    }
  }, [getById]);

  // Filtering functions
  const getActiveVaccineTypes = useCallback((): VaccineType[] => {
    return vaccineTypes.filter(vt => vt.isActive === true);
  }, [vaccineTypes]);

  const getVaccineTypesBySpecies = useCallback((species: string): VaccineType[] => {
    return vaccineTypes.filter(vt => 
      vt.isActive && 
      (vt.species.toLowerCase() === species.toLowerCase() || vt.species === 'all')
    );
  }, [vaccineTypes]);

  const getVaccineTypesByType = useCallback((type: 'core' | 'non-core' | 'optional'): VaccineType[] => {
    return vaccineTypes.filter(vt => vt.isActive && vt.type === type);
  }, [vaccineTypes]);

  const getCoreVaccineTypes = useCallback((): VaccineType[] => {
    return vaccineTypes.filter(vt => vt.isActive && vt.type === 'core');
  }, [vaccineTypes]);

  // Refresh data (read-only)
  const refresh = useCallback(async (): Promise<void> => {
    try {
      await refetch();
    } catch (err: any) {
      console.error('[useOfflineVaccineTypes] Refresh error:', err);
    }
  }, [refetch]);

  return {
    // Data
    vaccineTypes,
    isLoading,
    error,
    
    // Network status
    isOnline,
    
    // Read-only operations
    getVaccineType,
    
    // Filtering
    getActiveVaccineTypes,
    getVaccineTypesBySpecies,
    getVaccineTypesByType,
    getCoreVaccineTypes,
    
    // Sync operations
    refresh,
  };
}
