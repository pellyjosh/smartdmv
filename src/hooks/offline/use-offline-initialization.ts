/**
 * Hook to initialize offline system with user context
 * Fetches tenant from API and caches it for offline use
 */

import { useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext'; // Use existing TenantContext
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineAuth } from './use-offline-auth';
import { initializeOfflineSystem, clearOfflineSystem, switchOfflinePractice } from '@/lib/offline/utils/offline-init';
import { cacheTenantData, type CachedTenantInfo } from '@/lib/offline/storage/tenant-storage';
import { saveSession } from '@/lib/offline/storage/auth-storage';
import { savePermissions } from '@/lib/offline/storage/permission-storage';

/**
 * Cache additional offline data in background (non-blocking)
 */
async function cacheAdditionalOfflineData(tenantId: string, practiceIdNum: number, user: any) {
  try {
    // Cache practice data for offline use
    try {
      console.log('[useOfflineInit] 🏥 Fetching and caching practice data for offline use');
      const practiceResponse = await fetch(`/api/practices/${practiceIdNum}`);
      if (practiceResponse.ok) {
        const practiceData = await practiceResponse.json();
        console.log('[useOfflineInit] ✅ Fetched practice data:', practiceData.name);

        // Cache practice data in IndexedDB
        const { indexedDBManager } = await import('@/lib/offline/db');
        const cacheKey = `practice_${practiceIdNum}`;
        await indexedDBManager.put('cache', {
          id: cacheKey,
          key: cacheKey,
          data: practiceData,
          timestamp: Date.now(),
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        });
        console.log('[useOfflineInit] ✅ Practice data cached to IndexedDB for offline use');
      } else {
        console.warn('[useOfflineInit] ⚠️ Failed to fetch practice data for caching:', practiceResponse.statusText);
      }
    } catch (practiceError) {
      console.warn('[useOfflineInit] ⚠️ Failed to cache practice data (non-critical):', practiceError);
    }

    // Cache user permissions
    try {
      console.log('[useOfflineInit] 📋 Caching permissions for user:', {
        userId: user.id,
        role: user.role,
        roles: (user as any).roles,
        rolesLength: (user as any).roles?.length || 0,
      });

      // Get roles from user object
      let roles = (user as any).roles || [];

      // If no assigned roles, create a synthetic role from user.role
      if (!roles || roles.length === 0) {
        console.log('[useOfflineInit] No assigned roles found, creating synthetic role from user.role:', user.role);

        // Create a synthetic role based on the user's primary role
        const syntheticRole = {
          id: -1, // Synthetic ID
          name: user.role,
          displayName: user.role,
          description: `Primary role: ${user.role}`,
          isSystemDefined: true,
          isCustom: false,
          practiceId: undefined,
          permissions: getSyntheticPermissionsForRole(user.role),
        };

        roles = [syntheticRole];
        console.log('[useOfflineInit] Created synthetic role:', syntheticRole);
      }

      const roleAssignments = roles.map((r: any, index: number) => ({
        userId: parseInt(user.id),
        roleId: r.id || -index, // Use negative index for synthetic roles
        practiceId: practiceIdNum,
        assignedAt: Date.now(),
      }));

      console.log('[useOfflineInit] Saving permissions:', {
        rolesCount: roles.length,
        roleNames: roles.map((r: any) => r.name),
        assignments: roleAssignments.length,
      });

      await savePermissions(
        parseInt(user.id),
        tenantId,
        practiceIdNum,
        roles,
        roleAssignments
      );
      console.log('[useOfflineInit] ✅ User permissions cached to IndexedDB');
    } catch (permError) {
      console.error('[useOfflineInit] ❌ Failed to cache permissions:', permError);
      console.warn('[useOfflineInit] ⚠️ Failed to cache permissions (non-critical):', permError);
    }
  } catch (error) {
    console.warn('[useOfflineInit] ⚠️ Background caching failed (non-critical):', error);
  }
}

