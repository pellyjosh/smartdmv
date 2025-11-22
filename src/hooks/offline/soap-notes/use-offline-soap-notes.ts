/**
 * Offline SOAP Notes Hook
 * Handles SOAP note CRUD operations with offline support
 */

import React, { useState, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import type { EntityType } from '@/lib/offline/types/storage.types';

export interface SoapNote {
  id?: string | number;
  appointmentId?: number | null;
  petId: number;
  practitionerId: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  // Subjective tab fields
  chiefComplaint?: string[];
  patientHistory?: string;
  symptoms?: string;
  duration?: string;
  // Objective tab fields - vital signs
  temperature?: string;
  heartRate?: string;
  respiratoryRate?: string;
  weight?: string;
  bloodPressure?: string;
  oxygenSaturation?: string;
  // Objective tab fields - physical exam
  generalAppearance?: string;
  hydration?: string;
  // Objective tab fields - cardiovascular
  heartSounds?: string;
  cardiovascularNotes?: string;
  // Objective tab fields - respiratory
  lungSounds?: string;
  respiratoryEffort?: string;
  respiratoryNotes?: string;
  // Objective tab fields - gastrointestinal
  abdomenPalpation?: string;
  bowelSounds?: string;
  gastrointestinalNotes?: string;
  // Objective tab fields - musculoskeletal
  gait?: string;
  jointStatus?: string;
  musculoskeletalNotes?: string;
  // Objective tab fields - neurological
  mentalStatus?: string;
  reflexes?: string;
  neurologicalNotes?: string;
  // Objective tab fields - integumentary/skin
  skinCondition?: string;
  coatCondition?: string;
  skinNotes?: string;
  // Assessment tab fields
  primaryDiagnosis?: string[];
  differentialDiagnoses?: string[];
  progressStatus?: string;
  confirmationStatus?: string;
  progressNotes?: string;
  // Plan tab fields
  treatment?: string;
  medications?: any[];
  procedures?: string[];
  procedureNotes?: string;
  diagnostics?: string[];
  clientEducation?: string;
  followUpTimeframe?: string;
  followUpReason?: string;
  // Flags
  hasPrescriptions?: boolean;
  hasAttachments?: boolean;
  hasTreatments?: boolean;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // Offline metadata
  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: number;
    userId?: number;
  };
}

export interface UseOfflineSoapNotesReturn {
  // Data
  soapNotes: SoapNote[];
  isLoading: boolean;
  error: string | null;

  // Network status
  isOnline: boolean;
  hasPendingChanges: boolean;

  // CRUD Operations
  createSoapNote: (soapNote: Omit<SoapNote, 'id'>) => Promise<SoapNote>;
  updateSoapNote: (id: string | number, soapNote: Partial<SoapNote>) => Promise<SoapNote>;
  deleteSoapNote: (id: string | number) => Promise<void>;
  getSoapNote: (id: string | number) => Promise<SoapNote | null>;

  // Query Operations
  getSoapNotesByPet: (petId: number) => Promise<SoapNote[]>;
  getSoapNotesByPractitioner: (practitionerId: number) => Promise<SoapNote[]>;
  getRecentSoapNotes: (limit?: number) => Promise<SoapNote[]>;

  // Sync operations
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;

