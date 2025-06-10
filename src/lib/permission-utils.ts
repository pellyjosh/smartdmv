/**
 * Client-side permission utilities for SmartDVM
 * 
 * This file contains helper functions and hooks for permission checking in the frontend
 */

/**
 * Helper function to convert string "true" to boolean true
 * This is needed because our database sometimes returns string values for booleans
 */
export function normalizeBooleanValue(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  
  return Boolean(value);
}

/**
 * Checks if a permission is granted by handling both boolean and string formats
 */
export function isPermissionGranted(permission: any): boolean {
  if (!permission) return false;
  return normalizeBooleanValue(permission.granted);
}

/**
 * Formats a permission name for display
 * 
 * @param resourceType - The resource type (e.g., USER, APPOINTMENT)
 * @param action - The action (e.g., CREATE, READ, UPDATE, DELETE)
 * @returns Formatted permission name
 */
export function formatPermissionName(resourceType: string, action: string): string {
  // Convert resource type from SNAKE_CASE to Title Case
  const formattedResource = resourceType
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
  
  // Format the action
  let formattedAction = '';
  switch (action) {
    case 'CREATE':
      formattedAction = 'Create';
      break;
    case 'READ':
      formattedAction = 'View';
      break;
    case 'UPDATE':
      formattedAction = 'Edit';
      break;
    case 'DELETE':
      formattedAction = 'Delete';
      break;
    case 'MANAGE':
      formattedAction = 'Manage';
      break;
    default:
      formattedAction = action.charAt(0) + action.slice(1).toLowerCase();
  }
  
  return `${formattedAction} ${formattedResource}`;
}

/**
 * Returns the human-readable name for a resource type
 */
export function getResourceTypeName(resourceType: string): string {
  // Convert resource type from SNAKE_CASE to Title Case
  return resourceType
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Returns the human-readable name for an action
 */
export function getActionName(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'Create';
    case 'READ':
      return 'View';
    case 'UPDATE':
      return 'Edit';
    case 'DELETE':
      return 'Delete';
    case 'MANAGE':
      return 'Manage';
    case 'APPROVE':
      return 'Approve';
    case 'ASSIGN':
      return 'Assign';
    default:
      return action.charAt(0) + action.slice(1).toLowerCase();
  }
}

/**
 * Default permission categories for grouping permissions in the UI
 */
export const DEFAULT_PERMISSION_CATEGORIES = [
  "Practice Management",
  "Client Management",
  "Patient Management",
  "Appointment Management",
  "Medical Records",
  "Inventory Management",
  "Financial Management",
  "Staff Management",
  "System Administration",
  "Other"
];

/**
 * Groups permissions by category based on resource type
 * 
 * @param permissions - Array of permissions
 * @returns Object with permissions grouped by category
 */
export function groupPermissionsByCategory(permissions: any[]) {
  const result: Record<string, any[]> = {};
  
  // Initialize categories
  DEFAULT_PERMISSION_CATEGORIES.forEach(category => {
    result[category] = [];
  });
  
  // Assign permissions to categories based on resource type
  permissions.forEach(permission => {
    const resourceType = permission.resourceType;
    
    // Map resource types to categories
    let category = "Other";
    
    if (resourceType.includes('PRACTICE') || resourceType.includes('ORGANIZATION')) {
      category = "Practice Management";
    } else if (resourceType.includes('CLIENT') || resourceType.includes('USER')) {
      category = "Client Management";
    } else if (resourceType.includes('PET') || resourceType.includes('PATIENT')) {
      category = "Patient Management";
    } else if (resourceType.includes('APPOINTMENT') || resourceType.includes('CALENDAR')) {
      category = "Appointment Management";
    } else if (resourceType.includes('MEDICAL') || resourceType.includes('SOAP') || 
               resourceType.includes('PRESCRIPTION') || resourceType.includes('LAB')) {
      category = "Medical Records";
    } else if (resourceType.includes('INVENTORY') || resourceType.includes('PRODUCT')) {
      category = "Inventory Management";
    } else if (resourceType.includes('INVOICE') || resourceType.includes('PAYMENT') || 
               resourceType.includes('BILLING')) {
      category = "Financial Management";
    } else if (resourceType.includes('STAFF') || resourceType.includes('ROLE') || 
               resourceType.includes('PERMISSION')) {
      category = "Staff Management";
    } else if (resourceType.includes('SETTING') || resourceType.includes('SYSTEM') || 
               resourceType.includes('AUDIT')) {
      category = "System Administration";
    } else if (resourceType.includes('DASHBOARD')) {
      category = "System Administration";
    }
    
    // Add permission to the appropriate category
    result[category].push(permission);
  });
  
  // Remove empty categories
  Object.keys(result).forEach(key => {
    if (result[key].length === 0) {
      delete result[key];
    }
  });
  
  return result;
}

