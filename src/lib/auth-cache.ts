/**
 * Client-side authentication caching for offline mode
 * 
 * This utility saves authentication data to IndexedDB after successful login
 * so the user can continue working offline.
 */

import { indexedDBManager } from './offline/db';
import { STORES } from './offline/db/schema';
import type { User } from '@/context/UserContext';

export interface LoginResponse {
  user: User;
  message: string;
  session?: {
    id: string;
    expiresAt: string;
    createdAt: string;
  };
}

/**
 * Cache authentication data to IndexedDB for offline use
 * Call this after successful login
 */
export async function cacheAuthForOffline(
  response: LoginResponse,
  tenantId: string
): Promise<void> {
  try {
    const { user, session } = response;

    if (!session) {
      console.warn('[cacheAuthForOffline] No session data in response, skipping cache');
      return;
    }

    console.log('[cacheAuthForOffline] Caching auth data for user:', user.email);

    // Cache tenant information for offline use
    try {
      const tenantCache = {
        id: `tenant_${tenantId}`,
        tenantId,
        name: tenantId.charAt(0).toUpperCase() + tenantId.slice(1), // Capitalize
        subdomain: tenantId,
        cachedAt: Date.now(),
      };
      await indexedDBManager.put('cache', tenantCache);
      console.log('[cacheAuthForOffline] Tenant info cached:', tenantId);
    } catch (error) {
      console.warn('[cacheAuthForOffline] Failed to cache tenant info:', error);
    }

    // Determine practice ID based on user role
    let practiceId: string | undefined;
    let currentPracticeId: string | undefined;
    let accessiblePracticeIds: string[] | undefined;

    if (user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN') {
      const adminUser = user as any;
      currentPracticeId = adminUser.currentPracticeId;
      accessiblePracticeIds = adminUser.accessiblePracticeIds || [];
      practiceId = currentPracticeId;
    } else {
      const regularUser = user as any;
      practiceId = regularUser.practiceId;
    }

    // Save authentication token (use simplified format)
    const tokenData = {
      id: session.id,
      userId: user.id, // Keep as string
      tenantId,
      practiceId: practiceId || '',
      obfuscatedToken: session.id, // Use session ID as token placeholder
      obfuscatedRefreshToken: undefined,
      expiresAt: new Date(session.expiresAt).getTime(),
      refreshExpiresAt: undefined,
      createdAt: new Date(session.createdAt).getTime(),
      lastValidated: Date.now(),
    };

    // Save to IndexedDB
    await indexedDBManager.put(STORES.AUTH_TOKENS, tokenData);
    console.log('[cacheAuthForOffline] Auth token saved');

    // Save session data
    const sessionData = {
      id: session.id,
      userId: user.id, // Keep as string
      tenantId,
      practiceId,
      currentPracticeId,
      accessiblePracticeIds,
      email: user.email,
      name: user.name,
      role: user.role,
      roles: (user as any).roles?.map((r: any) => r.name) || [],
      assignedLocations: undefined,
      assignedDepartments: undefined,
      preferences: {
        theme: 'light' as const,
        language: 'en',
        offlineEnabled: true,
        autoSync: true,
        syncInterval: 30000, // 30 seconds
      },
      expiresAt: session.expiresAt,
      createdAt: new Date(session.createdAt).getTime(),
      lastActivity: Date.now(),
    };

    await indexedDBManager.put(STORES.SESSIONS, sessionData);
    console.log('[cacheAuthForOffline] Session saved');

    // Set offline tenant context for permission checks
    if (practiceId) {
      const { setOfflineTenantContext } = await import('./offline/core/tenant-context');
      setOfflineTenantContext({
        tenantId,
        practiceId: typeof practiceId === 'string' ? parseInt(practiceId, 10) : practiceId,
        userId: typeof user.id === 'string' ? parseInt(user.id, 10) : user.id,
        subdomain: tenantId,
      });
      console.log('[cacheAuthForOffline] Offline tenant context set');
    }

    // Fetch and cache practice information if practiceId is available
    if (practiceId) {
      try {
        const response = await fetch(`/api/practices/${practiceId}`);
        if (response.ok) {
          const practiceData = await response.json();
          // Store practice info in cache store (we'll use a simple key-value approach)
          const practiceCache = {
            id: `practice_${practiceId}`,
            practiceId,
            tenantId,
            data: practiceData,
            cachedAt: Date.now(),
          };
          await indexedDBManager.put('cache', practiceCache);
          console.log('[cacheAuthForOffline] Practice data cached:', practiceData.name);
        }
      } catch (error) {
        console.warn('[cacheAuthForOffline] Failed to fetch practice data:', error);
        // Non-critical - continue even if practice caching fails
      }
    }

    // Save permissions - Fetch from RBAC API for accurate permissions
    try {
      console.log('[cacheAuthForOffline] Fetching RBAC roles for user:', user.id);
      
      // Try to fetch dynamic RBAC roles
      let rbacRoles: any[] = [];
      let isSuperAdmin = false;
      let effectivePermissions: any = {};
      
      try {
        const rolesResponse = await fetch(`/api/user-roles/${user.id}`);
        console.log('[cacheAuthForOffline] 🔍 RBAC API response status:', rolesResponse.status);
        
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          console.log('[cacheAuthForOffline] 📦 RBAC API response data:', JSON.stringify(rolesData, null, 2));
          
          if (rolesData.roles && Array.isArray(rolesData.roles)) {
            rbacRoles = rolesData.roles;
            console.log('[cacheAuthForOffline] ✅ RBAC roles fetched:', {
              count: rbacRoles.length,
              roleNames: rbacRoles.map((r: any) => r.name),
              roles: rbacRoles,
            });
            
            // Check for SUPER_ADMIN in RBAC roles
            isSuperAdmin = rbacRoles.some((r: any) => r.name === 'SUPER_ADMIN');
            console.log('[cacheAuthForOffline] 🔍 SUPER_ADMIN check:', isSuperAdmin);
          } else {
            console.warn('[cacheAuthForOffline] ⚠️ No roles array in response:', rolesData);
          }
        } else {
          const errorText = await rolesResponse.text();
          console.warn('[cacheAuthForOffline] ⚠️ RBAC API error:', rolesResponse.status, errorText);
        }
      } catch (fetchError) {
        console.warn('[cacheAuthForOffline] ❌ Failed to fetch RBAC roles, falling back to legacy:', fetchError);
      }

      // Fallback to legacy role if no RBAC roles found
      if (rbacRoles.length === 0) {
        console.log('[cacheAuthForOffline] No RBAC roles, using legacy role:', user.role);
        
        // Check for SUPER_ADMIN or ADMINISTRATOR in legacy role
        isSuperAdmin = user.role === 'SUPER_ADMIN';
        const isAdministrator = user.role === 'ADMINISTRATOR';
        
        // Build a basic role structure from legacy role
        if (user.role) {
          rbacRoles = [{
            id: `legacy_${user.role}`,
            name: user.role,
            description: `Legacy ${user.role} role`,
            permissions: [],
            isSystemRole: true,
          }];
        }
        
        console.log('[cacheAuthForOffline] 📋 Created legacy role:', {
          roleName: user.role,
          isSuperAdmin,
          isAdministrator,
        });
      }

      // Also check user.roles if available (from session)
      const sessionRoles = (user as any).roles;
      if (sessionRoles && Array.isArray(sessionRoles) && sessionRoles.length > 0) {
        console.log('[cacheAuthForOffline] Session roles found:', sessionRoles.map((r: any) => r.name));
        
        // Merge session roles with RBAC roles (avoid duplicates)
        sessionRoles.forEach((sessionRole: any) => {
          if (!rbacRoles.find((r: any) => r.name === sessionRole.name)) {
            rbacRoles.push(sessionRole);
          }
          
          // Check for SUPER_ADMIN or ADMINISTRATOR in session roles
          if (sessionRole.name === 'SUPER_ADMIN') {
            isSuperAdmin = true;
          }
        });
      }
      
      // Final check: if user.role is SUPER_ADMIN or ADMINISTRATOR, ensure it's treated as admin
      if (user.role === 'SUPER_ADMIN') {
        isSuperAdmin = true;
        console.log('[cacheAuthForOffline] 👑 Confirmed SUPER_ADMIN from user.role');
      }
      const isAdministrator = user.role === 'ADMINISTRATOR' || rbacRoles.some((r: any) => r.name === 'ADMINISTRATOR');
      if (isAdministrator) {
        console.log('[cacheAuthForOffline] 👨‍💼 ADMINISTRATOR detected');
      }

      // Build effective permissions
      if (isSuperAdmin || isAdministrator) {
        // Super admin and Administrator get FULL access to ALL resources
        console.log('[cacheAuthForOffline] 🔓 Admin role detected - granting FULL permissions');
        const resources = [
          'pet', 'appointment', 'client', 'user', 'invoice', 'prescription', 
          'labResult', 'medicalRecord', 'vaccination', 'inventory', 'soapNote',
          'role', 'permission', 'practice', 'treatment', 'diagnostic', 'medication',
          'supplier', 'product', 'report', 'audit', 'setting', 'integration',
          'checklist', 'task', 'note', 'document', 'template', 'reminder',
          'notification', 'message', 'chat', 'telemedicine', 'billing', 'payment'
        ];
        
        resources.forEach(resource => {
          effectivePermissions[resource] = {
            create: true,
            read: true,
            update: true,
            delete: true,
            manage: true,
            approve: true,
            export: true,
            import: true,
          };
        });
      } else {
        // Build permissions from all roles
        console.log('[cacheAuthForOffline] Building permissions from roles...');
        rbacRoles.forEach((role: any) => {
          if (role.permissions && Array.isArray(role.permissions)) {
            role.permissions.forEach((perm: any) => {
              if (!effectivePermissions[perm.resource]) {
                effectivePermissions[perm.resource] = {
                  create: false,
                  read: false,
                  update: false,
                  delete: false,
                  manage: false,
                };
              }
              
              // Grant permission (default to true if granted field not present)
              const granted = perm.granted !== false;
              if (granted) {
                effectivePermissions[perm.resource][perm.action] = true;
              }
            });
          }
        });
        
        // For ANY user (even without explicit permissions), grant basic CRUD for core entities
        // This ensures offline functionality works for all users
        const coreEntities = ['pet', 'appointment', 'client', 'soapNote', 'vaccination', 'medicalRecord'];
        coreEntities.forEach(entity => {
          if (!effectivePermissions[entity]) {
            effectivePermissions[entity] = {};
          }
          // Grant basic CRUD if user doesn't have explicit deny
          if (effectivePermissions[entity].read !== false) {
            effectivePermissions[entity].read = true;
          }
          if (effectivePermissions[entity].create !== false) {
            effectivePermissions[entity].create = true;
          }
          if (effectivePermissions[entity].update !== false) {
            effectivePermissions[entity].update = true;
          }
        });
      }

      // Save permission cache
      const permissionCache = {
        id: `perm_${user.id}_${tenantId}`,
        userId: typeof user.id === 'string' ? parseInt(user.id, 10) : user.id, // Convert to number for IndexedDB query
        tenantId,
        practiceId: typeof practiceId === 'string' ? parseInt(practiceId, 10) : (practiceId || 0),
        roles: rbacRoles.map((r: any) => ({
          id: r.id?.toString() || `role_${Date.now()}_${Math.random()}`,
          name: r.name,
          description: r.description || null,
          isSystemRole: r.isSystemRole || false,
          permissions: r.permissions?.map((p: any) => ({
            id: p.id?.toString() || `perm_${Date.now()}_${Math.random()}`,
            resource: p.resource,
            action: p.action,
            conditions: p.conditions || null,
            fields: p.fields || null,
            granted: p.granted !== false,
          })) || [],
        })),
        roleAssignments: [],
        allPermissions: rbacRoles.flatMap((r: any) => r.permissions || []),
        effectivePermissions,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };

      await indexedDBManager.put(STORES.PERMISSIONS, permissionCache);
      
      console.log('[cacheAuthForOffline] ✅ Permissions cached:', {
        userId: permissionCache.userId,
        userIdType: typeof permissionCache.userId,
        tenantId,
        practiceId: permissionCache.practiceId,
        totalRoles: rbacRoles.length,
        roleNames: rbacRoles.map((r: any) => r.name),
        savedRoleNames: permissionCache.roles.map((r: any) => r.name),
        isSuperAdmin,
        isAdministrator: rbacRoles.some((r: any) => r.name === 'ADMINISTRATOR'),
        resourceCount: Object.keys(effectivePermissions).length,
        samplePermissions: Object.keys(effectivePermissions).slice(0, 5),
      });
    } catch (permError) {
      console.error('[cacheAuthForOffline] ❌ Failed to cache permissions:', permError);
      // Don't fail the entire caching process if permissions fail
    }

    // Cache accessible practices for offline practice switching
    if (user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN') {
      try {
        console.log('[cacheAuthForOffline] Caching accessible practices for admin/super_admin');
        const adminUser = user as any;
        const accessiblePracticeIds = adminUser.accessiblePracticeIds || [];
        
        if (accessiblePracticeIds.length > 0) {
          // Fetch all accessible practices
          const practicePromises = accessiblePracticeIds.map(async (practiceId: string) => {
            try {
              const response = await fetch(`/api/practices/${practiceId}`);
              if (response.ok) {
                const practiceData = await response.json();
                return {
                  id: practiceData.id,
                  name: practiceData.name,
                  subdomain: practiceData.subdomain || '',
                  companyId: practiceData.companyId || tenantId,
                  isActive: practiceData.isActive ?? true,
                };
              }
            } catch (error) {
              console.warn('[cacheAuthForOffline] Failed to fetch practice:', practiceId, error);
            }
            return null;
          });

          const practices = (await Promise.all(practicePromises)).filter(Boolean);

          if (practices.length > 0) {
            // Import practice storage module
            const { cacheAccessiblePractices } = await import('./offline/storage/practice-storage');
            await cacheAccessiblePractices(
              user.id.toString(),
              practices as any[],
              adminUser.currentPracticeId?.toString()
            );
            console.log(`[cacheAuthForOffline] ✅ Cached ${practices.length} accessible practices`);
          }
        }
      } catch (practiceError) {
        console.error('[cacheAuthForOffline] ❌ Failed to cache practices:', practiceError);
        // Don't fail the entire caching process if practice caching fails
      }
    }

    console.log('[cacheAuthForOffline] ✅ All auth data cached successfully');
  } catch (error) {
    console.error('[cacheAuthForOffline] Failed to cache auth data:', error);
    // Don't throw - offline caching failure shouldn't block login
  }
}

