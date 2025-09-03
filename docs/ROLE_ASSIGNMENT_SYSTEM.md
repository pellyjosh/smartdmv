# Role Assignment and Permission Override System

## Overview

Your SmartDMV project implements a sophisticated role-based access control (RBAC) system with support for dynamic role assignments and permission overrides. Here's how it works:

## 🔥 SUPER_ADMIN Enhanced Capabilities

### Full System Access

The SUPER_ADMIN role now has **127 comprehensive permissions** across **13 categories**:

- **Users & Access**: Complete user and role management
- **Patients & Records**: Full patient data management
- **Treatments & Procedures**: All medical procedure access
- **Laboratory**: Complete lab management
- **Practice Management**: All practice settings and switching
- **Financial Management**: Full financial access and reporting
- **Inventory Management**: Complete inventory control
- **Medical Imaging**: All imaging capabilities
- **Reports & Analytics**: Full reporting access
- **System Administration**: Complete system control
- **Communication**: All messaging and notifications
- **Telemedicine**: Full telemedicine access
- **Marketplace**: Complete marketplace management

### Special SUPER_ADMIN Features

1. **Automatic Override**: SUPER_ADMIN bypasses all permission checks
2. **Cross-Practice Access**: Can switch between any practice
3. **Wildcard Permissions**: Has `*` resource and `*` action access
4. **Permission Override Creation**: Can create overrides for any user
5. **System Administration**: Full system backup, audit, and settings access

## 1. User Role Storage & Assignment

### Database Tables

#### `users` Table

- Contains basic user information including a `role` field (legacy, single role)
- This is being transitioned to the new multi-role system

#### `user_roles` Table (Junction Table)

```sql
user_roles:
- id (primary key)
- user_id (foreign key to users.id)
- role_id (foreign key to roles.id)
- assigned_by (foreign key to users.id)
- assigned_at (timestamp)
- is_active (boolean)
- revoked_at (timestamp)
- revoked_by (foreign key to users.id)
```

#### `roles` Table

```sql
roles:
- id (primary key)
- name (role identifier, e.g., 'VETERINARIAN')
- display_name (human-readable name)
- description
- is_system_defined (boolean)
- practice_id (null for system roles)
- permissions (JSON array)
```

## 2. How Role Assignment Works

### Single Role (Legacy)

- Currently stored in `users.role` field
- Direct string comparison: `user.role === 'VETERINARIAN'`

### Multi-Role System (New)

- Roles assigned via `user_roles` junction table
- One user can have multiple roles
- Roles can be practice-specific or system-wide
- Supports assignment tracking (who assigned, when)
- Supports role revocation (soft delete with audit trail)

### Role Assignment Functions

```typescript
// Assign role to user
await assignRoleToUser(userId, roleId, assignedBy);

// Revoke role from user
await revokeRoleFromUser(userId, roleId, revokedBy);

// Get user's assigned roles
const roles = await getUserAssignedRoles(userId, practiceId);

// Check if user has specific roles
const isVet = await hasUserAnyRole(userId, ["VETERINARIAN"], practiceId);
```

## 3. Permission Override System

### `permission_overrides` Table

```sql
permission_overrides:
- id (primary key)
- user_id (string)
- user_name
- user_email
- resource (e.g., 'users', 'appointments')
- action (e.g., 'CREATE', 'DELETE', 'MANAGE')
- granted (boolean - true/false)
- reason (explanation for override)
- expires_at (optional expiration)
- practice_id
- created_at
- created_by
- status ('active', 'revoked')
```

### How Permission Overrides Work

1. **Precedence**: Overrides take precedence over role-based permissions
2. **Granular Control**: Can grant or deny specific permissions regardless of role
3. **Temporary**: Can have expiration dates
4. **Auditable**: Tracks who created the override and why
5. **Practice-Specific**: Scoped to specific practices

### Permission Override Functions

