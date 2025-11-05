/**
 * Permission storage for offline functionality
 * Handles caching of roles and permissions
 */

import { indexedDBManager } from '../db/manager';
import { STORES } from '../db/schema';
import type {
  OfflinePermissionCache,
  Permission,
  Role,
  RoleAssignment,
  EffectivePermissions,
} from '../types/permission.types';
import { generateTempId } from '../utils/encryption';
import { DatabaseError } from '../utils/error-handlers';

/**
 * Save permission cache for user
 */
export async function savePermissions(
  userId: number,
  tenantId: string,
  practiceId: number,
  roles: Role[],
  roleAssignments: RoleAssignment[]
): Promise<OfflinePermissionCache> {
  try {
    console.log('[PermissionStorage] 📥 savePermissions called with:', {
      userId,
      userIdType: typeof userId,
      tenantId,
      practiceId,
      practiceIdType: typeof practiceId,
      rolesCount: roles.length,
      roleNames: roles.map(r => r.name),
      roleAssignmentsCount: roleAssignments.length,
    });

    const now = Date.now();
    const allPermissions = extractAllPermissions(roles);
    const effectivePermissions = buildEffectivePermissions(allPermissions);

    console.log('[PermissionStorage] 📊 Extracted permissions:', {
      allPermissionsCount: allPermissions.length,
      effectiveResourcesCount: Object.keys(effectivePermissions).length,
      effectiveResources: Object.keys(effectivePermissions),
    });

    const cache: OfflinePermissionCache = {
      id: generateTempId('perm'),
      userId,
      tenantId,
      practiceId,
      roles,
      roleAssignments,
      allPermissions,
      effectivePermissions,
      cachedAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    };

    console.log('[PermissionStorage] 💾 About to save cache to IndexedDB:', {
      cacheId: cache.id,
      store: STORES.PERMISSIONS,
      rolesInCache: cache.roles.map(r => ({ name: r.name, perms: r.permissions.length })),
    });

    // Check current tenant context
    const currentContext = indexedDBManager.getCurrentTenant();
    console.log('[PermissionStorage] 🏢 Current tenant context:', currentContext);

    await indexedDBManager.put(STORES.PERMISSIONS, cache);
    console.log(`[PermissionStorage] ✅ Cached permissions for user ${userId} in store '${STORES.PERMISSIONS}'`);
    
    // Verify it was saved
    try {
      const allCaches = await indexedDBManager.getAll<OfflinePermissionCache>(STORES.PERMISSIONS);
      console.log('[PermissionStorage] 🔍 Verification - Total caches in store:', allCaches.length);
      console.log('[PermissionStorage] 🔍 Cache IDs:', allCaches.map(c => ({
        id: c.id,
        userId: c.userId,
        tenantId: c.tenantId,
        roles: c.roles?.length || 0
      })));
    } catch (verifyError) {
      console.warn('[PermissionStorage] ⚠️  Could not verify save:', verifyError);
    }
    
    return cache;
  } catch (error) {
    console.error('[PermissionStorage] ❌ Failed to save permissions:', error);
    console.error('[PermissionStorage] Error stack:', (error as Error).stack);
    throw new DatabaseError('Failed to save permissions', error as Error);
  }
}

/**
 * Get permission cache for user
 */
export async function getPermissions(
  userId: number,
  tenantId: string
): Promise<OfflinePermissionCache | null> {
  try {
    console.log('[PermissionStorage] 🔍 getPermissions called with:', {
      userId,
      userIdType: typeof userId,
      tenantId,
      tenantIdType: typeof tenantId,
    });

    const caches = await indexedDBManager.queryByIndex<OfflinePermissionCache>(
      STORES.PERMISSIONS,
      'userId',
      userId
    );

    console.log('[PermissionStorage] 📦 Found caches:', {
      count: caches.length,
      cacheDetails: caches.map(c => ({ 
        userId: c.userId, 
        userIdType: typeof c.userId, 
        tenantId: c.tenantId,
        tenantIdType: typeof c.tenantId,
        rolesCount: c.roles?.length || 0,
        roleNames: c.roles?.map(r => r.name) || [],
      })),
    });

    const cache = caches.find((c) => c.tenantId === tenantId);
    
    if (!cache) {
      console.warn('[PermissionStorage] ⚠️ No cache found for tenantId:', tenantId);
      console.warn('[PermissionStorage] ⚠️ Available tenantIds:', caches.map(c => c.tenantId));
      console.warn('[PermissionStorage] ⚠️ Comparison:', {
        queriedTenantId: tenantId,
        queriedTenantIdType: typeof tenantId,
        availableTenantIds: caches.map(c => ({ id: c.tenantId, type: typeof c.tenantId })),
      });
      return null;
    }
    
    // Check if cache is expired
    if (cache && cache.expiresAt < Date.now()) {
      console.warn('[PermissionStorage] ⏰ Permission cache expired');
      return null;
    }

    console.log('[PermissionStorage] ✅ Found valid cache:', {
      rolesCount: cache.roles?.length || 0,
      roleNames: cache.roles?.map(r => r.name) || [],
      effectivePermissions: Object.keys(cache.effectivePermissions || {}),
    });

    return cache || null;
  } catch (error) {
    console.error('[PermissionStorage] ❌ Error in getPermissions:', error);
    throw new DatabaseError('Failed to get permissions', error as Error);
  }
}