/**
 * Clear all cached authentication data
 * Call this on logout
 */
export async function clearAuthCache(): Promise<void> {
  try {
    console.log('[clearAuthCache] Clearing offline auth data');
    
    // Clear all tokens and sessions from IndexedDB
    const db = await indexedDBManager.getDatabase();
    const tx = db.transaction([STORES.AUTH_TOKENS, STORES.SESSIONS], 'readwrite');
    
    const tokenStore = tx.objectStore(STORES.AUTH_TOKENS);
    const sessionStore = tx.objectStore(STORES.SESSIONS);
    
    await Promise.all([
      tokenStore.clear(),
      sessionStore.clear(),
    ]);
    
    // Wait for transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    console.log('[clearAuthCache] ✅ Auth cache cleared');
  } catch (error) {
    console.error('[clearAuthCache] Failed to clear auth cache:', error);
  }
}

/**
 * Get tenant ID from subdomain or localStorage
 */
export function getTenantIdForCache(): string {
  // Try to get from subdomain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // If subdomain exists (e.g., tenant.domain.com)
    if (parts.length >= 2) {
      const subdomain = parts[0];
      // Common non-tenant subdomains to skip
      const skipSubdomains = ['www', 'localhost', 'app', 'admin', 'api'];
      
      if (!skipSubdomains.includes(subdomain)) {
        console.log('[getTenantIdForCache] Using subdomain as tenant:', subdomain);
        return subdomain;
      }
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem('tenantId');
    if (stored) {
      console.log('[getTenantIdForCache] Using localStorage tenant:', stored);
      return stored;
    }
    
    // Try to extract from URL path (e.g., /tenant/innova/...)
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'tenant' && pathParts[2]) {
      console.log('[getTenantIdForCache] Using path tenant:', pathParts[2]);
      return pathParts[2];
    }
  }
  
  console.warn('[getTenantIdForCache] No tenant found, using default');
  return 'default';
}

/**
 * Get cached tenant information from IndexedDB
 */
export async function getCachedTenantInfo(tenantId: string) {
  try {
    const cachedTenant = await indexedDBManager.get('cache', `tenant_${tenantId}`) as { name?: string } | null;
    if (cachedTenant?.name) {
      console.log('[getCachedTenantInfo] Found cached tenant:', cachedTenant.name);
      return cachedTenant;
    }
  } catch (error) {
    console.warn('[getCachedTenantInfo] Failed to get cached tenant:', error);
  }
  return null;
}
