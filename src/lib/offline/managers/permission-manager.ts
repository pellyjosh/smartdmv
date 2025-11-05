/**
 * Permission Manager
 * Handles permission evaluation and access control offline
 */

import * as permissionStorage from '../storage/permission-storage';
import { getOfflineTenantContext } from '../core/tenant-context';
import type {
  PermissionCheckRequest,
  PermissionCheckResult,
  PermissionContext,
  PermissionAction,
  RLSFilter,
} from '../types/permission.types';
import { PermissionDeniedError } from '../utils/error-handlers';

/**
 * Permission Manager Class
 */
class PermissionManager {
  /**
   * Check if user can perform action on resource
   */
  async can(
    resource: string,
    action: PermissionAction,
    context?: PermissionContext
  ): Promise<boolean> {
    const tenantContext = await getOfflineTenantContext();
    if (!tenantContext) {
      return false;
    }

    return permissionStorage.hasPermission(
      tenantContext.userId,
      tenantContext.tenantId,
      resource,
      action
    );
  }

  /**
   * Check create permission
   */
  async canCreate(entityType: string): Promise<boolean> {
    return this.can(entityType, 'create');
  }

  /**
   * Check read permission
   */
  async canRead(entityType: string, context?: PermissionContext): Promise<boolean> {
    return this.can(entityType, 'read', context);
  }

  /**
   * Check update permission
   */
  async canUpdate(entityType: string, context?: PermissionContext): Promise<boolean> {
    return this.can(entityType, 'update', context);
  }

  /**
   * Check delete permission
   */
  async canDelete(entityType: string, context?: PermissionContext): Promise<boolean> {
    return this.can(entityType, 'delete', context);
  }

