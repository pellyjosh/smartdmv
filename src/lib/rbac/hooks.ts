/**
 * React Hooks for RBAC
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useUser } from '@/context/UserContext';
import { useQuery } from '@tanstack/react-query';
import { 
  checkPermission, 
  checkMultiplePermissions, 
  createPermissionContext,
  getUserRolePermissions,
  hasAdminPermissions,
  hasSystemAccess,
  hasPracticeAdminAccess
} from './utils';
import { 
  PermissionContext, 
  PermissionCheckResult, 
  UserPermissionOverride,
  ResourceType,
  StandardAction
} from './types';
import { UserRoleEnum } from '@/db/schema';

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(
  resource: ResourceType | string,
  action: StandardAction | string,
  options: {
    practiceId?: number;
    resourceId?: string;
    additionalContext?: Record<string, any>;
  } = {}
) {
  const { user } = useUser();

  // Fetch user permission overrides
  const { data: overrides = [] } = useQuery<UserPermissionOverride[]>({
    queryKey: ['user-permission-overrides', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/permission-overrides/user/${user.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const checkUserPermission = useCallback(async (): Promise<PermissionCheckResult> => {
    if (!user) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    const context = createPermissionContext(
      user.id,
      user.role,
      resource,
      action,
      options
    );

    return checkPermission(context, overrides);
  }, [user, resource, action, options, overrides]);

  return {
    checkPermission: checkUserPermission,
    user,
    isLoading: !user
  };
}

/**
 * Hook to check multiple permissions at once
 */
