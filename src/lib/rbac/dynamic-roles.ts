/**
 * Dynamic Role-Based Access Control (RBAC) Helper
 * Uses database roles instead of hardcoded enum values
 * Supports user role assignments and permission overrides
 */
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { roles, userRoles, permissionOverrides } from '@/db/schema';
import { eq, and, or, isNull, gt } from 'drizzle-orm';

export interface DynamicRole {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isSystemDefined: boolean;
  isCustom: boolean;
  practiceId?: number;
  permissions: DynamicPermission[];
}

export interface DynamicPermission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
  category: string;
}

// Cache for roles to avoid frequent database queries
let rolesCache: { [practiceId: string]: DynamicRole[] } = {};
let lastCacheUpdate: { [practiceId: string]: number } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all roles for a practice (includes system and custom roles)
 */
export async function getRoles(practiceId?: number): Promise<DynamicRole[]> {
  const cacheKey = practiceId?.toString() || 'system';
  const now = Date.now();

  // Check cache first
  if (rolesCache[cacheKey] && lastCacheUpdate[cacheKey] && 
      (now - lastCacheUpdate[cacheKey]) < CACHE_DURATION) {
    return rolesCache[cacheKey];
  }

  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    let rolesData;
    if (practiceId) {
      // Get both system roles and practice-specific roles
      rolesData = await db.select().from(roles).where(
        or(
          eq(roles.practiceId, practiceId),
          and(eq(roles.isSystemDefined, true), isNull(roles.practiceId))
        )
      );
    } else {
      // Get only system roles
      rolesData = await db.select().from(roles).where(
        and(eq(roles.isSystemDefined, true), isNull(roles.practiceId))
      );
    }

    const dynamicRoles: DynamicRole[] = rolesData.map((role: any) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName || role.name,
      description: role.description || undefined,
      isSystemDefined: role.isSystemDefined,
      isCustom: !role.isSystemDefined,
      practiceId: role.practiceId || undefined,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    }));

    // Update cache
    rolesCache[cacheKey] = dynamicRoles;
    lastCacheUpdate[cacheKey] = now;

    return dynamicRoles;
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
}

/**
 * Get a specific role by name
 */
export async function getRoleByName(roleName: string, practiceId?: number): Promise<DynamicRole | null> {
  const allRoles = await getRoles(practiceId);
  return allRoles.find(role => role.name === roleName) || null;
}

/**
 * Check if a user has a specific role
 */
export async function hasRole(userRole: string, targetRole: string, practiceId?: number): Promise<boolean> {
  const role = await getRoleByName(targetRole, practiceId);
  return role ? userRole === role.name : false;
}

/**
 * Check if a user has any of the specified roles
 */