  /**
   * Perform permission check with detailed result
   */
  async checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResult> {
    try {
      const hasPermission = await permissionStorage.hasPermission(
        request.userId,
        request.tenantId,
        request.resource,
        request.action
      );

      console.log('[PermissionManager] checkPermission:', {
        resource: request.resource,
        action: request.action,
        hasPermission,
        userId: request.userId,
        tenantId: request.tenantId,
      });

      if (!hasPermission) {
        return {
          allowed: false,
          reason: `User does not have ${request.action} permission on ${request.resource}`,
          missingPermissions: [`${request.resource}:${request.action}`],
        };
      }

      // Check additional context-based conditions
      if (request.context) {
        const contextCheck = await this.checkContext(request);
        if (!contextCheck.allowed) {
          return contextCheck;
        }
      }

      return {
        allowed: true,
      };
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Permission check failed',
      };
    }
  }

  /**
   * Check context-based conditions (e.g., "own only")
   */
  private async checkContext(request: PermissionCheckRequest): Promise<PermissionCheckResult> {
    const cache = await permissionStorage.getPermissions(
      request.userId,
      request.tenantId
    );

    if (!cache) {
      return {
        allowed: false,
        reason: 'Permission cache not found',
      };
    }

    const resourcePerms = cache.effectivePermissions[request.resource];
    if (!resourcePerms?.conditions) {
      return { allowed: true };
    }

    const conditions = resourcePerms.conditions;
    const context = request.context!;

    // Check "own only" condition
    if (conditions.ownOnly && context.ownerId !== request.userId) {
      return {
        allowed: false,
        reason: 'You can only access your own records',
      };
    }

    // Check department restriction
    if (conditions.departmentOnly && context.departmentId) {
      // Would need to check user's assigned departments
      // For now, allow
    }

    // Check location restriction
    if (conditions.locationOnly && context.locationId) {
      // Would need to check user's assigned locations
      // For now, allow
    }

    return { allowed: true };
  }

  /**
   * Apply row-level security filter
   */
  async applyRLS<T extends Record<string, any>>(
    entities: T[],
    resource: string
  ): Promise<T[]> {
    const tenantContext = await getOfflineTenantContext();
    if (!tenantContext) {
      return [];
    }

    const cache = await permissionStorage.getPermissions(
      tenantContext.userId,
      tenantContext.tenantId
    );

    if (!cache) {
      return entities;
    }

    const resourcePerms = cache.effectivePermissions[resource];
    if (!resourcePerms?.conditions) {
      return entities;
    }

    const conditions = resourcePerms.conditions;

    return entities.filter((entity) => {
      // "Own only" filter
      if (conditions.ownOnly) {
        return entity.userId === tenantContext.userId || 
               entity.createdBy === tenantContext.userId ||
               entity.assignedTo === tenantContext.userId;
      }

      // Department filter
      if (conditions.departmentOnly && entity.departmentId) {
        // Would check user's departments
        return true; // Placeholder
      }

      // Location filter
      if (conditions.locationOnly && entity.locationId) {
        // Would check user's locations
        return true; // Placeholder
      }

      return true;
    });
  }



  /**
   * Require permission (throws if denied)
   */
  async require(
    resource: string,
    action: PermissionAction,
    context?: PermissionContext
  ): Promise<void> {
    const allowed = await this.can(resource, action, context);
    
    if (!allowed) {
      throw new PermissionDeniedError(resource, action);
    }
  }

  /**
   * Check multiple permissions at once
   */
  async canAny(
    resource: string,
    actions: PermissionAction[]
  ): Promise<{ [key in PermissionAction]?: boolean }> {
    const results: { [key in PermissionAction]?: boolean } = {};

    for (const action of actions) {
      results[action] = await this.can(resource, action);
    }

    return results;
  }

  /**
   * Check if user has all permissions
   */
  async canAll(
    resource: string,
    actions: PermissionAction[]
  ): Promise<boolean> {
    for (const action of actions) {
      const allowed = await this.can(resource, action);
      if (!allowed) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get user's roles
   */
  async getUserRoles() {
    const context = await getOfflineTenantContext();
    if (!context) {
      console.warn('[PermissionManager] ❌ No tenant context for getUserRoles');
      return [];
    }

    console.log('[PermissionManager] 🔍 getUserRoles context:', {
      userId: context.userId,
      userIdType: typeof context.userId,
      tenantId: context.tenantId,
      practiceId: context.practiceId,
    });

    const roles = await permissionStorage.getUserRoles(context.userId, context.tenantId);
    console.log('[PermissionManager] 📋 getUserRoles result:', {
      rolesCount: roles.length,
      roleNames: roles.map(r => r.name),
    });
    
    return roles;
  }

  /**
   * Check if user has specific role
   */
  async hasRole(roleName: string): Promise<boolean> {
    const roles = await this.getUserRoles();
    return roles.some((role) => role.name === roleName);
  }

  /**
   * Check if permission cache is valid
   */
  async isCacheValid(): Promise<boolean> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return false;
    }

    return permissionStorage.isPermissionCacheValid(
      context.userId,
      context.tenantId
    );
  }

  /**
   * Refresh permissions from storage
   */
  async refreshPermissions(): Promise<void> {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    // This would typically trigger a sync with server
    // For now, just verify cache exists
    const cache = await permissionStorage.getPermissions(
      context.userId,
      context.tenantId
    );

    if (!cache) {
      console.warn('[PermissionManager] No permission cache found');
    }
  }

  /**
   * Get permission summary for debugging
   */
  async getPermissionSummary(): Promise<{
    roles: string[];
    permissions: number;
    cacheValid: boolean;
  }> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return {
        roles: [],
        permissions: 0,
        cacheValid: false,
      };
    }

    const cache = await permissionStorage.getPermissions(
      context.userId,
      context.tenantId
    );

    if (!cache) {
      return {
        roles: [],
        permissions: 0,
        cacheValid: false,
      };
    }

    return {
      roles: cache.roles.map((r) => r.name),
      permissions: cache.allPermissions.length,
      cacheValid: cache.expiresAt > Date.now(),
    };
  }
}

// Export singleton instance
export const permissionManager = new PermissionManager();

// Export methods for direct use
export const {
  can,
  canCreate,
  canRead,
  canUpdate,
  canDelete,
  require,
  hasRole,
} = permissionManager;
