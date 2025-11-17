/**
 * Offline Admissions Hook
 * Handles admission CRUD operations with offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import * as entityStorage from '@/lib/offline/storage/entity-storage';
import type { EntityType } from '@/lib/offline/types/storage.types';

export type AdmissionStatus = 'pending' | 'admitted' | 'discharged' | 'hold' | 'isolation';

export interface Admission {
  id?: string | number;
  petId: number;
  clientId: number;
  attendingVetId: number;
  reason: string;
  notes?: string | null;
  roomId?: number | null;
  status: AdmissionStatus;
  admissionDate: string;
  dischargeDate?: string | null;
  practiceId: number;
  createdById?: number;
  updatedById?: number | null;
  createdAt?: string;
  updatedAt?: string | null;
  
  // Relationships (populated from IndexedDB)
  pet?: any;
  client?: any;
  attendingVet?: any;
  room?: any;
  
  // Computed fields for display
  petName?: string;
  clientName?: string;
  attendingVetName?: string;
  roomNumber?: string | null;
  
  // Offline metadata
  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: number;
    userId?: number;
  };
}

export interface UseOfflineAdmissionsReturn {
  // Data
  admissions: Admission[];
  isLoading: boolean;
  error: string | null;
  
  // Network status
  isOnline: boolean;
  hasPendingChanges: boolean;
  
  // CRUD Operations
  createAdmission: (admission: Omit<Admission, 'id'>) => Promise<Admission>;
  updateAdmission: (id: string | number, admission: Partial<Admission>) => Promise<Admission>;
  deleteAdmission: (id: string | number) => Promise<void>;
  dischargeAdmission: (id: string | number, notes?: string) => Promise<Admission>;
  getAdmission: (id: string | number) => Promise<Admission | null>;
  
  // Filtering
  getActiveAdmissions: () => Admission[];
  getAdmissionsByStatus: (status: AdmissionStatus) => Admission[];
  getAdmissionsByPet: (petId: string | number) => Admission[];
  getAdmissionsByRoom: (roomId: string | number) => Admission[];
  
  // Sync operations
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Stats
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'admissions';

export function useOfflineAdmissions(): UseOfflineAdmissionsReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: admissions, save, update, remove, getById, refetch, isLoading, error: storageError } = 
    useOfflineStorage<Admission>({ entityType: ENTITY_TYPE, autoLoad: true });
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

  // Create admission
  const createAdmission = useCallback(async (admission: Omit<Admission, 'id'>): Promise<Admission> => {
    try {
      console.log('[useOfflineAdmissions] Create admission:', admission);
      
      // Generate temporary ID for offline
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove any existing metadata to avoid conflicts
      const { metadata: _, ...admissionData } = admission as any;
      
      // Normalize numeric fields
      const numericFields = ['petId', 'clientId', 'attendingVetId', 'practiceId', 'roomId'];
      numericFields.forEach(field => {
        if (admissionData[field] !== null && admissionData[field] !== undefined) {
          const value = admissionData[field];
          if (typeof value === 'string') {
            const num = parseInt(value, 10);
            if (!isNaN(num)) {
              admissionData[field] = num;
            }
          }
        }
      });
      
      // Fetch and attach relationships
      try {
        if (admissionData.petId) {
          const pet = await entityStorage.getEntity<any>('pets', admissionData.petId);
          if (pet) {
            admissionData.pet = pet;
            admissionData.petName = pet.name;
          }
        }
        
        if (admissionData.clientId) {
          const client = await entityStorage.getEntity<any>('clients', admissionData.clientId);
          if (client) {
            admissionData.client = client;
            admissionData.clientName = client.name || client.email;
          }
        }
        
        if (admissionData.attendingVetId) {
          const vet = await entityStorage.getEntity<any>('clients', admissionData.attendingVetId);
          if (vet) {
            admissionData.attendingVet = vet;
            admissionData.attendingVetName = vet.name || vet.email;
          }
        }
        
        if (admissionData.roomId) {
          const room = await entityStorage.getEntity<any>('rooms', admissionData.roomId);
          if (room) {
            admissionData.room = room;
            admissionData.roomNumber = room.roomNumber;
          }
        }
      } catch (error) {
        console.warn('[useOfflineAdmissions] Failed to fetch relationships:', error);
      }
      
      const newAdmission: Admission = {
        ...admissionData,
        id: tempId,
        admissionDate: admissionData.admissionDate || new Date().toISOString(),
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending' as const,
        }
      };
      
      // Save to IndexedDB
      const result = await save(newAdmission);
      
      // Add to sync queue
      await addOperation(ENTITY_TYPE, tempId, 'create', newAdmission);
      
      console.log('[useOfflineAdmissions] Admission created:', result);
      
      toast({
        title: isOnline ? 'Admission created' : 'Admission saved offline',
        description: isOnline
          ? 'The admission has been created and will sync automatically'
          : 'Admission will be created when you\'re back online',
      });
      
      return result!;
    } catch (err: any) {
      console.error('[useOfflineAdmissions] Create error:', err);
      toast({
        title: 'Failed to create admission',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  // Update admission
  const updateAdmission = useCallback(async (id: string | number, updates: Partial<Admission>): Promise<Admission> => {
    try {
      console.log('[useOfflineAdmissions] Update admission:', { id, updates });
      
      const existing = await getById(id);
      if (!existing) {
        throw new Error('Admission not found');
      }

      // Remove metadata from updates
      const { metadata: _, ...updateData } = updates as any;
      
      // Normalize numeric fields if present
      const numericFields = ['petId', 'clientId', 'attendingVetId', 'practiceId', 'roomId'];
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

      const updatedData: Admission = {
        ...existing,
        ...updateData,
        id, // Ensure ID doesn't change
        metadata: {
          ...existing.metadata,
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      console.log('[useOfflineAdmissions] Updating IndexedDB with:', updatedData);
      
      // Update in IndexedDB
      const result = await update(id, updatedData);
      console.log('[useOfflineAdmissions] IndexedDB update result:', result);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'update', updateData);
      console.log('[useOfflineAdmissions] Added to sync queue:', { id, updateData });

      toast({
        title: isOnline ? 'Admission updated' : 'Changes saved offline',
        description: isOnline
          ? 'The admission has been updated and will sync automatically'
          : 'Changes will sync when you\'re back online',
      });

      return result!;
    } catch (err: any) {
      console.error('[useOfflineAdmissions] Update error:', err);
      toast({
        title: 'Failed to update admission',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [getById, update, addOperation, isOnline, toast]);

  // Delete admission
  const deleteAdmission = useCallback(async (id: string | number): Promise<void> => {
    try {
      // Soft delete in IndexedDB
      await remove(id);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'delete', { id });

      toast({
        title: isOnline ? 'Admission deleted' : 'Deletion saved offline',
        description: isOnline
          ? 'The admission has been deleted and will sync automatically'
          : 'Deletion will sync when you\'re back online',
      });
    } catch (err: any) {
      console.error('[useOfflineAdmissions] Delete error:', err);
      toast({
        title: 'Failed to delete admission',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [remove, addOperation, isOnline, toast]);

  // Discharge admission
  const dischargeAdmission = useCallback(async (id: string | number, notes?: string): Promise<Admission> => {
    return updateAdmission(id, {
      status: 'discharged',
      dischargeDate: new Date().toISOString(),
      notes: notes || undefined,
    });
  }, [updateAdmission]);

  // Get active admissions (not discharged)
  const getActiveAdmissions = useCallback(() => {
    return admissions.filter(admission => admission.status !== 'discharged');
  }, [admissions]);

  // Get admissions by status
  const getAdmissionsByStatus = useCallback((status: AdmissionStatus) => {
    return admissions.filter(admission => admission.status === status);
  }, [admissions]);

  // Get admissions by pet
  const getAdmissionsByPet = useCallback((petId: string | number) => {
    const numericPetId = typeof petId === 'string' ? parseInt(petId, 10) : petId;
    return admissions.filter(admission => admission.petId === numericPetId);
  }, [admissions]);

  // Get admissions by room
  const getAdmissionsByRoom = useCallback((roomId: string | number) => {
    const numericRoomId = typeof roomId === 'string' ? parseInt(roomId, 10) : roomId;
    return admissions.filter(admission => admission.roomId === numericRoomId);
  }, [admissions]);

  // Sync now
  const syncNow = useCallback(async () => {
    try {
      await retryFailed();
      await refreshQueue();
      await refetch();
      toast({
        title: 'Sync complete',
        description: 'All admissions have been synced with the server',
      });
    } catch (err: any) {
      console.error('[useOfflineAdmissions] Sync error:', err);
      toast({
        title: 'Sync failed',
        description: err.message || 'Failed to sync admissions',
        variant: 'destructive',
      });
    }
  }, [retryFailed, refreshQueue, refetch, toast]);

  // Refresh
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    // Data
    admissions,
    isLoading,
    error,
    
    // Network status
    isOnline,
    hasPendingChanges: pendingCount > 0,
    
    // CRUD Operations
    createAdmission,
    updateAdmission,
    deleteAdmission,
    dischargeAdmission,
    getAdmission: getById,
    
    // Filtering
    getActiveAdmissions,
    getAdmissionsByStatus,
    getAdmissionsByPet,
    getAdmissionsByRoom,
    
    // Sync operations
    syncNow,
    refresh,
    
    // Stats
    pendingCount,
    syncedCount: admissions.filter(a => a.metadata?.syncStatus === 'synced').length,
    errorCount: admissions.filter(a => a.metadata?.syncStatus === 'error').length,
  };
}
