/**
 * React hook for offline permission checks - SIMPLIFIED
 */

import { useState, useEffect, useCallback } from 'react';
import { permissionManager } from '@/lib/offline/managers/permission-manager';
import { indexedDBManager } from '@/lib/offline/db';
import { STORES } from '@/lib/offline/db/schema';
import { useOfflineInitialization } from './use-offline-initialization';
import type {
  PermissionAction,
} from '@/lib/offline/types/permission.types';

export interface UseOfflinePermissionsReturn {
  canCreate: (entityType: string) => Promise<boolean>;
  canRead: (entityType: string) => Promise<boolean>;
  canUpdate: (entityType: string) => Promise<boolean>;
  canDelete: (entityType: string) => Promise<boolean>;
  hasRole: (roleName: string) => Promise<boolean>;
  roles: string[];
  permissions: any[];
  isLoading: boolean;
  isCacheValid: boolean;
  refresh: () => Promise<void>;
}

export function useOfflinePermissions(): UseOfflinePermissionsReturn {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCacheValid, setIsCacheValid] = useState(false);

  // Wait for offline initialization to complete before accessing IndexedDB
  const { initialized } = useOfflineInitialization();

  const loadPermissions = useCallback(async () => {
    try {
      // If offline system hasn't been initialized yet, wait
      if (!initialized) {
        console.log('[useOfflinePermissions] ⏳ Waiting for offline initialization before loading permissions');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      console.log('[useOfflinePermissions] 🔄 Loading permissions DIRECTLY from IndexedDB...');

      // SIMPLE APPROACH: Read ALL permission caches directly from IndexedDB
      const allCaches = await indexedDBManager.getAll(STORES.PERMISSIONS) as any[];
      
      console.log('[useOfflinePermissions] 📦 Found caches:', {
        count: allCaches.length,
        caches: allCaches.map((c: any) => ({
          userId: c.userId,
          tenantId: c.tenantId,
          rolesCount: c.roles?.length || 0,
          roleNames: c.roles?.map((r: any) => r.name) || [],
          permissionsCount: c.allPermissions?.length || 0,
        }))
      });
      
      // Get the FIRST cache (should be the current user)
      if (allCaches.length > 0) {
        const cache: any = allCaches[0]; // Just take the first one - SIMPLE!
        
        const roleNames = cache.roles?.map((r: any) => r.name) || [];
        const allPerms = cache.allPermissions || [];
        
        console.log('[useOfflinePermissions] ✅ Using cache:', {
          rolesCount: roleNames.length,
          roleNames,
          permissionsCount: allPerms.length,
          samplePermissions: allPerms.slice(0, 5),
        });
        
        setRoles(roleNames);
        setPermissions(allPerms);
        setIsCacheValid(cache.expiresAt > Date.now());
      } else {
        console.warn('[useOfflinePermissions] ⚠️ No permission caches found!');
        setRoles([]);
        setPermissions([]);
        setIsCacheValid(false);
      }
    } catch (error) {
      console.error('[useOfflinePermissions] ❌ Load error:', error);
      setRoles([]);
      setPermissions([]);
      setIsCacheValid(false);
    } finally {
      setIsLoading(false);
    }
  }, [initialized]);
  // include initialized in deps so the callback is recreated once initialization completes

  const canCreate = useCallback(async (entityType: string): Promise<boolean> => {
    // SIMPLE: SUPER_ADMIN has all permissions
    if (roles.includes('SUPER_ADMIN')) {
      console.log('[useOfflinePermissions] ✅ SUPER_ADMIN - granted create on', entityType);
      return true;
    }
    
    // Otherwise check cached permissions
    if (permissions.length === 0) return false;
    
    // Normalize entity type (handle both "pet" and "pets")
    const normalizedEntity = entityType.toLowerCase();
    const pluralEntity = normalizedEntity.endsWith('s') ? normalizedEntity : normalizedEntity + 's';
    const singularEntity = normalizedEntity.endsWith('s') ? normalizedEntity.slice(0, -1) : normalizedEntity;
    
    const hasPerm = permissions.some((p: any) => {
      const resourceLower = p.resource.toLowerCase();
      return (resourceLower === normalizedEntity || resourceLower === pluralEntity || resourceLower === singularEntity) 
        && p.action === 'create' 
        && p.granted !== false;
    });
    
    console.log('[useOfflinePermissions] canCreate:', { 
      entityType, 
      hasPerm, 
      normalized: normalizedEntity,
      plural: pluralEntity,
      singular: singularEntity,
      permissionsCount: permissions.length 
    });
    return hasPerm;
  }, [permissions, roles]);

  const canRead = useCallback(async (entityType: string): Promise<boolean> => {
    if (roles.includes('SUPER_ADMIN')) {
      console.log('[useOfflinePermissions] ✅ SUPER_ADMIN - granted read on', entityType);
      return true;
    }
    
    if (permissions.length === 0) return false;
    
    const hasPerm = permissions.some((p: any) => 
      p.resource === entityType && p.action === 'read' && p.granted !== false
    );
    
    console.log('[useOfflinePermissions] canRead:', { entityType, hasPerm });
    return hasPerm;
  }, [permissions, roles]);

  const canUpdate = useCallback(async (entityType: string): Promise<boolean> => {
    if (roles.includes('SUPER_ADMIN')) {
      console.log('[useOfflinePermissions] ✅ SUPER_ADMIN - granted update on', entityType);
      return true;
    }
    
    if (permissions.length === 0) return false;
    
    const hasPerm = permissions.some((p: any) => 
      p.resource === entityType && p.action === 'update' && p.granted !== false
    );
    
    console.log('[useOfflinePermissions] canUpdate:', { entityType, hasPerm });
    return hasPerm;
  }, [permissions, roles]);

  const canDelete = useCallback(async (entityType: string): Promise<boolean> => {
    if (roles.includes('SUPER_ADMIN')) {
      console.log('[useOfflinePermissions] ✅ SUPER_ADMIN - granted delete on', entityType);
      return true;
    }
    
    if (permissions.length === 0) return false;
    
    const hasPerm = permissions.some((p: any) => 
      p.resource === entityType && p.action === 'delete' && p.granted !== false
    );
    
    console.log('[useOfflinePermissions] canDelete:', { entityType, hasPerm });
    return hasPerm;
  }, [permissions, roles]);

  const hasRole = useCallback(async (roleName: string): Promise<boolean> => {
    const hasIt = roles.includes(roleName);
    console.log('[useOfflinePermissions] hasRole:', { roleName, hasIt, currentRoles: roles });
    return hasIt;
  }, [roles]);

  const refresh = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  return {
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    hasRole,
    roles,
    permissions,
    isLoading,
    isCacheValid,
    refresh,
  };
}

/**
 * Hook for checking specific permission
 */
export function usePermission(resource: string, action: PermissionAction) {
  const [allowed, setAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { initialized } = useOfflineInitialization();

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // If offline system not ready yet, wait until initialization
        if (!initialized) {
          console.log('[usePermission] ⏳ Waiting for offline initialization before checking permission', { resource, action });
          setIsLoading(false);
          setAllowed(false);
          return;
        }

        setIsLoading(true);
        const canPerform = await permissionManager.can(resource, action);
        setAllowed(canPerform);
      } catch (error) {
        console.error('[usePermission] Check error:', error);
        setAllowed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [resource, action, initialized]);

  return { allowed, isLoading };
}