export async function hasAnyRole(userRole: string, targetRoles: string[], practiceId?: number): Promise<boolean> {
  for (const targetRole of targetRoles) {
    if (await hasRole(userRole, targetRole, practiceId)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  userRole: string, 
  resource: string, 
  action: string, 
  practiceId?: number
): Promise<boolean> {
  const role = await getRoleByName(userRole, practiceId);
  if (!role) return false;

  const permission = role.permissions.find(
    p => p.resource === resource && p.action === action
  );
  return permission ? permission.granted : false;
}

/**
 * Role checking functions using dynamic roles
 */
export async function isSuperAdmin(userRole: string, practiceId?: number): Promise<boolean> {
  return await hasRole(userRole, 'SUPER_ADMIN', practiceId);
}

export async function isPracticeAdmin(userRole: string, practiceId?: number): Promise<boolean> {
  const result = await hasAnyRole(userRole, ['PRACTICE_ADMINISTRATOR', 'PRACTICE_ADMIN'], practiceId);
  console.log(`[DYNAMIC_ROLES isPracticeAdmin] userRole: ${userRole}, result: ${result}`);
  return result;
}

export async function isVeterinarian(userRole: string, practiceId?: number): Promise<boolean> {
  return await hasRole(userRole, 'VETERINARIAN', practiceId);
}

export async function isTechnician(userRole: string, practiceId?: number): Promise<boolean> {
  return await hasRole(userRole, 'TECHNICIAN', practiceId);
}

export async function isReceptionist(userRole: string, practiceId?: number): Promise<boolean> {
  return await hasRole(userRole, 'RECEPTIONIST', practiceId);
}

export async function isClient(userRole: string, practiceId?: number): Promise<boolean> {
  return await hasRole(userRole, 'CLIENT', practiceId);
}

/**
 * Administrative role checking
 */
export async function isAdmin(userRole: string, practiceId?: number): Promise<boolean> {
  const result = await hasAnyRole(userRole, [
    'SUPER_ADMIN', 
    'PRACTICE_ADMINISTRATOR', 
    'ADMINISTRATOR', 
    'PRACTICE_ADMIN',
    'PRACTICE_MANAGER',
    'OFFICE_MANAGER'
  ], practiceId);
  console.log(`[DYNAMIC_ROLES isAdmin] userRole: ${userRole}, result: ${result}`);
  return result;
}

export async function canManageUsers(userRole: string, practiceId?: number): Promise<boolean> {
  return await hasPermission(userRole, 'users', 'MANAGE', practiceId) ||
         await hasAnyRole(userRole, ['SUPER_ADMIN', 'PRACTICE_ADMINISTRATOR'], practiceId);
}

export async function canManageRoles(userRole: string, practiceId?: number): Promise<boolean> {
  return await hasPermission(userRole, 'roles', 'MANAGE', practiceId) ||
         await hasAnyRole(userRole, ['SUPER_ADMIN', 'PRACTICE_ADMINISTRATOR'], practiceId);
}

/**
 * Clear cache (useful for testing or when roles change)
 */
export function clearRolesCache(): void {
  rolesCache = {};
  lastCacheUpdate = {};
}

/**
 * Get all roles assigned to a specific user
 */
export async function getUserAssignedRoles(userId: string, practiceId?: number): Promise<DynamicRole[]> {
  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    const userRoleAssignments = await db
      .select({
        role: roles,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, parseInt(userId)),
          eq(userRoles.isActive, true),
          practiceId 
            ? or(
                eq(roles.practiceId, practiceId),
                and(eq(roles.isSystemDefined, true), isNull(roles.practiceId))
              )
            : and(eq(roles.isSystemDefined, true), isNull(roles.practiceId))
        )
      );

    return userRoleAssignments.map(({ role }: any) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName || role.name,
      description: role.description || undefined,
      isSystemDefined: role.isSystemDefined,
      isCustom: !role.isSystemDefined,
      practiceId: role.practiceId || undefined,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    }));
  } catch (error) {
    console.error('Error fetching user assigned roles:', error);
    return [];
  }
}

/**
 * Get permission overrides for a specific user
 */
export async function getUserPermissionOverrides(
  userId: string,
  practiceId: number,
  resource?: string,
  action?: string
): Promise<any[]> {
  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    let query = db
      .select()
      .from(permissionOverrides)
      .where(
        and(
          eq(permissionOverrides.userId, userId),
          eq(permissionOverrides.practiceId, practiceId),
          eq(permissionOverrides.status, 'active'),
          or(
            isNull(permissionOverrides.expiresAt),
            gt(permissionOverrides.expiresAt, new Date())
          )
        )
      );

    if (resource) {
      query = query.where(
        and(
          eq(permissionOverrides.userId, userId),
          eq(permissionOverrides.practiceId, practiceId),
          eq(permissionOverrides.resource, resource),
          resource && action ? eq(permissionOverrides.action, action) : undefined
        )
      );
    }

    return await query;
  } catch (error) {
    console.error('Error fetching permission overrides:', error);
    return [];
  }
}

/**
 * Check if a user has a specific permission (considering role permissions and overrides)
 */
