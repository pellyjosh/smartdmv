import { useQuery } from '@tanstack/react-query';
import { useNetworkStatus } from './use-network-status';
import { encryptStringDS, decryptStringDS } from '@/lib/offline/utils/encryption';

// Hook to fetch roles and provide role checking utilities
export function useRoles(practiceId: number) {
  const { isOnline } = useNetworkStatus();
  
  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['roles', practiceId],
    queryFn: async () => {
      // If offline, skip API call and load from cache immediately
      if (!isOnline) {
        console.log('[useRoles] 🔌 Offline mode detected, loading from cache');
        const cached = localStorage.getItem(`roles_cache_${practiceId}`);
        if (cached) {
          const cacheData = JSON.parse(await decryptStringDS(cached));
          return Array.isArray(cacheData) ? cacheData : cacheData.data;
        }
        console.warn('[useRoles] No cache found for offline mode');
        return [];
      }
      
      // Online mode - try API with cache fallback
      try {
        const response = await fetch(`/api/roles?practiceId=${practiceId}`);
        if (!response.ok) {
          // If API fails, try to load from localStorage cache
          const cached = localStorage.getItem(`roles_cache_${practiceId}`);
          if (cached) {
            console.log('[useRoles] API failed, using cached roles data');
            const cacheData = JSON.parse(await decryptStringDS(cached));
            return Array.isArray(cacheData) ? cacheData : cacheData.data;
          }
          throw new Error('Failed to fetch roles');
        }
        const data = await response.json();
        
        // Always update cache with fresh data when online
        if (data && typeof window !== 'undefined') {
          const cacheData = {
            data: data,
            timestamp: Date.now(),
            cachedAt: new Date().toISOString(),
          };
          const payload = await encryptStringDS(JSON.stringify(cacheData));
          localStorage.setItem(`roles_cache_${practiceId}`, payload);
          console.log('[useRoles] ✅ Updated roles cache with fresh data');
        }
        
        return data;
      } catch (error) {
        // If network error, try to load from localStorage cache
        const cached = localStorage.getItem(`roles_cache_${practiceId}`);
        if (cached) {
          console.log('[useRoles] Network error, using cached roles data');
          const cacheData = JSON.parse(await decryptStringDS(cached));
          return Array.isArray(cacheData) ? cacheData : cacheData.data;
        }
        console.error('[useRoles] Failed to fetch roles:', error);
        return []; // Return empty array to prevent breaking
      }
    },
    enabled: !!practiceId,
    retry: false,
  });

  // Helper functions to check role types
  const getRoleByName = (roleName: string) => {
    return roles.find((role: any) => role.name === roleName);
  };

  const isSuperAdmin = (userRole: string) => {
    return userRole === 'SUPER_ADMIN';
  };

  const isPracticeAdmin = (userRole: string) => {
    return userRole === 'PRACTICE_ADMINISTRATOR' || userRole === 'PRACTICE_ADMIN';
  };

  // New helpers: check assigned roles array (when the user object includes `roles` from the API)
  // This supports the dynamic RBAC model where a user may have entries in `user_roles` rather
  // than a single `role` field on the users table.
  const isSuperAdminAssigned = (assignedRoles: any[] | undefined) => {
    if (!Array.isArray(assignedRoles)) return false;
    return assignedRoles.some((r: any) => {
      if (!r) return false;
      const name = (r.name || '').toString().toUpperCase();
      const display = (r.displayName || '').toString().toUpperCase();
      return name === 'SUPER_ADMIN' || display === 'SUPER_ADMIN' || name === 'SUPERADMIN' || display === 'SUPERADMIN';
    });
  };

  const isPracticeAdminAssigned = (assignedRoles: any[] | undefined) => {
    if (!Array.isArray(assignedRoles)) return false;
    return assignedRoles.some((r: any) => {
      if (!r) return false;
      const name = (r.name || '').toString().toUpperCase();
      const display = (r.displayName || '').toString().toUpperCase();
      return name === 'PRACTICE_ADMINISTRATOR' || name === 'PRACTICE_ADMIN' || display === 'PRACTICE_ADMINISTRATOR' || display === 'PRACTICE_ADMIN';
    });
  };

  const isVeterinarian = (userRole: string) => {
    return userRole === 'VETERINARIAN';
  };

  const isTechnician = (userRole: string) => {
    return userRole === 'TECHNICIAN';
  };

  const isReceptionist = (userRole: string) => {
    return userRole === 'RECEPTIONIST';
  };

  const isClient = (userRole: string) => {
    return userRole === 'CLIENT';
  };

  // Get available role options for dropdowns
  const getAvailableRoles = () => {
    return roles.map((role: any) => ({
      value: role.name,
      label: role.displayName || role.name,
      description: role.description,
      isSystemDefined: role.isSystemDefined,
    }));
  };

  // Get system roles only
  const getSystemRoles = () => {
    return roles.filter((role: any) => role.isSystemDefined);
  };

  // Get custom roles only
  const getCustomRoles = () => {
    return roles.filter((role: any) => role.isCustom);
  };

  return {
    roles,
    isLoading,
    error,
    getRoleByName,
    isSuperAdmin,
    isPracticeAdmin,
    isVeterinarian,
    isTechnician,
    isReceptionist,
    isClient,
  // Export the new assigned-role helpers
  isSuperAdminAssigned,
  isPracticeAdminAssigned,
    getAvailableRoles,
    getSystemRoles,
    getCustomRoles,
  };
}

// Legacy constants for backward compatibility (these should be phased out)
export const ROLE_NAMES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PRACTICE_ADMINISTRATOR: 'PRACTICE_ADMINISTRATOR',
  PRACTICE_ADMIN: 'PRACTICE_ADMIN',
  ADMINISTRATOR: 'ADMINISTRATOR',
  VETERINARIAN: 'VETERINARIAN',
  TECHNICIAN: 'TECHNICIAN',
  RECEPTIONIST: 'RECEPTIONIST',
  CLIENT: 'CLIENT',
  PRACTICE_MANAGER: 'PRACTICE_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  CASHIER: 'CASHIER',
  OFFICE_MANAGER: 'OFFICE_MANAGER',
} as const;
