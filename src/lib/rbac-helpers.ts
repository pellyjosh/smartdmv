// RBAC Helper functions for permission checking

export interface Permission {
  resource: string;
  action: string;
  granted: boolean;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  role?: string;
}

export interface UserWithRoles extends User {
  roles?: {
    id: string;
    name: string;
    displayName: string;
    permissions: Permission[];
  }[];
}

// Check if user has a specific permission
export function hasPermission(
  user: UserWithRoles | null | undefined,
  action: string,
  resource: string = '*'
): boolean {
  if (!user || !user.roles) {
    return false;
  }

  // Check if any of the user's roles has the required permission
  return user.roles.some(role => 
    role.permissions.some(permission => 
      permission.granted &&
      permission.action === action &&
      (permission.resource === resource || permission.resource === '*')
    )
  );
}

// Check if user has any admin role
export function isAdmin(user: UserWithRoles | null | undefined): boolean {
  if (!user) return false;
  
  // Check for admin permissions or admin role names
  return hasPermission(user, 'MANAGE', 'practice') ||
         hasPermission(user, 'ADMIN', '*') ||
         (user.roles?.some(role => 
           role.name.toLowerCase().includes('admin') ||
           role.name.toLowerCase().includes('administrator')
         ) ?? false);
}

// Check if user can manage users
export function canManageUsers(user: UserWithRoles | null | undefined): boolean {
  return hasPermission(user, 'MANAGE', 'users') ||
         hasPermission(user, 'CREATE', 'users') ||
         isAdmin(user);
}

// Check if user can manage roles
export function canManageRoles(user: UserWithRoles | null | undefined): boolean {
  return hasPermission(user, 'MANAGE', 'roles') ||
         hasPermission(user, 'CREATE', 'roles') ||
         isAdmin(user);
}

// Check if user can view specific resource
export function canView(user: UserWithRoles | null | undefined, resource: string): boolean {
  return hasPermission(user, 'READ', resource) ||
         hasPermission(user, 'VIEW', resource) ||
         isAdmin(user);
}

// Check if user can edit specific resource
export function canEdit(user: UserWithRoles | null | undefined, resource: string): boolean {
  return hasPermission(user, 'UPDATE', resource) ||
         hasPermission(user, 'EDIT', resource) ||
         isAdmin(user);
}

// Check if user can delete specific resource
export function canDelete(user: UserWithRoles | null | undefined, resource: string): boolean {
  return hasPermission(user, 'DELETE', resource) ||
         isAdmin(user);
}

// Check if user can create specific resource
export function canCreate(user: UserWithRoles | null | undefined, resource: string): boolean {
  return hasPermission(user, 'CREATE', resource) ||
         isAdmin(user);
}

// Role-based checks for backward compatibility with enum-based system
export function hasRole(user: UserWithRoles | null | undefined, roleName: string): boolean {
  if (!user || !user.roles) return false;
  return user.roles.some(role => 
    role.name.toLowerCase() === roleName.toLowerCase() ||
    role.displayName.toLowerCase() === roleName.toLowerCase()
  );
}

// Common role checks
export function isPracticeAdministrator(user: UserWithRoles | null | undefined): boolean {
  return hasRole(user, 'PRACTICE_ADMINISTRATOR') ||
         hasRole(user, 'Practice Administrator') ||
         isAdmin(user);
}

export function isVeterinarian(user: UserWithRoles | null | undefined): boolean {
  return hasRole(user, 'VETERINARIAN') ||
         hasRole(user, 'Veterinarian');
}

export function isTechnician(user: UserWithRoles | null | undefined): boolean {
  return hasRole(user, 'TECHNICIAN') ||
         hasRole(user, 'Technician');
}

export function isReceptionist(user: UserWithRoles | null | undefined): boolean {
  return hasRole(user, 'RECEPTIONIST') ||
         hasRole(user, 'Receptionist');
}

// Check if user can manage checklists
export function canManageChecklists(user: UserWithRoles | null | undefined): boolean {
  return isPracticeAdministrator(user) ||
         isVeterinarian(user) ||
         hasPermission(user, 'MANAGE', 'checklists');
}

// Check if user can edit templates
export function canEditTemplates(user: UserWithRoles | null | undefined): boolean {
  return isPracticeAdministrator(user) ||
         isVeterinarian(user) ||
         hasPermission(user, 'EDIT', 'templates');
}

// Check if user can delete templates
export function canDeleteTemplates(user: UserWithRoles | null | undefined): boolean {
  return isPracticeAdministrator(user) ||
         hasPermission(user, 'DELETE', 'templates');
}
