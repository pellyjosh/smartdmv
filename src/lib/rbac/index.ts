/**
 * RBAC System Main Export File
 * 
 * This is the central export point for the Role-Based Access Control system.
 * Import everything you need from this file.
 */

// Types and Interfaces
export * from './types';

// Permission definitions and role templates
export * from './permissions';
export * from './roles';

// Utility functions for permission checking
export * from './utils';

// React hooks for permission checking
export * from './hooks';

// React components for permission-based rendering
export * from './components';

// Middleware for route protection
export * from './middleware';

// Re-export commonly used items for convenience
export { 
  checkPermission,
  checkMultiplePermissions,
  hasAdminPermissions,
  hasSystemAccess,
  hasPracticeAdminAccess,
  getUserRolePermissions,
  createPermissionContext
} from './utils';

export {
  usePermission,
  useMultiplePermissions,
  useRole,
  usePracticeContext,
  useFeatureFlags,
  usePracticeAccess,
  useHasPermission
} from './hooks';

export {
  WithPermission,
  RequirePermission,
  WithRole,
  WithFeature,
  AdminOnly,
  PermissionButton,
  PermissionLink,
  PermissionDebugger
} from './components';

export {
  rbacMiddleware,
  checkApiPermission,
  withPermission,
  withRole
} from './middleware';

export {
  ResourceType,
  StandardAction,
  UserRoleEnum
} from './types';

// Default role permissions for quick reference
export { DEFAULT_ROLE_PERMISSIONS } from './roles';
