# RBAC System Integration Guide

This guide explains how to integrate and use the Role-Based Access Control (RBAC) system throughout your application.

## Quick Start

### 1. Basic Usage

```typescript
// Import the RBAC system
import {
  WithPermission,
  usePermission,
  useRole,
  ResourceType,
  StandardAction,
} from "@/lib/rbac";

// Check permissions in components
function MyComponent() {
  const { user, role, isAdmin } = useRole();

  return (
    <div>
      <WithPermission
        resource={ResourceType.USER}
        action={StandardAction.CREATE}
      >
        <button>Create User</button>
      </WithPermission>

      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

### 2. Protect API Routes

```typescript
// pages/api/users/[id].ts
import { withPermission, ResourceType, StandardAction } from "@/lib/rbac";

export default withPermission(
  async function handler(req, res) {
    // Your handler logic here
    const user = (req as any).user; // User is attached by middleware
    // ...
  },
  { resource: ResourceType.USER, action: StandardAction.UPDATE }
);
```

### 3. Protect Pages

```typescript
// pages/admin/users.tsx
import { RequirePermission } from "@/lib/rbac";

export default function UsersPage() {
  return (
    <RequirePermission
      resource={ResourceType.USER}
      action={StandardAction.READ}
    >
      <UserManagement />
    </RequirePermission>
  );
}
```

## Integration Steps

### Step 1: Update Main Middleware

Replace your current middleware with RBAC-enabled middleware:

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rbacMiddleware } from "@/lib/rbac";

export async function middleware(request: NextRequest) {
  // Apply RBAC middleware
  const rbacResponse = await rbacMiddleware(request);
  if (rbacResponse) {
    return rbacResponse; // Redirect if permission denied
  }

  // Continue with your existing middleware logic if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)",
  ],
};
```

### Step 2: Update Authentication System

In your RBAC middleware (`/src/lib/rbac/middleware.ts`), update the `getUserFromRequest` function:

```typescript
async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  // Example with your current session system:
  const sessionCookie = request.cookies.get("your-session-cookie")?.value;
  if (sessionCookie) {
    try {
      const user = await validateSession(sessionCookie); // Your session validation
      return user;
    } catch (error) {
      return null;
    }
  }
  return null;
}
```

### Step 3: Protect Admin Pages

Update your admin pages to use the new permission system:

```typescript
// src/app/(main)/admin/users-and-permissions/page.tsx
import { RequirePermission, AdminOnly } from "@/lib/rbac";

export default function UsersAndPermissionsPage() {
  return (
    <AdminOnly level="practice">
      <div className="container mx-auto py-6">
        <h1>Users and Permissions</h1>
        {/* Your existing content */}
      </div>
    </AdminOnly>
  );
}
```

### Step 4: Update Components with Permission Checks

```typescript
// src/components/layout/Navigation.tsx
import { WithPermission, WithFeature } from "@/lib/rbac";

function Navigation() {
  return (
    <nav>
      <WithFeature feature="canManageUsers">
        <NavLink href="/admin/users">User Management</NavLink>
      </WithFeature>

      <WithFeature feature="canViewReports">
        <NavLink href="/reports">Reports</NavLink>
      </WithFeature>

      <WithFeature feature="canManageInventory">
        <NavLink href="/inventory">Inventory</NavLink>
      </WithFeature>
    </nav>
  );
}
```

### Step 5: Protect API Endpoints

Update your API routes:

```typescript
// src/app/api/users/route.ts
import { withRole, checkApiPermission } from "@/lib/rbac";
import { UserRoleEnum } from "@/db/schema";

// Method 1: Role-based protection
export const GET = withRole(
  async function handler(req, context) {
    // Handler logic
  },
  [UserRoleEnum.ADMINISTRATOR, UserRoleEnum.PRACTICE_ADMIN]
);

// Method 2: Permission-based protection
export async function POST(req: NextRequest) {
  const permissionCheck = await checkApiPermission(req, {
    resource: ResourceType.USER,
    action: StandardAction.CREATE,
  });

  if (!permissionCheck.allowed) {
    return NextResponse.json({ error: permissionCheck.error }, { status: 403 });
  }

  // Your handler logic
}
```

