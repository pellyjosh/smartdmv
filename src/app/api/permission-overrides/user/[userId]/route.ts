import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { 
  createPermissionOverride,
  getUserPermissionOverrides,
  isUserPracticeAdmin,
  isUserSuperAdmin 
} from '@/lib/rbac/dynamic-roles';
import { db } from '@/db';
import { permissionOverrides } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/permission-overrides/user/[userId] - Get user's permission overrides
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const practiceId = userPractice.practiceId ? parseInt(userPractice.practiceId) : undefined;

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID required' }, { status: 400 });
    }

    // Check if current user can view permission overrides
    const canViewOverrides = await isUserPracticeAdmin(userPractice.user.id, practiceId) ||
                             await isUserSuperAdmin(userPractice.user.id, practiceId);

    if (!canViewOverrides) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

  const overrides = await getUserPermissionOverrides(userId, practiceId);

  // Return the overrides array directly (client hooks expect an array)
  return NextResponse.json(overrides);

  } catch (error) {
    console.error('Error fetching permission overrides:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/permission-overrides/user/[userId] - Create permission override
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const practiceId = userPractice.practiceId ? parseInt(userPractice.practiceId) : undefined;

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID required' }, { status: 400 });
    }

    // Check if current user can create permission overrides
    const canCreateOverrides = await isUserPracticeAdmin(userPractice.user.id, practiceId) ||
                               await isUserSuperAdmin(userPractice.user.id, practiceId);

    if (!canCreateOverrides) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      userName, 
      userEmail, 
      resource, 
      action, 
      granted, 
      reason, 
      expiresAt 
    } = body;

    // Validate required fields
    if (!userName || !userEmail || !resource || !action || typeof granted !== 'boolean' || !reason) {
      return NextResponse.json({ 
        error: 'Missing required fields: userName, userEmail, resource, action, granted, reason' 
      }, { status: 400 });
    }

    const success = await createPermissionOverride({
      userId,
      userName,
      userEmail,
      resource,
      action,
      granted,
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      practiceId,
      createdBy: userPractice.user.email || userPractice.user.id
    });

    if (success) {
      return NextResponse.json({ 
        message: 'Permission override created successfully',
        userId,
        resource,
        action,
        granted,
        practiceId
      });
    } else {
      return NextResponse.json({ error: 'Failed to create permission override' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating permission override:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/permission-overrides/user/[userId] - Revoke permission override
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const practiceId = userPractice.practiceId ? parseInt(userPractice.practiceId) : undefined;

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID required' }, { status: 400 });
    }

    // Check if current user can revoke permission overrides
    const canRevokeOverrides = await isUserPracticeAdmin(userPractice.user.id, practiceId) ||
                               await isUserSuperAdmin(userPractice.user.id, practiceId);

    if (!canRevokeOverrides) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const overrideId = searchParams.get('overrideId');
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');

    if (!overrideId && (!resource || !action)) {
      return NextResponse.json({ 
        error: 'Either overrideId or both resource and action are required' 
      }, { status: 400 });
    }

    let whereClause;
    if (overrideId) {
      whereClause = and(
        eq(permissionOverrides.id, parseInt(overrideId)),
        eq(permissionOverrides.userId, userId),
        eq(permissionOverrides.practiceId, practiceId)
      );
    } else {
      whereClause = and(
        eq(permissionOverrides.userId, userId),
        eq(permissionOverrides.practiceId, practiceId),
        eq(permissionOverrides.resource, resource!),
        eq(permissionOverrides.action, action!)
      );
    }

    await db
      .update(permissionOverrides)
      .set({ 
        status: 'revoked'
      })
      .where(whereClause);

    return NextResponse.json({ 
      message: 'Permission override revoked successfully',
      userId,
      practiceId
    });

  } catch (error) {
    console.error('Error revoking permission override:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