```typescript
// Create permission override
await createPermissionOverride({
  userId: "123",
  userName: "Dr. Smith",
  userEmail: "dr.smith@clinic.com",
  resource: "financial_reports",
  action: "VIEW",
  granted: true,
  reason: "Temporary access for audit",
  expiresAt: new Date("2025-12-31"),
  practiceId: 1,
  createdBy: "admin@clinic.com",
});

// Check permission (considers overrides + role permissions)
const canView = await hasUserPermission(
  userId,
  "financial_reports",
  "VIEW",
  practiceId
);
```

## 4. Enhanced Permission Resolution Logic

When checking if a user has permission to perform an action, the system follows this hierarchy:

```typescript
async function hasUserPermission(userId, resource, action, practiceId) {
  // 1. SUPER_ADMIN Check (Highest Priority)
  const userAssignedRoles = await getUserAssignedRoles(userId, practiceId);
  const isSuperAdmin = userAssignedRoles.some(role => role.name === 'SUPER_ADMIN');

  if (isSuperAdmin) {
    return true; // SUPER_ADMIN has access to everything
  }

  // 2. Check permission overrides (Second highest precedence)
  if (practiceId) {
    const overrides = await getUserPermissionOverrides(userId, practiceId, resource, action);
    const override = overrides.find(o => o.resource === resource && o.action === action);

    if (override) {
      return override.granted; // Override takes precedence for non-super-admins
    }
  }

  // 3. Check role-based permissions (Standard checks)
  for (const role of userAssignedRoles) {
    const permission = role.permissions.find(
      p => p.resource === resource && p.action === action
    );

    if (permission && permission.granted) {
      return true;
    }
  }

  return false; // Deny by default
}
    }
  }

  return false; // No permission found
}
```

## 5. System Architecture Benefits

### Flexibility

- **Multi-Role Support**: Users can have multiple roles simultaneously
- **Practice-Specific Roles**: Custom roles per practice
- **Granular Overrides**: Override specific permissions without changing roles

### Security

- **Audit Trail**: Track who assigned roles and created overrides
- **Temporary Access**: Time-limited permissions
- **Principle of Least Privilege**: Deny by default, explicit grants

### Scalability

- **Database-Driven**: All roles and permissions stored in database
- **Caching**: Performance optimization with 5-minute cache
- **Dynamic**: Add/modify roles without code changes

## 6. Usage Examples

### Checking User Permissions in Components

```typescript
// In a React component
const { hasUserPermission } = useAuth();

const canDeleteAppointment = await hasUserPermission(
  user.id,
  "appointments",
  "DELETE",
  practiceId
);

if (canDeleteAppointment) {
  // Show delete button
}
```

### API Route Protection

```typescript
// In API route
import { hasUserPermission } from "@/lib/rbac/dynamic-roles";

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  const canDelete = await hasUserPermission(
    user.id,
    "appointments",
    "DELETE",
    user.practiceId
  );

  if (!canDelete) {
    return new Response("Forbidden", { status: 403 });
  }

  // Proceed with deletion
}
```

### Role Management Interface

```typescript
// Assign role to user
await assignRoleToUser(selectedUserId, veterinarianRoleId, currentUser.id);

// Grant temporary access
await createPermissionOverride({
  userId: selectedUserId,
  resource: "financial_reports",
  action: "VIEW",
  granted: true,
  reason: "Monthly audit assistance",
  expiresAt: new Date("2025-10-31"),
  practiceId: currentPractice.id,
  createdBy: currentUser.email,
});
```

## 7. Migration Strategy

Your project is currently transitioning from single-role (`users.role`) to multi-role system:

1. **Phase 1**: Legacy system still works (current)
2. **Phase 2**: New functions use `user_roles` table for assignments
3. **Phase 3**: Gradually migrate existing users to new system
4. **Phase 4**: Deprecate `users.role` field

This ensures backward compatibility while enabling advanced role management features.

## 8. Best Practices

1. **Use Permission Overrides Sparingly**: For exceptional cases only
2. **Set Expiration Dates**: Temporary access should expire
3. **Document Reasons**: Always explain why override is needed
4. **Regular Audit**: Review active overrides periodically
5. **Principle of Least Privilege**: Grant minimum required permissions
6. **Test Thoroughly**: Verify permission logic in all scenarios

The system provides enterprise-grade role and permission management while maintaining simplicity for basic use cases.
