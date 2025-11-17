/**
 * Offline Clients Hook
 * Handles client CRUD operations with offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import type { EntityType } from '@/lib/offline/types/storage.types';

export interface Client {
  id?: string | number;
  name: string;
  email: string;
  username: string;
  password?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  practiceId: number;
  role: string;
  isActive?: boolean;
  smsOptOut?: boolean;
  currentPracticeId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  
  // Offline metadata
  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: number;
    userId?: number;
  };
}

export interface UseOfflineClientsReturn {
  // Data
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  
  // Network status
  isOnline: boolean;
  hasPendingChanges: boolean;
  
  // CRUD Operations
  createClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string | number, client: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string | number) => Promise<void>;
  getClient: (id: string | number) => Promise<Client | null>;
  
  // Sync operations
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Stats
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'clients';

export function useOfflineClients(): UseOfflineClientsReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: clients, save, update, remove, getById, refetch, isLoading, error: storageError } = 
    useOfflineStorage<Client>({ entityType: ENTITY_TYPE, autoLoad: true });
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

  // Create client
  const createClient = useCallback(async (client: Omit<Client, 'id'>): Promise<Client> => {
    try {
      // Generate temporary ID for offline
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove password and metadata from saved data
      const { password, metadata: _, ...clientData } = client as any;
      
      // Normalize numeric fields
      const normalizedData = {
        ...clientData,
        practiceId: typeof clientData.practiceId === 'string' ? parseInt(clientData.practiceId, 10) : clientData.practiceId,
        currentPracticeId: clientData.currentPracticeId ? 
          (typeof clientData.currentPracticeId === 'string' ? parseInt(clientData.currentPracticeId, 10) : clientData.currentPracticeId) 
          : null,
        isActive: clientData.isActive !== undefined ? clientData.isActive : true,
        smsOptOut: clientData.smsOptOut !== undefined ? clientData.smsOptOut : false,
        role: clientData.role || 'CLIENT',
      };
      
      const newClient: Client = {
        ...normalizedData,
        id: tempId,
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending' as const,
        }
      };

      console.log('[useOfflineClients] Creating client:', newClient);

      // Save to IndexedDB (will throw on error)
      const saved = await save(newClient);

      // Add to sync queue with password if provided
      const syncData = { ...normalizedData };
      if (password) {
        syncData.password = password; // Include password only in sync queue
      }
      
      await addOperation(ENTITY_TYPE, tempId, 'create', syncData);

      toast({
        title: isOnline ? 'Client created' : 'Client saved offline',
        description: isOnline 
          ? 'The client has been created and will sync automatically'
          : 'The client will sync when you\'re back online',
      });

      return saved!;
    } catch (err: any) {
      console.error('[useOfflineClients] Create error:', err);
      toast({
        title: 'Failed to create client',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  // Update client
  const updateClient = useCallback(async (id: string | number, updates: Partial<Client>): Promise<Client> => {
    try {
      console.log('[useOfflineClients] Update client:', { id, updates });
      
      const existing = await getById(id);
      if (!existing) {
        throw new Error('Client not found');
      }

      // Remove password and metadata from saved data
      const { password, metadata: _, ...updateData } = updates as any;
      
      // Normalize numeric fields if present
      if (updateData.practiceId !== undefined) {
        updateData.practiceId = typeof updateData.practiceId === 'string' ? 
          parseInt(updateData.practiceId, 10) : updateData.practiceId;
      }
      if (updateData.currentPracticeId !== undefined && updateData.currentPracticeId !== null) {
        updateData.currentPracticeId = typeof updateData.currentPracticeId === 'string' ? 
          parseInt(updateData.currentPracticeId, 10) : updateData.currentPracticeId;
      }

      const updatedData: Client = {
        ...existing,
        ...updateData,
        id, // Ensure ID doesn't change
        metadata: {
          ...existing.metadata,
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      console.log('[useOfflineClients] Updating IndexedDB with:', updatedData);
      
      // Update in IndexedDB (will throw on error)
      const result = await update(id, updatedData);

      console.log('[useOfflineClients] IndexedDB update result:', result);

      // Add to sync queue with password if provided
      const syncData = { ...updateData };
      if (password) {
        syncData.password = password; // Include password only in sync queue
      }
      
      await addOperation(ENTITY_TYPE, id, 'update', syncData);
      
      console.log('[useOfflineClients] Added to sync queue:', { id, syncData });

      toast({
        title: isOnline ? 'Client updated' : 'Changes saved offline',
        description: isOnline
          ? 'The client has been updated and will sync automatically'
          : 'Changes will sync when you\'re back online',
      });

      return result!;
    } catch (err: any) {
      console.error('[useOfflineClients] Update error:', err);
      toast({
        title: 'Failed to update client',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [getById, update, addOperation, isOnline, toast]);

  // Delete client
  const deleteClient = useCallback(async (id: string | number): Promise<void> => {
    try {
      // Soft delete in IndexedDB
      await remove(id);

      // Add to sync queue
      await addOperation(ENTITY_TYPE, id, 'delete', { id });

      toast({
        title: isOnline ? 'Client deleted' : 'Deletion saved offline',
        description: isOnline
          ? 'The client has been deleted and will sync automatically'
          : 'Deletion will sync when you\'re back online',
      });
    } catch (err: any) {
      console.error('[useOfflineClients] Delete error:', err);
      toast({
        title: 'Failed to delete client',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [remove, addOperation, isOnline, toast]);

  // Get single client
  const getClient = useCallback(async (id: string | number): Promise<Client | null> => {
    return getById(id);
  }, [getById]);

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

  // Filter to only include users with CLIENT role
  const filteredClients = clients.filter(client => client.role === 'CLIENT');

  return {
    clients: filteredClients,
    isLoading,
    error,
    isOnline,
    hasPendingChanges: pendingCount > 0,
    createClient,
    updateClient,
    deleteClient,
    getClient,
    syncNow,
    refresh,
    pendingCount,
    syncedCount: filteredClients.filter(c => c.metadata?.syncStatus === 'synced').length,
    errorCount: filteredClients.filter(c => c.metadata?.syncStatus === 'error').length,
  };
}