## Usage Examples

### Component-Level Permissions

```typescript
import { WithPermission, PermissionButton, useFeatureFlags } from "@/lib/rbac";

function UserCard({ user }) {
  const { canManageUsers } = useFeatureFlags();

  return (
    <div className="user-card">
      <h3>{user.name}</h3>

      <WithPermission
        resource={ResourceType.USER}
        action={StandardAction.UPDATE}
        resourceId={user.id}
      >
        <button>Edit User</button>
      </WithPermission>

      <PermissionButton
        resource={ResourceType.USER}
        action={StandardAction.DELETE}
        resourceId={user.id}
        fallbackText="Cannot Delete"
        onClick={() => deleteUser(user.id)}
      >
        Delete User
      </PermissionButton>

      {canManageUsers && <UserSettings user={user} />}
    </div>
  );
}
```

### Advanced Permission Checks

```typescript
import { usePermission, useMultiplePermissions } from "@/lib/rbac";

function AdvancedComponent() {
  const singlePermission = usePermission(
    ResourceType.PATIENT,
    StandardAction.CREATE,
    { practiceId: 123 }
  );

  const multiplePermissions = useMultiplePermissions([
    { resource: ResourceType.BILLING, action: StandardAction.READ },
    { resource: ResourceType.INVOICE, action: StandardAction.CREATE },
  ]);

  const checkPermissions = async () => {
    const canCreatePatient = await singlePermission.checkPermission();
    const canHandleBilling = await multiplePermissions.checkPermissions();

    console.log("Can create patient:", canCreatePatient.allowed);
    console.log("Can handle billing:", canHandleBilling.allowed);
  };

  return (
    <div>
      <button onClick={checkPermissions}>Check Permissions</button>
    </div>
  );
}
```

### Custom Permission Conditions

The system supports custom permission conditions:

```typescript
// Define a custom permission with conditions
const customPermission = {
  resource: ResourceType.PATIENT,
  action: StandardAction.UPDATE,
  conditions: [
    {
      field: "ownerId",
      operator: "equals",
      value: currentUser.id,
    },
    {
      field: "practiceId",
      operator: "in",
      value: user.accessiblePracticeIds,
    },
  ],
};
```

## Debugging

Add the permission debugger in development:

```typescript
// In your main layout or app component
import { PermissionDebugger } from "@/lib/rbac";

function Layout({ children }) {
  return (
    <div>
      {children}
      <PermissionDebugger /> {/* Only shows in development */}
    </div>
  );
}
```

## Feature Flags

Use feature flags for quick enable/disable of features:

```typescript
import { useFeatureFlags, WithFeature } from "@/lib/rbac";

function Dashboard() {
  const features = useFeatureFlags();

  return (
    <div>
      <WithFeature feature="canViewReports">
        <ReportsSection />
      </WithFeature>

      <WithFeature feature="canManageInventory">
        <InventorySection />
      </WithFeature>

      {features.canAccessLab && <LabSection />}
    </div>
  );
}
```

## Best Practices

1. **Always check permissions at both frontend and backend**
2. **Use feature flags for quick toggles**
3. **Prefer permission-based checks over role-based checks**
4. **Test permission scenarios thoroughly**
5. **Use the debugger during development**
6. **Document custom permissions clearly**

## Migration from Current System

1. **Phase 1**: Replace role checks in middleware
2. **Phase 2**: Update admin pages with permission components
3. **Phase 3**: Protect API routes with permission middleware
4. **Phase 4**: Replace manual role checks in components
5. **Phase 5**: Add advanced permission conditions as needed

## Configuration

The RBAC system is configured through:

- `src/lib/rbac/roles.ts` - Role definitions and default permissions
- `src/lib/rbac/permissions.ts` - Available permissions and resources
- `src/lib/rbac/middleware.ts` - Route protection rules

## Support

For questions or issues with the RBAC system:

1. Check the type definitions in `src/lib/rbac/types.ts`
2. Review examples in this guide
3. Use the permission debugger in development
4. Test permission scenarios in isolation
