/**
 * Permission and role types for offline functionality
 */

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';
export type EntityType = 'pet' | 'appointment' | 'client' | 'soapNote' | 'prescription' | 'labResult' | 'medicalRecord' | 'vaccination';

/**
 * Permission object
 */
export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: PermissionAction;
  conditions?: PermissionConditions;
}

/**
 * Conditions for permission evaluation
 */
export interface PermissionConditions {
  ownOnly?: boolean; // User can only access their own records
  departmentOnly?: boolean;
  locationOnly?: boolean;
  roleRequired?: string[];
}

/**
 * Role definition
 */
export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystemRole: boolean;
}

/**
 * User's role assignment
 */
export interface RoleAssignment {
  id: number;
  userId: number;
  roleId: number;
  practiceId: number;
  assignedAt: number;
  assignedBy: number;
  role: Role;
}

/**
 * Cached permission tree for offline use
 */
export interface OfflinePermissionCache {
  id: string;
  userId: number;
  tenantId: string;
  practiceId: number;
  roles: Role[];
  roleAssignments: RoleAssignment[];
  allPermissions: Permission[];
  effectivePermissions: EffectivePermissions;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Effective permissions (flattened for quick lookup)
 */
export interface EffectivePermissions {
  [resource: string]: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    conditions?: PermissionConditions;
  };
}

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  userId: number;
  tenantId: string;
  practiceId: number;
  resource: string;
  action: PermissionAction;
  entityId?: number | string;
  context?: PermissionContext;
}

/**
 * Additional context for permission evaluation
 */
export interface PermissionContext {
  ownerId?: number; // For "own only" checks
  departmentId?: string;
  locationId?: number;
  createdBy?: number;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: string[];
}

/**
 * Row-level security filter
 */
export interface RLSFilter {
  userIds?: number[];
  departmentIds?: string[];
  locationIds?: number[];
  practiceIds?: number[];
}

/**
 * Field-level security (which fields user can see/edit)
 */
export interface FieldPermissions {
  [fieldName: string]: {
    canRead: boolean;
    canWrite: boolean;
  };
}
