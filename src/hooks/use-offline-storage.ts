/**
 * React hook for offline storage operations
 */

import { useState, useEffect, useCallback } from 'react';
import { storageManager } from '../lib/offline/managers/storage-manager';
import { useOfflineInitialization } from './use-offline-initialization';
import type { SyncStatus } from '../lib/offline/types/storage.types';
import { handleOfflineError } from '../lib/offline/utils/error-handlers';

export interface UseOfflineStorageOptions {
  entityType: string;
  autoLoad?: boolean;
}

export interface UseOfflineStorageReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  save: (entity: T) => Promise<T | null>;
  update: (id: number | string, updates: Partial<T>) => Promise<T | null>;
  remove: (id: number | string) => Promise<boolean>;
  getById: (id: number | string) => Promise<T | null>;
  refetch: () => Promise<void>;
  clear: () => Promise<void>;
}

export function useOfflineStorage<T extends { id?: number | string }>(
  options: UseOfflineStorageOptions
): UseOfflineStorageReturn<T> {
  const { entityType, autoLoad = true } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Wait for offline system to be initialized
  const { initialized } = useOfflineInitialization();

  const loadData = useCallback(async () => {
    // Don't try to load if not initialized
    if (!initialized) {
      console.log('[useOfflineStorage] ⏳ Waiting for initialization before loading', entityType);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useOfflineStorage] 📂 Loading', entityType);
      const entities = await storageManager.getAllEntities<T>(entityType);
      console.log('[useOfflineStorage] ✅ Loaded', entities.length, entityType);
      setData(entities);
    } catch (err) {
      const handled = handleOfflineError(err);
      setError(handled.message);
      console.error('[useOfflineStorage] ❌ Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, initialized]);

  const save = useCallback(async (entity: T): Promise<T | null> => {
    try {
      setError(null);
      const saved = await storageManager.saveEntity<T>(entityType, entity, 'pending');
      await loadData(); // Refresh list
      return saved;
    } catch (err) {
      const handled = handleOfflineError(err);
      setError(handled.message);
      console.error('[useOfflineStorage] Save error:', err);
      return null;
    }
  }, [entityType, loadData]);

  const update = useCallback(async (
    id: number | string,
    updates: Partial<T>
  ): Promise<T | null> => {
    try {
      setError(null);
      const updated = await storageManager.updateEntity(entityType, id, updates);
      await loadData(); // Refresh list
      return updated as T;
    } catch (err) {
      const handled = handleOfflineError(err);
      setError(handled.message);
      console.error('[useOfflineStorage] Update error:', err);
      return null;
    }
  }, [entityType, loadData]);

  const remove = useCallback(async (id: number | string): Promise<boolean> => {
    try {
      setError(null);
      await storageManager.deleteEntity(entityType, id);
      await loadData(); // Refresh list
      return true;
    } catch (err) {
      const handled = handleOfflineError(err);
      setError(handled.message);
      console.error('[useOfflineStorage] Delete error:', err);
      return false;
    }
  }, [entityType, loadData]);

  const getById = useCallback(async (id: number | string): Promise<T | null> => {
    try {
      setError(null);
      return await storageManager.getEntity<T>(entityType, id);
    } catch (err) {
      const handled = handleOfflineError(err);
      setError(handled.message);
      console.error('[useOfflineStorage] GetById error:', err);
      return null;
    }
  }, [entityType]);

  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const clear = useCallback(async () => {
    try {
      setError(null);
      // This would clear the specific entity type
      setData([]);
    } catch (err) {
      const handled = handleOfflineError(err);
      setError(handled.message);
      console.error('[useOfflineStorage] Clear error:', err);
    }
  }, []);

  useEffect(() => {
    if (autoLoad && initialized) {
      console.log('[useOfflineStorage] 🚀 Auto-loading', entityType, '(initialized)');
      loadData();
    } else if (autoLoad && !initialized) {
      console.log('[useOfflineStorage] ⏸️ Auto-load waiting for initialization:', entityType);
    }
  }, [autoLoad, initialized, loadData]);

  return {
    data,
    isLoading,
    error,
    save,
    update,
    remove,
    getById,
    refetch,
    clear,
  };
}