  // Stats
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'soapNotes';

export function useOfflineSoapNotes(): UseOfflineSoapNotesReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: soapNotes, save, update, remove, getById, refetch, isLoading, error: storageError } =
    useOfflineStorage<SoapNote>({ entityType: ENTITY_TYPE, autoLoad: true });
  const { addOperation, retryFailed, clearCompleted, stats, refresh: refreshQueue } = useSyncQueue();

  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Update error from storage
  React.useEffect(() => {
    if (storageError) {
      setError(storageError);
    }
  }, [storageError]);

  // Update pending count from stats
  React.useEffect(() => {
    if (stats) {
      setPendingCount(stats.pending + stats.failed);
    }
  }, [stats]);

  // Create SOAP note
  const createSoapNote = useCallback(async (soapNote: Omit<SoapNote, 'id'>): Promise<SoapNote> => {
    try {
      // Generate temporary ID for offline
      const tempId = `temp_soap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Remove metadata from saved data
      const { metadata: _, ...soapNoteData } = soapNote as any;

      // Normalize numeric fields
      const normalizedData = {
        ...soapNoteData,
        appointmentId: soapNoteData.appointmentId ? Number(soapNoteData.appointmentId) : null,
        petId: Number(soapNoteData.petId),
        practitionerId: Number(soapNoteData.practitionerId),
      };

      const newSoapNote: SoapNote = {
        ...normalizedData,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending' as const,
        }
      };

      console.log('[useOfflineSoapNotes] Creating SOAP note:', newSoapNote);

      // Save to IndexedDB (will throw on error)
      const saved = await save(newSoapNote);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, tempId, 'create', normalizedData);

      toast({
        title: isOnline ? 'SOAP Note created' : 'SOAP Note saved offline',
        description: isOnline
          ? 'The SOAP note has been created and will sync automatically'
          : 'The SOAP note will sync when you\'re back online',
      });

      return saved!;
    } catch (err: any) {
      console.error('[useOfflineSoapNotes] Create error:', err);
      toast({
        title: 'Failed to create SOAP note',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  // Update SOAP note
  const updateSoapNote = useCallback(async (id: string | number, updates: Partial<SoapNote>): Promise<SoapNote> => {
    try {
      console.log('[useOfflineSoapNotes] Update SOAP note:', { id, updates });

      const existing = await getById(id);
      if (!existing) {
        throw new Error('SOAP note not found');
      }

      // Remove metadata from saved data
      const { metadata: _, ...updateData } = updates as any;

      // Normalize numeric fields if present
      if (updateData.appointmentId !== undefined) {
        updateData.appointmentId = updateData.appointmentId ? Number(updateData.appointmentId) : null;
      }
      if (updateData.petId !== undefined) {
        updateData.petId = Number(updateData.petId);
      }
      if (updateData.practitionerId !== undefined) {
        updateData.practitionerId = Number(updateData.practitionerId);
      }

      const updatedData: SoapNote = {
        ...existing,
        ...updateData,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
        metadata: {
          ...existing.metadata,
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      console.log('[useOfflineSoapNotes] Updating IndexedDB with:', updatedData);

      // Update in IndexedDB (will throw on error)
      const result = await update(id, updatedData);

      console.log('[useOfflineSoapNotes] IndexedDB update result:', result);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'update', updateData);

      console.log('[useOfflineSoapNotes] Added to sync queue:', { id, updateData });

      toast({
        title: isOnline ? 'SOAP Note updated' : 'Changes saved offline',
        description: isOnline
          ? 'The SOAP note has been updated and will sync automatically'
          : 'Changes will sync when you\'re back online',
      });

      return result!;
    } catch (err: any) {
      console.error('[useOfflineSoapNotes] Update error:', err);
      toast({
        title: 'Failed to update SOAP note',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [getById, update, addOperation, isOnline, toast]);

  // Delete SOAP note
  const deleteSoapNote = useCallback(async (id: string | number): Promise<void> => {
    try {
      // Soft delete in IndexedDB
      await remove(id);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'delete', { id });

      toast({
        title: isOnline ? 'SOAP Note deleted' : 'Deletion saved offline',
        description: isOnline
          ? 'The SOAP note has been deleted and will sync automatically'
          : 'Deletion will sync when you\'re back online',
      });
    } catch (err: any) {
      console.error('[useOfflineSoapNotes] Delete error:', err);
      toast({
        title: 'Failed to delete SOAP note',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [remove, addOperation, isOnline, toast]);

  // Get single SOAP note
  const getSoapNote = useCallback(async (id: string | number): Promise<SoapNote | null> => {
    return getById(id);
  }, [getById]);

  // Get SOAP notes by pet
  const getSoapNotesByPet = useCallback(async (petId: number): Promise<SoapNote[]> => {
    // Filter in-memory for now - can optimize later
    return soapNotes.filter(note => note.petId === petId);
  }, [soapNotes]);

  // Get SOAP notes by practitioner
  const getSoapNotesByPractitioner = useCallback(async (practitionerId: number): Promise<SoapNote[]> => {
    // Filter in-memory for now - can optimize later
    return soapNotes.filter(note => note.practitionerId === practitionerId);
  }, [soapNotes]);

  // Get recent SOAP notes
  const getRecentSoapNotes = useCallback(async (limit: number = 10): Promise<SoapNote[]> => {
    // Sort by created date descending and limit
    return soapNotes
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }, [soapNotes]);

  // Sync now
  const syncNow = useCallback(async (): Promise<void> => {
    try {
      await retryFailed();
      await refreshQueue();
      await refetch();

      toast({
        title: 'Sync initiated',
        description: 'Syncing your offline SOAP notes...',
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
    soapNotes,
    isLoading,
    error,
    isOnline,
    hasPendingChanges: pendingCount > 0,
    createSoapNote,
    updateSoapNote,
    deleteSoapNote,
    getSoapNote,
    getSoapNotesByPet,
    getSoapNotesByPractitioner,
    getRecentSoapNotes,
    syncNow,
    refresh,
    pendingCount,
    syncedCount: soapNotes.filter(n => n.metadata?.syncStatus === 'synced').length,
    errorCount: soapNotes.filter(n => n.metadata?.syncStatus === 'error').length,
  };
}
