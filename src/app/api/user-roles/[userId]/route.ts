import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import {
  assignRoleToUser, 
  revokeRoleFromUser, 
  getUserAssignedRoles,
  isUserPracticeAdmin,
  isUserSuperAdmin 
} from '@/lib/rbac/dynamic-roles';
;
import { roles } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/user-roles/[userId] - Get user's assigned roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const practiceId = userPractice.practiceId ? parseInt(userPractice.practiceId) : undefined;

    // Check if current user can view role assignments
    const canViewRoles = await isUserPracticeAdmin(userPractice.user.id, practiceId) ||
                         await isUserSuperAdmin(userPractice.user.id, practiceId);

    if (!canViewRoles) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const assignedRoles = await getUserAssignedRoles(userId, practiceId);

    return NextResponse.json({
      userId,
      roles: assignedRoles,
      practiceId
    });

  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user-roles/[userId] - Assign role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const practiceId = userPractice.practiceId ? parseInt(userPractice.practiceId) : undefined;

    // Check if current user can assign roles
    const canAssignRoles = await isUserPracticeAdmin(userPractice.user.id, practiceId) ||
                           await isUserSuperAdmin(userPractice.user.id, practiceId);

    if (!canAssignRoles) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { roleId, roleName } = body;

    let targetRoleId = roleId;

    // If roleName is provided instead of roleId, look up the role
    if (!targetRoleId && roleName) {
      const role = await tenantDb.select().from(roles).where(eq(roles.name, roleName)).limit(1);
      if (role.length === 0) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }
      targetRoleId = role[0].id;
    }

    if (!targetRoleId) {
      return NextResponse.json({ error: 'Role ID or name required' }, { status: 400 });
    }

    const success = await assignRoleToUser(
      parseInt(userId),
      targetRoleId,
      parseInt(userPractice.user.id)
    );

    if (success) {
      return NextResponse.json({ 
        message: 'Role assigned successfully',
        userId,
        roleId: targetRoleId,
        assignedBy: userPractice.user.id
      });
    } else {
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error assigning role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/user-roles/[userId] - Revoke role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const practiceId = userPractice.practiceId ? parseInt(userPractice.practiceId) : undefined;

    // Check if current user can revoke roles
    const canRevokeRoles = await isUserPracticeAdmin(userPractice.user.id, practiceId) ||
                           await isUserSuperAdmin(userPractice.user.id, practiceId);

    if (!canRevokeRoles) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleIdParam = searchParams.get('roleId');
    const roleName = searchParams.get('roleName');

    let targetRoleId = roleIdParam ? parseInt(roleIdParam) : null;

    // If roleName is provided instead of roleId, look up the role
    if (!targetRoleId && roleName) {
      const role = await tenantDb.select().from(roles).where(eq(roles.name, roleName)).limit(1);
      if (role.length === 0) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }
      targetRoleId = role[0].id;
    }

    if (!targetRoleId) {
      return NextResponse.json({ error: 'Role ID or name required' }, { status: 400 });
    }

    const success = await revokeRoleFromUser(
      parseInt(userId),
      targetRoleId,
      parseInt(userPractice.user.id)
    );

    if (success) {
      return NextResponse.json({ 
        message: 'Role revoked successfully',
        userId,
        roleId: targetRoleId,
        revokedBy: userPractice.user.id
      });
    } else {
      return NextResponse.json({ error: 'Failed to revoke role' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error revoking role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