/**
 * Generate default permissions for a new role
 */
export function generateDefaultPermissions(roleType: string) {
  // Basic permission set for all roles
  const defaultPermissions = [
    { resourceType: 'USER', action: 'READ', granted: true },
    { resourceType: 'PRACTICE', action: 'READ', granted: true },
  ];
  
  // Add role-specific permissions
  switch (roleType) {
    case 'PRACTICE_ADMIN':
      return [
        ...defaultPermissions,
        { resourceType: 'USER', action: 'CREATE', granted: true },
        { resourceType: 'USER', action: 'UPDATE', granted: true },
        { resourceType: 'ROLE', action: 'MANAGE', granted: true },
        { resourceType: 'PRACTICE', action: 'UPDATE', granted: true },
        { resourceType: 'APPOINTMENT', action: 'MANAGE', granted: true },
        { resourceType: 'PET', action: 'MANAGE', granted: true },
        { resourceType: 'CLIENT', action: 'MANAGE', granted: true },
        { resourceType: 'MEDICAL_RECORD', action: 'MANAGE', granted: true },
        { resourceType: 'INVENTORY', action: 'MANAGE', granted: true },
        { resourceType: 'BILLING', action: 'MANAGE', granted: true },
      ];
    case 'VETERINARIAN':
      return [
        ...defaultPermissions,
        { resourceType: 'APPOINTMENT', action: 'READ', granted: true },
        { resourceType: 'APPOINTMENT', action: 'UPDATE', granted: true },
        { resourceType: 'PET', action: 'READ', granted: true },
        { resourceType: 'CLIENT', action: 'READ', granted: true },
        { resourceType: 'MEDICAL_RECORD', action: 'CREATE', granted: true },
        { resourceType: 'MEDICAL_RECORD', action: 'READ', granted: true },
        { resourceType: 'MEDICAL_RECORD', action: 'UPDATE', granted: true },
        { resourceType: 'PRESCRIPTION', action: 'MANAGE', granted: true },
        { resourceType: 'LAB_ORDER', action: 'MANAGE', granted: true },
        { resourceType: 'INVENTORY', action: 'READ', granted: true },
      ];
    case 'TECHNICIAN':
      return [
        ...defaultPermissions,
        { resourceType: 'APPOINTMENT', action: 'READ', granted: true },
        { resourceType: 'PET', action: 'READ', granted: true },
        { resourceType: 'CLIENT', action: 'READ', granted: true },
        { resourceType: 'MEDICAL_RECORD', action: 'READ', granted: true },
        { resourceType: 'INVENTORY', action: 'READ', granted: true },
      ];
    case 'RECEPTIONIST':
      return [
        ...defaultPermissions,
        { resourceType: 'APPOINTMENT', action: 'MANAGE', granted: true },
        { resourceType: 'PET', action: 'READ', granted: true },
        { resourceType: 'CLIENT', action: 'READ', granted: true },
        { resourceType: 'CLIENT', action: 'CREATE', granted: true },
        { resourceType: 'CLIENT', action: 'UPDATE', granted: true },
        { resourceType: 'MEDICAL_RECORD', action: 'READ', granted: true },
        { resourceType: 'BILLING', action: 'READ', granted: true },
      ];
    default:
      return defaultPermissions;
  }
}

/**
 * Categorize permissions by system functions for display in UI
 */
export function categorizePermissions(permissions: any[]) {
  return groupPermissionsByCategory(permissions);
}