export function useMultiplePermissions(
  requiredPermissions: Array<{ resource: ResourceType | string; action: StandardAction | string }>,
  options: {
    practiceId?: number;
    additionalContext?: Record<string, any>;
  } = {}
) {
  const { user } = useUser();

  const { data: overrides = [] } = useQuery<UserPermissionOverride[]>({
    queryKey: ['user-permission-overrides', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/permission-overrides/user/${user.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const checkUserPermissions = useCallback(async (): Promise<PermissionCheckResult> => {
    if (!user) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    const baseContext = {
      userId: user.id,
      userRole: user.role,
      practiceId: options.practiceId,
      additionalContext: options.additionalContext || {}
    };

    const permissionsToCheck = requiredPermissions.map(({ resource, action }) => ({
      resourceType: resource,
      action
    }));

    return checkMultiplePermissions(baseContext, permissionsToCheck, overrides);
  }, [user, requiredPermissions, options, overrides]);

  return {
    checkPermissions: checkUserPermissions,
    user,
    isLoading: !user
  };
}

/**
 * Hook for role-based checks
 */
export function useRole() {
  const { user } = useUser();

  const roleInfo = useMemo(() => {
    if (!user) {
      return {
        role: null,
        isAdmin: false,
        isSystemAdmin: false,
        isPracticeAdmin: false,
        permissions: []
      };
    }

    const userRole = user.role as UserRoleEnum;
    return {
      role: userRole,
      isAdmin: hasAdminPermissions(userRole),
      isSystemAdmin: hasSystemAccess(userRole),
      isPracticeAdmin: hasPracticeAdminAccess(userRole),
      permissions: getUserRolePermissions(userRole)
    };
  }, [user]);

  return {
    ...roleInfo,
    user,
    isLoading: !user
  };
}

/**
 * Hook to get user's practice context
 */
export function usePracticeContext() {
  const { user } = useUser();

  const practiceContext = useMemo(() => {
    if (!user) {
      return {
        practiceId: null,
        canAccessMultiplePractices: false,
        accessiblePracticeIds: []
      };
    }

    // Extract practice information based on user type
    if ('practiceId' in user) {
      return {
        practiceId: parseInt(user.practiceId),
        canAccessMultiplePractices: false,
        accessiblePracticeIds: [user.practiceId]
      };
    }

    if ('accessiblePracticeIds' in user) {
      return {
        practiceId: 'currentPracticeId' in user ? parseInt(user.currentPracticeId) : null,
        canAccessMultiplePractices: true,
        accessiblePracticeIds: user.accessiblePracticeIds.map(id => id.toString())
      };
    }

    return {
      practiceId: null,
      canAccessMultiplePractices: false,
      accessiblePracticeIds: []
    };
  }, [user]);

  return {
    ...practiceContext,
    user,
    isLoading: !user
  };
}

/**
 * Hook for permission-based feature flags
 */
export function useFeatureFlags() {
  const { user } = useUser();
  const { isAdmin, isSystemAdmin, isPracticeAdmin } = useRole();

  const features = useMemo(() => {
    if (!user) {
      return {
        canManageUsers: false,
        canManageRoles: false,
        canViewReports: false,
        canManageInventory: false,
        canManageBilling: false,
        canAccessLab: false,
        canAccessImaging: false,
        canManageSchedules: false,
        canExportData: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
        canManageBackups: false
      };
    }

    const userRole = user.role as UserRoleEnum;

    return {
      canManageUsers: [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.ADMINISTRATOR,
        UserRoleEnum.PRACTICE_ADMIN
      ].includes(userRole),

      canManageRoles: [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.PRACTICE_ADMIN
      ].includes(userRole),

      canViewReports: [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.ADMINISTRATOR,
        UserRoleEnum.PRACTICE_ADMIN,
        UserRoleEnum.PRACTICE_MANAGER,
        UserRoleEnum.OFFICE_MANAGER,
        UserRoleEnum.ACCOUNTANT,
        UserRoleEnum.VETERINARIAN
      ].includes(userRole),

      canManageInventory: [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.ADMINISTRATOR,
        UserRoleEnum.PRACTICE_ADMIN,
        UserRoleEnum.PRACTICE_MANAGER,
        UserRoleEnum.OFFICE_MANAGER,
        UserRoleEnum.VETERINARIAN
      ].includes(userRole),

      canManageBilling: [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.ADMINISTRATOR,
        UserRoleEnum.PRACTICE_ADMIN,
        UserRoleEnum.PRACTICE_MANAGER,
        UserRoleEnum.OFFICE_MANAGER,
        UserRoleEnum.ACCOUNTANT,
        UserRoleEnum.CASHIER,
        UserRoleEnum.RECEPTIONIST
      ].includes(userRole),

      canAccessLab: [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.ADMINISTRATOR,
        UserRoleEnum.PRACTICE_ADMIN,
        UserRoleEnum.VETERINARIAN,
        UserRoleEnum.TECHNICIAN
      ].includes(userRole),

      canAccessImaging: [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.ADMINISTRATOR,
        UserRoleEnum.PRACTICE_ADMIN,
        UserRoleEnum.VETERINARIAN,
        UserRoleEnum.TECHNICIAN
      ].includes(userRole),

      canManageSchedules: [
        UserRoleEnum.SUPER_ADMIN,
        UserRoleEnum.PRACTICE_ADMINISTRATOR,
        UserRoleEnum.ADMINISTRATOR,
        UserRoleEnum.PRACTICE_ADMIN,
        UserRoleEnum.PRACTICE_MANAGER,
        UserRoleEnum.OFFICE_MANAGER,
        UserRoleEnum.RECEPTIONIST
      ].includes(userRole),

      canExportData: isAdmin,
      canManageIntegrations: isPracticeAdmin,
      canViewAuditLogs: isPracticeAdmin,
      canManageBackups: isSystemAdmin
    };
  }, [user, isAdmin, isSystemAdmin, isPracticeAdmin]);

  return {
    ...features,
    user,
    isLoading: !user
  };
}

/**
 * Hook to check if current user can access a specific practice
 */
export function usePracticeAccess(practiceId: number) {
  const { user } = useUser();
  const { accessiblePracticeIds, canAccessMultiplePractices } = usePracticeContext();

  const canAccess = useMemo(() => {
    if (!user) return false;

    // Super admin can access any practice
    if (user.role === UserRoleEnum.SUPER_ADMIN) return true;

    // Check if practice is in accessible list
    return accessiblePracticeIds.includes(practiceId.toString());
  }, [user, practiceId, accessiblePracticeIds]);

  return {
    canAccess,
    canAccessMultiplePractices,
    user,
    isLoading: !user
  };
}

/**
 * Hook for quick permission checks (returns boolean directly)
 */
export function useHasPermission(
  resource: ResourceType | string,
  action: StandardAction | string,
  options: {
    practiceId?: number;
    resourceId?: string;
    additionalContext?: Record<string, any>;
  } = {}
): boolean {
  const { user } = useUser();
  const { checkPermission } = usePermission(resource, action, options);

  // Simple synchronous check based on role (for performance)
  // For complex conditions, use the async checkPermission function
  if (!user) return false;

  const userRole = user.role as UserRoleEnum;

  // Super admin has all permissions
  if (userRole === UserRoleEnum.SUPER_ADMIN) return true;

  // Quick checks for common patterns
  if (resource === ResourceType.USER && ['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
    return [
      UserRoleEnum.PRACTICE_ADMINISTRATOR,
      UserRoleEnum.ADMINISTRATOR,
      UserRoleEnum.PRACTICE_ADMIN
    ].includes(userRole);
  }

  if (resource === ResourceType.PATIENT || resource === ResourceType.PET) {
    return userRole !== UserRoleEnum.CLIENT || action === 'READ';
  }

  // For complex checks, this would need to be async
  // This is a simplified version for performance
  return true; // Fallback to allowing for now
}