/**
 * Generate synthetic permissions based on user role
 * These are fallback permissions when no roles are assigned from user_roles table
 */
function getSyntheticPermissionsForRole(role: string): any[] {
  const allPermissions = ['create', 'read', 'update', 'delete', 'manage'];
  const entities = [
    'pets', 'appointments', 'clients', 'invoices', 'inventory',
    'prescriptions', 'medicalRecords', 'vaccinations', 'practitioners',
    'users', 'roles', 'practices', 'settings'
  ];
  
  let permissionId = 1; // Start counter for synthetic permission IDs
  
  switch (role) {
    case 'SUPER_ADMIN':
      // Super admin has all permissions on all entities
      const superAdminPerms = [];
      for (const entity of entities) {
        for (const action of allPermissions) {
          superAdminPerms.push({
            id: permissionId++,
            name: `${entity}:${action}`,
            resource: entity,
            action: action,
            granted: true,
          });
        }
      }
      return superAdminPerms;
      
    case 'ADMINISTRATOR':
      // Admin has most permissions except system-wide settings
      const adminPerms = [];
      for (const entity of entities.filter(e => !['settings', 'practices'].includes(e))) {
        for (const action of allPermissions) {
          adminPerms.push({
            id: permissionId++,
            name: `${entity}:${action}`,
            resource: entity,
            action: action,
            granted: true,
          });
        }
      }
      return adminPerms;
      
    case 'PRACTICE_ADMINISTRATOR':
      // Practice admin has manage permissions on their practice
      const practiceAdminPerms = [];
      for (const entity of entities.filter(e => !['settings', 'practices', 'users'].includes(e))) {
        for (const action of allPermissions) {
          practiceAdminPerms.push({
            id: permissionId++,
            name: `${entity}:${action}`,
            resource: entity,
            action: action,
            granted: true,
          });
        }
      }
      return practiceAdminPerms;
      
    case 'VETERINARIAN':
    case 'PRACTICE_MANAGER':
      // Vets and managers have most operational permissions
      const vetPerms = [];
      const vetActions = ['create', 'read', 'update', 'delete'];
      for (const entity of entities.filter(e => !['settings', 'practices', 'users', 'roles'].includes(e))) {
        for (const action of vetActions) {
          vetPerms.push({
            id: permissionId++,
            name: `${entity}:${action}`,
            resource: entity,
            action: action,
            granted: true,
          });
        }
      }
      return vetPerms;
      
    default:
      // Basic read permissions for other roles
      return entities.map(entity => ({
        id: permissionId++,
        name: `${entity}:read`,
        resource: entity,
        action: 'read',
        granted: true,
      }));
  }
}

