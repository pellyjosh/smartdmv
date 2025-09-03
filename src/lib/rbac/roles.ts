/**
 * Role Management and Default Role Definitions
 */

import { UserRoleEnum } from '@/db/schema';
import { Role, Permission } from './types';
import { PERMISSION_TEMPLATES } from './permissions';

// Convert user role enum to role definitions
export const DEFAULT_ROLES: Record<UserRoleEnum, Role> = {
  [UserRoleEnum.SUPER_ADMIN]: {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Complete system access across all practices',
    isSystemDefined: true,
    isCustom: false,
    permissions: PERMISSION_TEMPLATES.SUPER_ADMIN_FULL.permissions.map((p, index) => ({
      id: `super_admin_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.PRACTICE_ADMINISTRATOR]: {
    id: 'practice_admin',
    name: 'Practice Administrator',
    description: 'Full practice management within assigned practice',
    isSystemDefined: true,
    isCustom: false,
    permissions: PERMISSION_TEMPLATES.PRACTICE_ADMIN_FULL.permissions.map((p, index) => ({
      id: `practice_admin_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.ADMINISTRATOR]: {
    id: 'administrator',
    name: 'Multi-Practice Administrator',
    description: 'Administrative access across multiple practices',
    isSystemDefined: true,
    isCustom: false,
    permissions: PERMISSION_TEMPLATES.PRACTICE_ADMIN_FULL.permissions.map((p, index) => ({
      id: `administrator_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.VETERINARIAN]: {
    id: 'veterinarian',
    name: 'Veterinarian',
    description: 'Full medical care and patient management',
    isSystemDefined: true,
    isCustom: false,
    permissions: PERMISSION_TEMPLATES.VETERINARIAN_BASIC.permissions.map((p, index) => ({
      id: `veterinarian_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.TECHNICIAN]: {
    id: 'technician',
    name: 'Veterinary Technician',
    description: 'Veterinary support and basic medical functions',
    isSystemDefined: true,
    isCustom: false,
    permissions: PERMISSION_TEMPLATES.TECHNICIAN_BASIC.permissions.map((p, index) => ({
      id: `technician_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.RECEPTIONIST]: {
    id: 'receptionist',
    name: 'Receptionist',
    description: 'Front desk operations and customer service',
    isSystemDefined: true,
    isCustom: false,
    permissions: PERMISSION_TEMPLATES.RECEPTIONIST_BASIC.permissions.map((p, index) => ({
      id: `receptionist_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.PRACTICE_MANAGER]: {
    id: 'practice_manager',
    name: 'Practice Manager',
    description: 'Practice operations and staff coordination',
    isSystemDefined: true,
    isCustom: false,
    permissions: [
      ...PERMISSION_TEMPLATES.RECEPTIONIST_BASIC.permissions,
      ...PERMISSION_TEMPLATES.PRACTICE_ADMIN_FULL.permissions.filter(p => 
        !['users', 'roles', 'system_settings'].includes(p.resource)
      )
    ].map((p, index) => ({
      id: `practice_manager_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.PRACTICE_ADMIN]: {
    id: 'practice_admin_alt',
    name: 'Practice Admin (Alternative)',
    description: 'Alternative practice admin role',
    isSystemDefined: true,
    isCustom: false,
    permissions: PERMISSION_TEMPLATES.PRACTICE_ADMIN_FULL.permissions.map((p, index) => ({
      id: `practice_admin_alt_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.ACCOUNTANT]: {
    id: 'accountant',
    name: 'Accountant',
    description: 'Financial management and billing',
    isSystemDefined: true,
    isCustom: false,
    permissions: [
      // Financial Management
      { resource: 'billing', action: 'MANAGE', granted: true },
      { resource: 'invoices', action: 'MANAGE', granted: true },
      { resource: 'payments', action: 'MANAGE', granted: true },
      { resource: 'insurance', action: 'MANAGE', granted: true },
      { resource: 'pricing', action: 'UPDATE', granted: true },
      // Reports
      { resource: 'reports', action: 'READ', granted: true },
      { resource: 'analytics', action: 'READ', granted: true },
      // Limited patient access for billing
      { resource: 'patients', action: 'READ', granted: true },
      { resource: 'pets', action: 'READ', granted: true },
      { resource: 'appointments', action: 'READ', granted: true },
    ].map((p, index) => ({
      id: `accountant_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.CASHIER]: {
    id: 'cashier',
    name: 'Cashier',
    description: 'Payment processing and basic billing',
    isSystemDefined: true,
    isCustom: false,
    permissions: [
      // Payment Processing
      { resource: 'payments', action: 'CREATE', granted: true },
      { resource: 'payments', action: 'READ', granted: true },
      { resource: 'invoices', action: 'READ', granted: true },
      { resource: 'billing', action: 'READ', granted: true },
      // Limited patient access
      { resource: 'patients', action: 'READ', granted: true },
      { resource: 'pets', action: 'READ', granted: true },
      { resource: 'appointments', action: 'READ', granted: true },
    ].map((p, index) => ({
      id: `cashier_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.OFFICE_MANAGER]: {
    id: 'office_manager',
    name: 'Office Manager',
    description: 'Office operations and coordination',
    isSystemDefined: true,
    isCustom: false,
    permissions: [
      ...PERMISSION_TEMPLATES.RECEPTIONIST_BASIC.permissions,
      // Additional administrative permissions
      { resource: 'staff', action: 'READ', granted: true },
      { resource: 'schedules', action: 'MANAGE', granted: true },
      { resource: 'rooms', action: 'MANAGE', granted: true },
      { resource: 'equipment', action: 'READ', granted: true },
      { resource: 'suppliers', action: 'MANAGE', granted: true },
      { resource: 'purchase_orders', action: 'CREATE', granted: true },
      { resource: 'reports', action: 'READ', granted: true },
    ].map((p, index) => ({
      id: `office_manager_${index}`,
      ...p
    }))
  },

  [UserRoleEnum.CLIENT]: {
    id: 'client',
    name: 'Client',
    description: 'Pet owner with limited access to their records',
    isSystemDefined: true,
    isCustom: false,
    permissions: [
      // Own pet records only (with ownership conditions)
      { 
        resource: 'pets', 
        action: 'READ', 
        granted: true,
        conditions: [{ field: 'ownerId', operator: 'equals' as const, value: '${userId}' }]
      },
      { 
        resource: 'appointments', 
        action: 'READ', 
        granted: true,
        conditions: [{ field: 'clientId', operator: 'equals' as const, value: '${userId}' }]
      },
      { 
        resource: 'appointments', 
        action: 'CREATE', 
        granted: true 
      },
      { 
        resource: 'medical_records', 
        action: 'READ', 
        granted: true,
        conditions: [{ field: 'clientId', operator: 'equals' as const, value: '${userId}' }]
      },
      { 
        resource: 'invoices', 
        action: 'READ', 
        granted: true,
        conditions: [{ field: 'clientId', operator: 'equals' as const, value: '${userId}' }]
      },
      { 
        resource: 'payments', 
        action: 'CREATE', 
        granted: true 
      },
      // Communication
      { resource: 'messages', action: 'READ', granted: true },
      { resource: 'messages', action: 'CREATE', granted: true },
      { resource: 'notifications', action: 'READ', granted: true },
    ].map((p, index) => ({
      id: `client_${index}`,
      ...p
    }))
  }
};

// Role hierarchy for inheritance
export const ROLE_HIERARCHY: Record<string, string[]> = {
  'super_admin': [],
  'practice_admin': [],
  'administrator': [],
  'practice_manager': ['receptionist'],
  'office_manager': ['receptionist'],
  'veterinarian': [],
  'technician': [],
  'receptionist': [],
  'accountant': ['cashier'],
  'cashier': [],
  'client': []
};

// Get role by user role enum
export function getRoleByUserRole(userRole: UserRoleEnum): Role {
  return DEFAULT_ROLES[userRole];
}

// Get all system-defined roles
export function getSystemRoles(): Role[] {
  return Object.values(DEFAULT_ROLES).filter(role => role.isSystemDefined);
}

// Check if role has specific permission
export function roleHasPermission(
  role: Role, 
  resource: string, 
  action: string
): boolean {
  return role.permissions.some(
    permission => 
      permission.resource === resource && 
      permission.action === action && 
      permission.granted
  );
}

// Get all permissions for a role (including inherited)
export function getAllRolePermissions(role: Role): Permission[] {
  const permissions = [...role.permissions];
  
  // Add inherited permissions if role inheritance is enabled
  if (role.inheritsFrom) {
    for (const parentRoleId of role.inheritsFrom) {
      const parentRole = Object.values(DEFAULT_ROLES).find(r => r.id === parentRoleId);
      if (parentRole) {
        const inheritedPermissions = getAllRolePermissions(parentRole);
        // Merge permissions, with current role taking precedence
        for (const inheritedPermission of inheritedPermissions) {
          const existingPermission = permissions.find(
            p => p.resource === inheritedPermission.resource && 
                p.action === inheritedPermission.action
          );
          if (!existingPermission) {
            permissions.push(inheritedPermission);
          }
        }
      }
    }
  }
  
  return permissions;
}

// Create a custom role template
export function createCustomRole(
  name: string,
  description: string,
  permissions: Omit<Permission, 'id'>[],
  practiceId?: number
): Role {
  return {
    id: `custom_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
    name,
    description,
    isSystemDefined: false,
    isCustom: true,
    practiceId,
    permissions: permissions.map((p, index) => ({
      id: `${name.toLowerCase()}_${index}`,
      ...p
    }))
  };
}

// Get role by ID
export function getRoleById(roleId: string): Role | undefined {
  return Object.values(DEFAULT_ROLES).find(role => role.id === roleId);
}

// Check if user role is administrative
export function isAdministrativeRole(userRole: UserRoleEnum): boolean {
  return [
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.PRACTICE_ADMINISTRATOR,
    UserRoleEnum.ADMINISTRATOR,
    UserRoleEnum.PRACTICE_ADMIN,
    UserRoleEnum.PRACTICE_MANAGER,
    UserRoleEnum.OFFICE_MANAGER
  ].includes(userRole);
}

// Check if user role can manage other users
export function canManageUsers(userRole: UserRoleEnum): boolean {
  return [
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.PRACTICE_ADMINISTRATOR,
    UserRoleEnum.ADMINISTRATOR,
    UserRoleEnum.PRACTICE_ADMIN
  ].includes(userRole);
}

// Check if user role has financial access
export function hasFinancialAccess(userRole: UserRoleEnum): boolean {
  return [
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.PRACTICE_ADMINISTRATOR,
    UserRoleEnum.ADMINISTRATOR,
    UserRoleEnum.PRACTICE_ADMIN,
    UserRoleEnum.ACCOUNTANT,
    UserRoleEnum.CASHIER,
    UserRoleEnum.RECEPTIONIST,
    UserRoleEnum.PRACTICE_MANAGER,
    UserRoleEnum.OFFICE_MANAGER
  ].includes(userRole);
}

// Check if user role has medical access
export function hasMedicalAccess(userRole: UserRoleEnum): boolean {
  return [
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.PRACTICE_ADMINISTRATOR,
    UserRoleEnum.ADMINISTRATOR,
    UserRoleEnum.PRACTICE_ADMIN,
    UserRoleEnum.VETERINARIAN,
    UserRoleEnum.TECHNICIAN
  ].includes(userRole);
}