export async function hasUserPermission(
  userId: string,
  resource: string,
  action: string,
  practiceId?: number
): Promise<boolean> {
  try {
    // Check if user is SUPER_ADMIN first - they have access to everything
    const userAssignedRoles = await getUserAssignedRoles(userId, practiceId);
    const isSuperAdmin = userAssignedRoles.some(role => role.name === 'SUPER_ADMIN');
    
    if (isSuperAdmin) {
      return true; // SUPER_ADMIN has access to everything
    }

    // First check permission overrides (they take precedence for non-super-admins)
    if (practiceId) {
      const overrides = await getUserPermissionOverrides(userId, practiceId, resource, action);
      const relevantOverride = overrides.find(
        override => override.resource === resource && override.action === action
      );
      
      if (relevantOverride) {
        return relevantOverride.granted;
      }
    }

    // Then check role-based permissions
    for (const role of userAssignedRoles) {
      const permission = role.permissions.find(
        p => p.resource === resource && p.action === action
      );
      if (permission && permission.granted) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Check if a user has any of the specified roles (considering assignments)
 */
export async function hasUserAnyRole(userId: string, targetRoles: string[], practiceId?: number): Promise<boolean> {
  try {
    const userAssignedRoles = await getUserAssignedRoles(userId, practiceId);
    const userRoleNames = userAssignedRoles.map(role => role.name);
    
    return targetRoles.some(targetRole => userRoleNames.includes(targetRole));
  } catch (error) {
    console.error('Error checking user roles:', error);
    return false;
  }
}

/**
 * Check if a user can switch between practices
 */
export async function canSwitchPractices(userId: string): Promise<boolean> {
  try {
    // SUPER_ADMIN can always switch practices
    const isSuperAdmin = await isUserSuperAdmin(userId);
    if (isSuperAdmin) {
      return true;
    }

    // Check if user has explicit practice switching permission
    const userAssignedRoles = await getUserAssignedRoles(userId);
    
    for (const role of userAssignedRoles) {
      const hasSwitchPermission = role.permissions.some(
        p => (p.resource === 'practice_switching' && p.action === 'MANAGE' && p.granted) ||
             (p.resource === 'practices' && p.action === 'SWITCH' && p.granted) ||
             (p.resource === '*' && p.action === '*' && p.granted)
      );
      
      if (hasSwitchPermission) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking practice switching permission:', error);
    return false;
  }
}

/**
 * Get all practices a user has access to
 */
export async function getUserAccessiblePractices(userId: string): Promise<number[]> {
  try {
    // SUPER_ADMIN has access to all practices
    const isSuperAdmin = await isUserSuperAdmin(userId);
    if (isSuperAdmin) {
      // Return all practice IDs (would need to query practices table)
      // For now, return a special indicator that they have access to all
      return [-1]; // -1 indicates "all practices"
    }

    // For other users, get their practice-specific roles
    const userAssignedRoles = await getUserAssignedRoles(userId);
    const accessiblePractices = new Set<number>();

    for (const role of userAssignedRoles) {
      if (role.practiceId) {
        accessiblePractices.add(role.practiceId);
      }
    }

    return Array.from(accessiblePractices);
  } catch (error) {
    console.error('Error getting user accessible practices:', error);
    return [];
  }
}

/**
 * Enhanced role checking functions that consider user assignments
 */
export async function isUserSuperAdmin(userId: string, practiceId?: number): Promise<boolean> {
  return await hasUserAnyRole(userId, ['SUPER_ADMIN'], practiceId);
}

export async function isUserPracticeAdmin(userId: string, practiceId?: number): Promise<boolean> {
  return await hasUserAnyRole(userId, ['PRACTICE_ADMINISTRATOR', 'PRACTICE_ADMIN'], practiceId);
}

export async function isUserVeterinarian(userId: string, practiceId?: number): Promise<boolean> {
  return await hasUserAnyRole(userId, ['VETERINARIAN'], practiceId);
}

export async function isUserAdmin(userId: string, practiceId?: number): Promise<boolean> {
  return await hasUserAnyRole(userId, [
    'SUPER_ADMIN', 
    'PRACTICE_ADMINISTRATOR', 
    'ADMINISTRATOR', 
    'PRACTICE_ADMIN',
    'PRACTICE_MANAGER',
    'OFFICE_MANAGER'
  ], practiceId);
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(
  userId: number,
  roleId: number,
  assignedBy: number
): Promise<boolean> {
  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    // Check if assignment already exists and is active
    const existingAssignment = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.isActive, true)
        )
      )
      .limit(1);

    if (existingAssignment.length > 0) {
      console.log('Role already assigned to user');
      return true;
    }

    // Create new role assignment
    await db.insert(userRoles).values({
      userId,
      roleId,
      assignedBy,
      assignedAt: new Date(),
      isActive: true,
    });

    // Clear cache
    clearRolesCache();
    
    return true;
  } catch (error) {
    console.error('Error assigning role to user:', error);
    return false;
  }
}

/**
 * Revoke a role from a user
 */
export async function revokeRoleFromUser(
  userId: number,
  roleId: number,
  revokedBy: number
): Promise<boolean> {
  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    await db
      .update(userRoles)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
      })
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.isActive, true)
        )
      );

    // Clear cache
    clearRolesCache();
    
    return true;
  } catch (error) {
    console.error('Error revoking role from user:', error);
    return false;
  }
}

/**
 * Create a permission override for a user
 */
export async function createPermissionOverride(override: {
  userId: string;
  userName: string;
  userEmail: string;
  resource: string;
  action: string;
  granted: boolean;
  reason: string;
  expiresAt?: Date;
  practiceId: number;
  createdBy: string;
}): Promise<boolean> {
  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    await db.insert(permissionOverrides).values({
      ...override,
      status: 'active',
      createdAt: new Date(),
    });
    
    return true;
  } catch (error) {
    console.error('Error creating permission override:', error);
    return false;
  }
}

/**
 * Legacy constants for backward compatibility
 */
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
