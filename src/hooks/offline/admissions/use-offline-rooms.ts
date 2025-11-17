/**
 * Offline Rooms Hook
 * Read-only access to admission rooms (managed online only)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import type { EntityType } from '@/lib/offline/types/storage.types';

export interface Room {
  id?: string | number;
  roomNumber: string;
  type: string;
  capacity: number;
  status: 'available' | 'occupied' | 'maintenance';
  notes?: string | null;
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

export interface UseOfflineRoomsReturn {
  // Data
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
  
  // Network status
  isOnline: boolean;
  
  // Read-only operations (rooms are managed online only)
  getRoom: (id: string | number) => Promise<Room | null>;
  
  // Filtering
  getAvailableRooms: () => Room[];
  getRoomsByType: (type: string) => Room[];
  getRoomsByStatus: (status: 'available' | 'occupied' | 'maintenance') => Room[];
  
  // Sync operations
  refresh: () => Promise<void>;
}

const ENTITY_TYPE: EntityType = 'rooms';

export function useOfflineRooms(): UseOfflineRoomsReturn {
  const { isOnline } = useNetworkStatus();
  const { data: rooms, getById, refetch, isLoading, error: storageError } = 
    useOfflineStorage<Room>({ entityType: ENTITY_TYPE, autoLoad: true });
  
  const [error, setError] = useState<string | null>(null);

  // Update error from storage
  useEffect(() => {
    if (storageError) {
      setError(storageError);
    }
  }, [storageError]);

  // Get room by ID
  const getRoom = useCallback(async (id: string | number): Promise<Room | null> => {
    try {
      return await getById(id);
    } catch (err: any) {
      console.error('[useOfflineRooms] Get error:', err);
      return null;
    }
  }, [getById]);

  // Get available rooms
  const getAvailableRooms = useCallback(() => {
    return rooms.filter(room => room.status === 'available');
  }, [rooms]);

  // Get rooms by type
  const getRoomsByType = useCallback((type: string) => {
    return rooms.filter(room => room.type === type);
  }, [rooms]);

  // Get rooms by status
  const getRoomsByStatus = useCallback((status: 'available' | 'occupied' | 'maintenance') => {
    return rooms.filter(room => room.status === status);
  }, [rooms]);

  // Refresh data (read-only)
  const refresh = useCallback(async (): Promise<void> => {
    try {
      await refetch();
    } catch (err: any) {
      console.error('[useOfflineRooms] Refresh error:', err);
    }
  }, [refetch]);

  return {
    // Data
    rooms,
    isLoading,
    error,
    
    // Network status
    isOnline,
    
    // Read-only operations
    getRoom,
    
    // Filtering
    getAvailableRooms,
    getRoomsByType,
    getRoomsByStatus,
    
    // Sync operations
    refresh,
  };
}
