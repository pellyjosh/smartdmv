/**
 * RBAC Utility Functions
 */

import { 
  PermissionContext, 
  PermissionCheckResult, 
  Permission, 
  Role, 
  UserPermissionOverride,
  PermissionCondition
} from './types';
import { DEFAULT_ROLES, getAllRolePermissions } from './roles';
import { UserRoleEnum } from '@/db/schema';

/**
 * Check if a user has a specific permission
 */
export async function checkPermission(
  context: PermissionContext,
  overrides: UserPermissionOverride[] = []
): Promise<PermissionCheckResult> {
  const { userId, userRole, practiceId, resourceId, resourceType, action, additionalContext } = context;

  // Check for user-specific overrides first
  const override = overrides.find(o => 
    o.userId === userId &&
    o.resource === resourceType &&
    o.action === action &&
    o.status === 'active' &&
    (!o.expiresAt || o.expiresAt > new Date())
  );

  if (override) {
    return {
      allowed: override.granted,
      reason: override.granted ? 'Permission granted by override' : 'Permission denied by override'
    };
  }

  // Get role permissions
  // Attempt to fetch all assigned roles for the user and aggregate permissions.
  // This lets users with multiple roles gain permissions from any assigned role.
  let dynamicRolePermissions: Permission[] | null = null;
  let assignedRolesFromApi: any[] | null = null;
  try {
    const res = await fetch(`/api/user-roles/${userId}`);
    if (res.ok) {
      const result = await res.json();
      // The main API returns { roles: [...], practiceId: ... }
      if (result && Array.isArray(result.roles) && result.roles.length > 0) {
        assignedRolesFromApi = result.roles;
        const perms: Permission[] = [];
        for (const r of result.roles) {
          if (Array.isArray(r.permissions)) {
            perms.push(...r.permissions);
          }
        }
        dynamicRolePermissions = perms;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch user assigned roles, falling back to DEFAULT_ROLES', err);
  }

  let permissions: Permission[];
  if (dynamicRolePermissions) {
    // If any assigned role is SUPER_ADMIN, short-circuit allow
    if (assignedRolesFromApi && assignedRolesFromApi.some(r => r.name === 'SUPER_ADMIN')) {
      return { allowed: true, reason: 'Permission granted by SUPER_ADMIN role' };
    }

    permissions = dynamicRolePermissions;
  } else {
    const role = DEFAULT_ROLES[userRole as UserRoleEnum];
    if (!role) {
      return {
        allowed: false,
        reason: 'Unknown user role',
        missingPermissions: [`${resourceType}:${action}`]
      };
    }

    permissions = getAllRolePermissions(role);
  }
  // Support a small set of resource aliases to bridge gaps between
  // DB-seeded permission resource names and the in-memory permission
  // templates used by DEFAULT_ROLES. For example, some DB roles use
  // 'checklists' while permission templates place checklist-like
  // permissions under 'treatments'. This alias map is intentionally
  // small and explicit to avoid unexpected permission grants.
  const RESOURCE_ALIASES: Record<string, string[]> = {
    checklists: ['treatments'],
  };

  const resourcesToCheck = [resourceType, ...(RESOURCE_ALIASES[resourceType] || [])];

  const relevantPermission = permissions.find(p => 
    resourcesToCheck.includes(p.resource) && 
    p.action === action
  );

  if (!relevantPermission) {
    return {
      allowed: false,
      reason: 'Permission not found in role',
      missingPermissions: [`${resourceType}:${action}`]
    };
  }

  if (!relevantPermission.granted) {
    return {
      allowed: false,
      reason: 'Permission explicitly denied',
      missingPermissions: [`${resourceType}:${action}`]
    };
  }

  // Check permission conditions
  if (relevantPermission.conditions && relevantPermission.conditions.length > 0) {
    const conditionResult = await evaluateConditions(
      relevantPermission.conditions,
      { userId, practiceId, resourceId, ...additionalContext }
    );
    
    if (!conditionResult.passed) {
      return {
        allowed: false,
        reason: `Condition failed: ${conditionResult.reason}`,
        missingPermissions: [`${resourceType}:${action}`]
      };
    }
  }

  return {
    allowed: true,
    reason: 'Permission granted by role'
  };
}

/**
 * Evaluate permission conditions
 */
async function evaluateConditions(
  conditions: PermissionCondition[],
  context: Record<string, any>
): Promise<{ passed: boolean; reason?: string }> {
  for (const condition of conditions) {
    const contextValue = context[condition.field];
    const conditionValue = condition.value;

    // Handle variable substitution
    const resolvedValue = typeof conditionValue === 'string' && conditionValue.startsWith('${')
      ? context[conditionValue.slice(2, -1)]
      : conditionValue;

    let passed = false;

    switch (condition.operator) {
      case 'equals':
        passed = contextValue === resolvedValue;
        break;
      case 'not_equals':
        passed = contextValue !== resolvedValue;
        break;
      case 'in':
        passed = Array.isArray(resolvedValue) && resolvedValue.includes(contextValue);
        break;
      case 'not_in':
        passed = Array.isArray(resolvedValue) && !resolvedValue.includes(contextValue);
        break;
      case 'greater_than':
        passed = contextValue > resolvedValue;
        break;
      case 'less_than':
        passed = contextValue < resolvedValue;
        break;
      default:
        return { passed: false, reason: `Unknown operator: ${condition.operator}` };
    }

    if (!passed) {
      return { 
        passed: false, 
        reason: `Condition failed: ${condition.field} ${condition.operator} ${resolvedValue}` 
      };
    }
  }

  return { passed: true };
}

/**
 * Check multiple permissions at once
 */
export async function checkMultiplePermissions(
  baseContext: Omit<PermissionContext, 'resourceType' | 'action'>,
  requiredPermissions: Array<{ resourceType: string; action: string }>,
  overrides: UserPermissionOverride[] = []
): Promise<PermissionCheckResult> {
  const results = await Promise.all(
    requiredPermissions.map(({ resourceType, action }) =>
      checkPermission({ ...baseContext, resourceType, action }, overrides)
    )
  );

  const failedPermissions = results
    .map((result, index) => result.allowed ? null : requiredPermissions[index])
    .filter(Boolean)
    .map(p => `${p!.resourceType}:${p!.action}`);

  if (failedPermissions.length > 0) {
    return {
      allowed: false,
      reason: `Missing required permissions: ${failedPermissions.join(', ')}`,
      missingPermissions: failedPermissions
    };
  }

  return {
    allowed: true,
    reason: 'All required permissions granted'
  };
}

/**
 * Check if user can perform action on resource with ownership validation
 */
export async function checkResourceOwnership(
  context: PermissionContext,
  getResourceOwner: (resourceType: string, resourceId: string) => Promise<string | null>,
  overrides: UserPermissionOverride[] = []
): Promise<PermissionCheckResult> {
  // First check basic permission
  const basicCheck = await checkPermission(context, overrides);
  if (!basicCheck.allowed) {
    return basicCheck;
  }

  // If resource ID is provided, check ownership
  if (context.resourceId) {
    const ownerId = await getResourceOwner(context.resourceType, context.resourceId);
    if (ownerId && ownerId !== context.userId) {
      // Check if user has admin privileges that override ownership
      const adminRoles = [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.ADMINISTRATOR
      ];
      
      if (!adminRoles.includes(context.userRole as UserRoleEnum)) {
        return {
          allowed: false,
          reason: 'Resource ownership required',
          missingPermissions: [`${context.resourceType}:${context.action}:ownership`]
        };
      }
    }
  }

  return basicCheck;
}

/**
 * Get all permissions for a user role
 */
export function getUserRolePermissions(userRole: UserRoleEnum): Permission[] {
  const role = DEFAULT_ROLES[userRole];
  return role ? getAllRolePermissions(role) : [];
}

/**
 * Check if user has any administrative permissions
 */
export function hasAdminPermissions(userRole: UserRoleEnum): boolean {
  const adminRoles = [
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.PRACTICE_ADMINISTRATOR,
    UserRoleEnum.ADMINISTRATOR,
    UserRoleEnum.PRACTICE_ADMIN,
    UserRoleEnum.PRACTICE_MANAGER,
    UserRoleEnum.OFFICE_MANAGER
  ];
  return adminRoles.includes(userRole);
}

/**
 * Check if user has system-wide access (super admin)
 */
export function hasSystemAccess(userRole: UserRoleEnum): boolean {
  return userRole === UserRoleEnum.SUPER_ADMIN;
}

/**
 * Check if user has practice-level admin access
 */
export function hasPracticeAdminAccess(userRole: UserRoleEnum): boolean {
  return [
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.PRACTICE_ADMINISTRATOR,
    UserRoleEnum.ADMINISTRATOR,
    UserRoleEnum.PRACTICE_ADMIN
  ].includes(userRole);
}

/**
 * Get user's accessible practice IDs based on role
 */
export function getAccessiblePracticeIds(
  userRole: UserRoleEnum,
  userPracticeId?: string,
  administratorPracticeIds: string[] = []
): string[] {
  switch (userRole) {
    case UserRoleEnum.SUPER_ADMIN:
      return ['*']; // All practices
    case UserRoleEnum.ADMINISTRATOR:
      return administratorPracticeIds;
    case UserRoleEnum.PRACTICE_ADMINISTRATOR:
    case UserRoleEnum.PRACTICE_ADMIN:
    case UserRoleEnum.PRACTICE_MANAGER:
    case UserRoleEnum.VETERINARIAN:
    case UserRoleEnum.TECHNICIAN:
    case UserRoleEnum.RECEPTIONIST:
    case UserRoleEnum.ACCOUNTANT:
    case UserRoleEnum.CASHIER:
    case UserRoleEnum.OFFICE_MANAGER:
    case UserRoleEnum.CLIENT:
      return userPracticeId ? [userPracticeId] : [];
    default:
      return [];
  }
}

/**
 * Filter data based on user's practice access
 */
export function filterByPracticeAccess<T extends { practiceId?: number }>(
  data: T[],
  userRole: UserRoleEnum,
  userPracticeId?: string,
  administratorPracticeIds: string[] = []
): T[] {
  const accessibleIds = getAccessiblePracticeIds(userRole, userPracticeId, administratorPracticeIds);
  
  if (accessibleIds.includes('*')) {
    return data; // Super admin sees all
  }
  
  return data.filter(item => 
    item.practiceId && accessibleIds.includes(item.practiceId.toString())
  );
}

/**
 * Create permission context from request data
 */
export function createPermissionContext(
  userId: string,
  userRole: string,
  resourceType: string,
  action: string,
  options: {
    practiceId?: number;
    resourceId?: string;
    additionalContext?: Record<string, any>;
  } = {}
): PermissionContext {
  return {
    userId,
    userRole,
    resourceType,
    action,
    practiceId: options.practiceId,
    resourceId: options.resourceId,
    additionalContext: options.additionalContext || {}
  };
}

/**
 * Generate permission audit log entry
 */
export function createAuditLogEntry(
  context: PermissionContext,
  result: PermissionCheckResult,
  ipAddress?: string,
  userAgent?: string
) {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: context.userId,
    resource: context.resourceType,
    action: context.action,
    allowed: result.allowed,
    reason: result.reason || 'No reason provided',
    context: {
      practiceId: context.practiceId,
      resourceId: context.resourceId,
      ...context.additionalContext
    },
    timestamp: new Date(),
    ipAddress,
    userAgent
  };
}

/**
 * Validate permission string format (resource:action)
 */
export function validatePermissionString(permission: string): boolean {
  const parts = permission.split(':');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

/**
 * Parse permission string into components
 */
export function parsePermissionString(permission: string): { resource: string; action: string } | null {
  if (!validatePermissionString(permission)) {
    return null;
  }
  
  const [resource, action] = permission.split(':');
  return { resource, action };
}

/**
 * Format permission for display
 */
export function formatPermissionForDisplay(resource: string, action: string): string {
  const formattedResource = resource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const formattedAction = action.replace(/_/g, ' ').toLowerCase();
  return `${formattedAction} ${formattedResource}`;
}