/**
 * Update permissions (typically after sync)
 */
export async function updatePermissions(
  userId: number,
  tenantId: string,
  roles: Role[],
  roleAssignments: RoleAssignment[]
): Promise<void> {
  try {
    const existing = await getPermissions(userId, tenantId);
    if (!existing) {
      throw new Error('Permission cache not found');
    }

    const now = Date.now();
    existing.roles = roles;
    existing.roleAssignments = roleAssignments;
    existing.allPermissions = extractAllPermissions(roles);
    existing.effectivePermissions = buildEffectivePermissions(existing.allPermissions);
    existing.cachedAt = now;
    existing.expiresAt = now + 24 * 60 * 60 * 1000;

    await indexedDBManager.put(STORES.PERMISSIONS, existing);
  } catch (error) {
    throw new DatabaseError('Failed to update permissions', error as Error);
  }
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(
  userId: number,
  tenantId: string,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): Promise<boolean> {
  const cache = await getPermissions(userId, tenantId);
  
  if (!cache) {
    console.warn('[PermissionStorage] ❌ No permission cache found for:', { userId, tenantId });
    return false;
  }

  console.log('[PermissionStorage] 🔍 Permission cache found:', {
    userId,
    tenantId,
    rolesCount: cache.roles?.length || 0,
    roleNames: cache.roles?.map(r => r.name) || [],
  });

  // Check if user is SUPER_ADMIN or ADMINISTRATOR
  const isSuperAdmin = cache.roles?.some(r => r.name === 'SUPER_ADMIN');
  const isAdministrator = cache.roles?.some(r => r.name === 'ADMINISTRATOR');
  
  if (isSuperAdmin) {
    console.log('[PermissionStorage] ✅ SUPER_ADMIN detected - granting permission');
    return true;
  }
  
  if (isAdministrator) {
    console.log('[PermissionStorage] ✅ ADMINISTRATOR detected - granting permission');
    return true;
  }

  const resourcePerms = cache.effectivePermissions[resource];
  if (!resourcePerms) {
    console.log('[PermissionStorage] ⚠️ No permissions for resource:', { resource, userId, tenantId });
    return false;
  }

  const hasAccess = resourcePerms[action] || false;
  console.log('[PermissionStorage] Permission check result:', {
    resource,
    action,
    hasAccess,
    resourcePerms,
  });

  return hasAccess;
}

/**
 * Clear permission cache
 */
export async function clearPermissions(userId?: number, tenantId?: string): Promise<void> {
  try {
    if (userId && tenantId) {
      const cache = await getPermissions(userId, tenantId);
      if (cache) {
        await indexedDBManager.delete(STORES.PERMISSIONS, cache.id);
      }
    } else {
      await indexedDBManager.clear(STORES.PERMISSIONS);
    }
  } catch (error) {
    throw new DatabaseError('Failed to clear permissions', error as Error);
  }
}

/**
 * Helper: Extract all permissions from roles
 */
function extractAllPermissions(roles: Role[]): Permission[] {
  const permissionMap = new Map<number, Permission>();
  
  roles.forEach((role) => {
    role.permissions.forEach((permission) => {
      permissionMap.set(permission.id, permission);
    });
  });

  return Array.from(permissionMap.values());
}

/**
 * Helper: Build effective permissions lookup
 */
function buildEffectivePermissions(permissions: Permission[]): EffectivePermissions {
  const effective: EffectivePermissions = {};

  permissions.forEach((permission) => {
    if (!effective[permission.resource]) {
      effective[permission.resource] = {
        create: false,
        read: false,
        update: false,
        delete: false,
      };
    }

    effective[permission.resource][permission.action] = true;
    
    if (permission.conditions) {
      effective[permission.resource].conditions = permission.conditions;
    }
  });

  return effective;
}

/**
 * Get user's roles
 */
export async function getUserRoles(
  userId: number,
  tenantId: string
): Promise<Role[]> {
  console.log('[PermissionStorage] 📋 getUserRoles called:', { userId, tenantId });
  const cache = await getPermissions(userId, tenantId);
  const roles = cache?.roles || [];
  console.log('[PermissionStorage] 📋 getUserRoles result:', {
    rolesCount: roles.length,
    roleNames: roles.map(r => r.name),
    hasCache: !!cache,
  });
  return roles;
}

/**
 * Get user's role assignments
 */
export async function getUserRoleAssignments(
  userId: number,
  tenantId: string
): Promise<RoleAssignment[]> {
  const cache = await getPermissions(userId, tenantId);
  return cache?.roleAssignments || [];
}

/**
 * Check if permission cache is valid
 */
export async function isPermissionCacheValid(
  userId: number,
  tenantId: string
): Promise<boolean> {
  const cache = await getPermissions(userId, tenantId);
  
  if (!cache) {
    return false;
  }

  return cache.expiresAt > Date.now();
}