export function useOfflineInitialization() {
  const { user } = useUser();
  const { tenant } = useTenant(); // Get tenant from API via FastTenantContext
  const { isOnline } = useNetworkStatus();
  const { session, isAuthenticated } = useOfflineAuth();
  const previousPracticeId = useRef<string | null>(null);
  const initializationPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    console.log('[useOfflineInit] Effect triggered', {
      hasUser: !!user,
      hasTenant: !!tenant,
      isOnline,
      hasOfflineSession: !!session,
      isAuthenticated,
    });
    
    const initOffline = async () => {
  // When offline, use cached session data
  if (!isOnline && session) {
        console.log('[useOfflineInit] 🔌 OFFLINE MODE - Using cached session data');
        
        // Prevent multiple simultaneous initializations
        if (initializationPromise.current) {
          console.log('[useOfflineInit] Initialization already in progress, waiting...');
          await initializationPromise.current;
          return;
        }

        const tenantId = session.tenantId;
        const practiceIdNum = parseInt(session.practiceId || session.currentPracticeId || '0', 10);

        if (!tenantId || isNaN(practiceIdNum) || practiceIdNum === 0) {
          console.error('[useOfflineInit] ❌ Invalid offline session data:', { tenantId, practiceId: session.practiceId });
          return;
        }

        console.log('[useOfflineInit] 🔌 OFFLINE - Initializing with:', { tenantId, practiceId: practiceIdNum });

        // Initialize offline system with cached data
        if (!previousPracticeId.current) {
          const initPromise = initializeOfflineSystem({
            tenantId,
            practiceId: practiceIdNum,
            userId: parseInt(session.userId, 10),
          });
          initializationPromise.current = initPromise;
          await initPromise;
          previousPracticeId.current = practiceIdNum.toString();
          initializationPromise.current = null;
          console.log('[useOfflineInit] ✅ OFFLINE initialization complete');

          // Try to cache additional data in background (don't block initialization)
          // Note: user might not be available offline, so we pass it only if available
          if (user) {
            setTimeout(() => {
              cacheAdditionalOfflineData(tenantId, practiceIdNum, user);
            }, 100);
          }
        }
        
        return;
      }

      // When online, use user and tenant from API
      if (!user) {
        console.log('[useOfflineInit] No user, clearing offline context');
        // User logged out - clear offline context
        clearOfflineSystem();
        previousPracticeId.current = null;
        initializationPromise.current = null;
        return;
      }

      // Wait for tenant to be resolved from API
      if (!tenant) {
        console.log('[useOfflineInit] ⏳ Waiting for tenant resolution from API...');
        return;
      }

      // Prevent multiple simultaneous initializations
      if (initializationPromise.current) {
        console.log('[useOfflineInit] Initialization already in progress, waiting...');
        await initializationPromise.current;
        return;
      }

      try {
        // CRITICAL: Use tenant DATABASE ID, not subdomain!
        // tenant.id is the database ID (e.g., "19")
        // tenant.subdomain is the URL subdomain (e.g., "innova")
        const tenantId = tenant.id?.toString();
        
        if (!tenantId) {
          console.error('[useOfflineInit] ❌ Tenant has no database ID:', tenant);
          return;
        }
        
        console.log('[useOfflineInit] 🏢 Tenant from API:', tenant.name, `(DB ID: ${tenantId}, subdomain: ${tenant.subdomain})`);
        console.log('[useOfflineInit] 📊 Tenant status:', tenant.status);
        console.log('[useOfflineInit] 💾 Database name:', tenant.databaseName);
        
        console.log('[useOfflineInit] User object keys:', Object.keys(user));
        console.log('[useOfflineInit] User role:', user.role);
        
        // Get practice ID - handle both regular users and admins
        let practiceId: string | number | undefined;
        if (user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN') {
          practiceId = (user as any).currentPracticeId || (user as any).accessiblePracticeIds?.[0];
          console.log('[useOfflineInit] Admin user, practiceId:', practiceId);
        } else {
          practiceId = (user as any).practiceId;
          console.log('[useOfflineInit] Regular user, practiceId:', practiceId);
        }

        // Validate practiceId
        if (!practiceId || practiceId === 'undefined' || practiceId === 'practice_NONE' || (typeof practiceId === 'number' && isNaN(practiceId))) {
          console.warn('[useOfflineInit] ⚠️ No valid practice assigned. Offline features disabled.');
          console.warn('[useOfflineInit] User data:', {
            role: user.role,
            currentPracticeId: (user as any).currentPracticeId,
            practiceId: (user as any).practiceId,
            accessiblePracticeIds: (user as any).accessiblePracticeIds,
          });
          return;
        }
        
        // Convert to number if string
        const practiceIdNum = typeof practiceId === 'string' ? parseInt(practiceId, 10) : practiceId;
        
        if (isNaN(practiceIdNum)) {
          console.warn('[useOfflineInit] ⚠️ Practice ID is NaN after conversion. Offline features disabled.');
          console.warn('[useOfflineInit] PracticeId values:', { practiceId, practiceIdNum });
          return;
        }
        
        console.log('[useOfflineInit] ✅ Valid practice ID:', practiceIdNum, `(type: ${typeof practiceIdNum})`);


        // Check if practice changed
        if (previousPracticeId.current && previousPracticeId.current !== practiceIdNum.toString()) {
          console.log('[useOfflineInit] Practice changed from', previousPracticeId.current, 'to', practiceIdNum);
          const switchPromise = switchOfflinePractice(tenantId, practiceIdNum);
          initializationPromise.current = switchPromise;
          await switchPromise;
          previousPracticeId.current = practiceIdNum.toString();
          initializationPromise.current = null;
          return;
        }

        // Initialize offline system with user context
        if (!previousPracticeId.current) {
          console.log('[useOfflineInit] 🚀 Starting initialization for user:', user.id, 'practice:', practiceIdNum);
          const initPromise = initializeOfflineSystem({
            tenantId,
            practiceId: practiceIdNum,
            userId: user.id,
          });
          initializationPromise.current = initPromise;
          await initPromise;
          previousPracticeId.current = practiceIdNum.toString();
          initializationPromise.current = null;
          console.log('[useOfflineInit] ✅ Initialization complete');

          // Cache tenant data immediately (critical for offline functionality)
          try {
            const cachedTenant: CachedTenantInfo = {
              id: tenant.id,
              slug: tenant.slug,
              name: tenant.name,
              domain: tenant.domain || null,
              subdomain: tenant.subdomain, // Keep subdomain for routing, but ID is the database identifier
              status: tenant.status,
              databaseName: tenant.databaseName,
              storagePath: tenant.storagePath,
              settings: {
                timezone: tenant.settings?.timezone || 'UTC',
                theme: tenant.settings?.theme || 'default',
                features: tenant.settings?.features || [],
              },
            };

            await cacheTenantData(cachedTenant);
            console.log('[useOfflineInit] ✅ Tenant data cached to IndexedDB for offline use');
          } catch (cacheError) {
            console.warn('[useOfflineInit] ⚠️ Failed to cache tenant data (non-critical):', cacheError);
          }

          // Cache authentication session (critical for offline functionality)
          try {
            console.log('[useOfflineInit] 💾 Saving session with user role:', {
              userId: user.id,
              role: user.role,
              roles: (user as any).roles,
              rolesArray: (user as any).roles?.map((r: any) => r.name),
            });

            await saveSession({
              userId: user.id.toString(),
              tenantId,
              practiceId: practiceIdNum.toString(),
              currentPracticeId: practiceIdNum.toString(),
              email: user.email,
              name: user.name || user.email,
              role: user.role, // Ensure this is not undefined
              // Keep full role objects with name, displayName, permissions, etc
              roles: (user as any).roles || [],
              preferences: {
                offlineEnabled: true,
                autoSync: true,
                theme: 'light',
              },
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            });
            console.log('[useOfflineInit] ✅ Auth session cached to IndexedDB with role:', user.role);
          } catch (authError) {
            console.warn('[useOfflineInit] ⚠️ Failed to cache auth session (non-critical):', authError);
          }

          // Try to cache additional data in background (don't block initialization)
          setTimeout(() => {
            cacheAdditionalOfflineData(tenantId, practiceIdNum, user);
          }, 100);
        } else {
          console.log('[useOfflineInit] Already initialized for practice:', previousPracticeId.current);
        }
      } catch (error) {
        console.error('[useOfflineInit] ❌ Initialization error:', error);
        initializationPromise.current = null;
      }
    };

    initOffline();
  }, [user, tenant, isOnline, session, isAuthenticated]); // Updated dependencies for offline support

  // When offline, check if we have initialized with session data
  // When online, check if we have user and practice
  const isInitialized = !isOnline 
    ? (!!session && !!previousPracticeId.current) // Offline: check cached session + practice
    : (!!user && !!previousPracticeId.current);         // Online: check user + practice
  
  console.log('[useOfflineInit] Render - initialized:', isInitialized, {
    isOnline,
    hasUser: !!user,
    hasSession: isAuthenticated,
    practice: previousPracticeId.current,
  });

  return {
    initialized: isInitialized,
  };
}
