import { useState, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/offline/use-offline-storage';
import { useSyncQueue } from '@/hooks/offline/use-sync-queue';
import { useToast } from '@/hooks/use-toast';
import type { EntityType } from '@/lib/offline/types/storage.types';

export interface SoapTemplate {
  id?: string | number;
  name: string;
  description?: string | null;
  category?: string | null;
  speciesApplicability?: string[] | null;
  subjective_template?: string | null;
  objective_template?: string | null;
  assessment_template?: string | null;
  plan_template?: string | null;
  isDefault?: boolean;
  practiceId: number;
  createdById: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    lastModified?: number;
    syncStatus?: 'synced' | 'pending' | 'error';
    tenantId?: string;
    practiceId?: number;
    userId?: number;
  };
}

export interface UseOfflineSoapTemplatesReturn {
  soapTemplates: SoapTemplate[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  hasPendingChanges: boolean;
  createTemplate: (template: Omit<SoapTemplate, 'id'>) => Promise<SoapTemplate>;
  updateTemplate: (id: string | number, updates: Partial<SoapTemplate>) => Promise<SoapTemplate>;
  deleteTemplate: (id: string | number) => Promise<void>;
  getTemplate: (id: string | number) => Promise<SoapTemplate | null>;
  refresh: () => Promise<void>;
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const ENTITY_TYPE: EntityType = 'soapTemplates';

export function useOfflineSoapTemplates(): UseOfflineSoapTemplatesReturn {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const { data: soapTemplates, save, update, remove, getById, refetch, isLoading, error: storageError } =
    useOfflineStorage<SoapTemplate>({ entityType: ENTITY_TYPE, autoLoad: true });
  const { addOperation, stats, refresh: refreshQueue } = useSyncQueue();

  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  if (storageError && storageError !== error) {
    setError(storageError);
  }

  if (stats && pendingCount !== (stats.pending + stats.failed)) {
    setPendingCount(stats.pending + stats.failed);
  }

  const createTemplate = useCallback(async (template: Omit<SoapTemplate, 'id'>): Promise<SoapTemplate> => {
    try {
      const tempId = `temp_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { metadata: _, ...templateData } = template as any;

      const normalizedData = {
        ...templateData,
        practiceId: Number(templateData.practiceId),
        createdById: Number(templateData.createdById),
      } as SoapTemplate;

      const newTemplate: SoapTemplate = {
        ...normalizedData,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      const saved = await save(newTemplate);
      await addOperation(ENTITY_TYPE, tempId, 'create', normalizedData);

      toast({
        title: isOnline ? 'Template created' : 'Template saved offline',
        description: isOnline
          ? 'The template has been created and will sync automatically'
          : 'The template will sync when you\'re back online',
      });

      return saved!;
    } catch (err: any) {
      toast({
        title: 'Failed to create template',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [save, addOperation, isOnline, toast]);

  const updateTemplate = useCallback(async (id: string | number, updates: Partial<SoapTemplate>): Promise<SoapTemplate> => {
    try {
      const existing = await getById(id);
      if (!existing) {
        throw new Error('Template not found');
      }

      const { metadata: _, ...updateData } = updates as any;

      const updatedData: SoapTemplate = {
        ...existing,
        ...updateData,
        id,
        updatedAt: new Date().toISOString(),
        metadata: {
          ...existing.metadata,
          lastModified: Date.now(),
          syncStatus: 'pending',
        }
      };

      const result = await update(id, updatedData);
      await addOperation(ENTITY_TYPE, id, 'update', updateData);

      toast({
        title: isOnline ? 'Template updated' : 'Changes saved offline',
        description: isOnline
          ? 'The template has been updated and will sync automatically'
          : 'Changes will sync when you\'re back online',
      });

      return result!;
    } catch (err: any) {
      toast({
        title: 'Failed to update template',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [getById, update, addOperation, isOnline, toast]);

  const deleteTemplate = useCallback(async (id: string | number): Promise<void> => {
    try {
      await remove(id);
      await addOperation(ENTITY_TYPE, id, 'delete', { id });

      toast({
        title: isOnline ? 'Template deleted' : 'Deletion saved offline',
        description: isOnline
          ? 'The template has been deleted and will sync automatically'
          : 'Deletion will sync when you\'re back online',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to delete template',
        description: err.message || 'An unknown error occurred',
        variant: 'destructive',
      });
      throw err;
    }
  }, [remove, addOperation, isOnline, toast]);

  const getTemplate = useCallback(async (id: string | number): Promise<SoapTemplate | null> => {
    return getById(id);
  }, [getById]);

  const refresh = useCallback(async (): Promise<void> => {
    await refreshQueue();
    await refetch();
  }, [refreshQueue, refetch]);

  return {
    soapTemplates,
    isLoading,
    error,
    isOnline,
    hasPendingChanges: pendingCount > 0,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    refresh,
    pendingCount,
    syncedCount: soapTemplates.filter(t => t.metadata?.syncStatus === 'synced').length,
    errorCount: soapTemplates.filter(t => t.metadata?.syncStatus === 'error').length,
  };
}