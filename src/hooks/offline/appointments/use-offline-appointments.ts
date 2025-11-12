/**
 * Offline Appointments Hook
 * Handles appointments CRUD operations with offline support and automatic sync
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import type { EntityType } from '@/lib/offline/types/storage.types';

export interface Appointment {
  id?: string;
  // Core appointment fields matching PostgreSQL schema
  title: string;
  description?: string | null;
  date: string; // ISO date string
  durationMinutes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'triage' | 'active' | 'in_treatment' | 'in_progress' | 'completed' | 'pending_pickup' | 'cancelled' | 'no_show';
  
  // Foreign keys
  petId: string | null;
  clientId: string | null;
  staffId?: string | null;
  practitionerId?: string | null;
  practiceId?: string;
  
  // Appointment details
  type?: string | null;
  source?: 'internal' | 'external';
  
  // Telemedicine fields
  roomId?: string | null;
  notes?: string | null;
  telemedicineStartedAt?: string | null;
  telemedicineEndedAt?: string | null;
  
  // Timestamps (managed by sync)
  createdAt?: string;
  updatedAt?: string;
  
  // Offline metadata
  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: string;
    userId?: string;
  };
}

export interface UseOfflineAppointmentsReturn {
  // Data
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  
  // Network status
  isOnline: boolean;
  hasPendingChanges: boolean;
  
  // CRUD Operations
  createAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<Appointment>;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointment: (id: string) => Promise<Appointment | null>;
  
  // Filtering
  getAppointmentsByDate: (date: string) => Appointment[];
  getAppointmentsByClient: (clientId: string) => Appointment[];
  getAppointmentsByPet: (petId: string) => Appointment[];
  getAppointmentsByStatus: (status: Appointment['status']) => Appointment[];
  
  // Sync operations
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Stats
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'appointments';

export function useOfflineAppointments(): UseOfflineAppointmentsReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: appointments, save, update, remove, getById, refetch, isLoading, error: storageError } = 
    useOfflineStorage<Appointment>({ entityType: ENTITY_TYPE, autoLoad: true });
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

  // Create appointment
  const createAppointment = useCallback(async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
    try {
      // Generate temporary ID for offline
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove any existing metadata to avoid conflicts
      const { metadata: _, ...appointmentData } = appointment as any;
      
      const newAppointment: Appointment = {
        ...appointmentData,
        id: tempId,
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending' as const,
        }
      };

      console.log('[useOfflineAppointments] Creating appointment:', newAppointment);

      // Save to IndexedDB (will throw on error)
      const saved = await save(newAppointment);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, tempId, 'create', newAppointment);

      toast({
        title: isOnline ? 'Appointment created' : 'Appointment saved offline',
        description: isOnline 
          ? 'The appointment has been created and will sync automatically'
          : 'The appointment will sync when you\'re back online',
      });

      return saved!; // We know it's not null because save() throws on error
    } catch (err: any) {
      console.error('[useOfflineAppointments] Create error:', err);
      toast({
        title: 'Failed to create appointment',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  // Update appointment
  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
    try {
      const existing = await getById(id);
      if (!existing) {
        throw new Error('Appointment not found');
      }

      const updatedData: Appointment = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        metadata: {
          ...existing.metadata,
          ...updates.metadata,
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      // Update in IndexedDB (will throw on error)
      const result = await update(id, updatedData);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'update', updatedData);

      toast({
        title: isOnline ? 'Appointment updated' : 'Changes saved offline',
        description: isOnline
          ? 'The appointment has been updated and will sync automatically'
          : 'Changes will sync when you\'re back online',
      });

      return result!; // We know it's not null because update() throws on error
    } catch (err: any) {
      console.error('[useOfflineAppointments] Update error:', err);
      toast({
        title: 'Failed to update appointment',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [getById, update, addOperation, isOnline, toast]);

  // Delete appointment
  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    try {
      const existing = await getById(id);
      if (!existing) {
        throw new Error('Appointment not found');
      }

      // Remove from IndexedDB (will throw on error)
      await remove(id);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'delete', existing);

      toast({
        title: isOnline ? 'Appointment deleted' : 'Deletion saved offline',
        description: isOnline
          ? 'The appointment has been deleted and will sync automatically'
          : 'Deletion will sync when you\'re back online',
      });
    } catch (err: any) {
      console.error('[useOfflineAppointments] Delete error:', err);
      toast({
        title: 'Failed to delete appointment',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [getById, remove, addOperation, isOnline, toast]);

  // Get single appointment
  const getAppointment = useCallback(async (id: string): Promise<Appointment | null> => {
    try {
      return await getById(id);
    } catch (err: any) {
      console.error('[useOfflineAppointments] Get error:', err);
      return null;
    }
  }, [getById]);

  // Filter by date
  const getAppointmentsByDate = useCallback((date: string): Appointment[] => {
    return appointments.filter(apt => apt.date === date);
  }, [appointments]);

  // Filter by client
  const getAppointmentsByClient = useCallback((clientId: string): Appointment[] => {
    return appointments.filter(apt => apt.clientId === clientId);
  }, [appointments]);

  // Filter by pet
  const getAppointmentsByPet = useCallback((petId: string): Appointment[] => {
    return appointments.filter(apt => apt.petId === petId);
  }, [appointments]);

  // Filter by status
  const getAppointmentsByStatus = useCallback((status: Appointment['status']): Appointment[] => {
    return appointments.filter(apt => apt.status === status);
  }, [appointments]);

  // Sync now
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: 'Cannot sync',
        description: 'You are currently offline',
        variant: 'destructive',
      });
      return;
    }

    try {
      await retryFailed();
      await refetch();
      await refreshQueue();
      
      toast({
        title: 'Sync complete',
        description: 'All appointments have been synchronized',
      });
    } catch (err: any) {
      console.error('[useOfflineAppointments] Sync error:', err);
      toast({
        title: 'Sync failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  }, [isOnline, retryFailed, refetch, refreshQueue, toast]);

  // Refresh from IndexedDB
  const refresh = useCallback(async () => {
    await refetch();
    await refreshQueue();
  }, [refetch, refreshQueue]);

  // Calculate stats
  const syncedCount = appointments.filter(apt => apt.metadata?.syncStatus === 'synced').length;
  const errorCount = appointments.filter(apt => apt.metadata?.syncStatus === 'error').length;

  return {
    // Data
    appointments,
    isLoading,
    error,
    
    // Network status
    isOnline,
    hasPendingChanges: pendingCount > 0,
    
    // CRUD Operations
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointment,
    
    // Filtering
    getAppointmentsByDate,
    getAppointmentsByClient,
    getAppointmentsByPet,
    getAppointmentsByStatus,
    
    // Sync operations
    syncNow,
    refresh,
    
    // Stats
    pendingCount,
    syncedCount,
    errorCount,
  };
}
