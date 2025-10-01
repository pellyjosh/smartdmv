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
  // New permission model semantics:
  // - Users may have multiple roles, each with permission entries.
  // - A permission entry has `granted: boolean` which can be used to explicitly allow or deny.
  // - Explicit grants should override explicit denies (i.e. any grant -> allow).
  // - We support wildcard permission.resource === '*' and wildcard permission.action === '*'.
  if (!user || !user.roles) return false;

  const roles = user.roles || [];

  // Normalize matches helper
  const matches = (permissionAction: string, permissionResource: string) => {
    const actionMatch = permissionAction === action || permissionAction === '*';
    const resourceMatch = permissionResource === resource || permissionResource === '*';
    return actionMatch && resourceMatch;
  };

  // If any role explicitly grants the permission -> allow immediately
  for (const role of roles) {
    for (const permission of role.permissions || []) {
      if (permission.granted && matches(permission.action, permission.resource)) {
        return true;
      }
    }
  }

  // If no explicit grant found, but there is an explicit deny -> deny
  for (const role of roles) {
    for (const permission of role.permissions || []) {
      if (permission.granted === false && matches(permission.action, permission.resource)) {
        return false;
      }
    }
  }

  // No explicit grant or deny found -> default deny
  return false;
}

// Check if user has any admin role
// Explicit SUPER ADMIN detection (supports both multi-role array and legacy single user.role)
export function isSuperAdmin(user: UserWithRoles | null | undefined): boolean {
  if (!user) return false;
  const rolesMatch = user.roles?.some(role => {
    const n = (role.name || role.displayName || '').toLowerCase();
    return n === 'super_admin' || n === 'super admin' || n === 'superadmin';
  }) ?? false;
  // Legacy fallback: some parts of the app may still populate user.role only.
  const legacy = (user as any)?.role && typeof (user as any).role === 'string' && ['super_admin','super admin','superadmin'].includes((user as any).role.toLowerCase());
  return rolesMatch || legacy;
}

export function isAdmin(user: UserWithRoles | null | undefined): boolean {
  if (!user) return false;
  // SUPER ADMIN is always considered admin
  if (isSuperAdmin(user)) return true;

  // Check for explicit admin-like permissions or admin-ish role names
  return hasPermission(user, 'MANAGE', 'practice') ||
         hasPermission(user, 'ADMIN', '*') ||
         (user.roles?.some(role => {
           const n = role.name.toLowerCase();
           return n.includes('admin') || n.includes('administrator');
         }) ?? false);
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
  if (!user) return false;

  // Preferred: check roles array (new system where a user can have multiple roles)
  if (user.roles && user.roles.length > 0) {
    return user.roles.some(role =>
      (role.name || '').toLowerCase() === roleName.toLowerCase() ||
      (role.displayName || '').toLowerCase() === roleName.toLowerCase()
    );
  }

  // No roles array present -> do NOT fallback to legacy single-enum checks.
  // This enforces the new roles & permissions model. Callers that still rely on
  // `user.role` should migrate to populate `user.roles` or map legacy users
  // to roles before calling these helpers.
  return false;
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
