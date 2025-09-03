import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, roles, userRoles } from '@/db/schema';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getUserContextFromRequest } from '@/lib/auth-context';
import { createAuditLog, SYSTEM_USER_NAME } from '@/lib/audit-logger';

// Zod schemas for validation
const assignmentSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
  practiceId: z.number()
});

const revokeSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
  practiceId: z.number()
});

type AssignmentData = z.infer<typeof assignmentSchema>;
type RevokeData = z.infer<typeof revokeSchema>;

// GET user assignments for a practice
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // Fetch users from the practice with their role assignments
    const userAssignments = await db
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        currentRole: users.role,
        lastUpdated: users.updatedAt,
        assignmentId: userRoles.id,
        roleId: userRoles.roleId,
        roleName: roles.name,
        roleDisplayName: roles.displayName,
        assignedAt: userRoles.assignedAt,
        isActive: userRoles.isActive,
      })
      .from(users)
      .leftJoin(userRoles, and(eq(userRoles.userId, users.id), eq(userRoles.isActive, true)))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(users.practiceId, parseInt(practiceId)));

    // Group assignments by user
    const assignmentsByUser = userAssignments.reduce((acc, row) => {
      if (!acc[row.userId]) {
        acc[row.userId] = {
          id: `assignment_${row.userId}`,
          userId: row.userId.toString(),
          userName: row.userName || 'Unknown User',
          userEmail: row.userEmail,
          currentRole: row.currentRole,
          assignedRoles: [],
          lastUpdated: row.lastUpdated?.toISOString() || new Date().toISOString(),
        };
      }

      if (row.assignmentId && row.roleId) {
        acc[row.userId].assignedRoles.push({
          id: row.assignmentId,
          roleId: row.roleId.toString(),
          roleName: row.roleName,
          roleDisplayName: row.roleDisplayName,
          assignedAt: row.assignedAt?.toISOString(),
          isActive: row.isActive,
        });
      }

      return acc;
    }, {} as Record<number, any>);

    return NextResponse.json(Object.values(assignmentsByUser));
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch user assignments' }, { status: 500 });
  }
}

// POST assign role to user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData: AssignmentData = assignmentSchema.parse(body);
    
    const userId = parseInt(validatedData.userId);
    const roleId = parseInt(validatedData.roleId);

    if (isNaN(userId) || isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid user ID or role ID' }, { status: 400 });
    }

    // Resolve current user for assignedBy
    const userContext = await getUserContextFromRequest(request);
    const assignedBy = userContext?.name || userContext?.email || userContext?.userId || SYSTEM_USER_NAME;

    // Check if assignment already exists
    const existingAssignment = await db.select().from(userRoles).where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.isActive, true)
      )
    );

    if (existingAssignment.length > 0) {
      return NextResponse.json({ error: 'User already has this role assigned' }, { status: 400 });
    }

    // Get the role details for audit logging
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!role || !user) {
      return NextResponse.json({ error: 'User or role not found' }, { status: 404 });
    }

    // Create the assignment
    const [assignment] = await db.insert(userRoles).values({
      userId,
      roleId,
      assignedBy: userContext?.userId ? parseInt(userContext.userId) : undefined,
      isActive: true,
    }).returning();

    // Log audit event
    await createAuditLog({
      action: 'CREATE',
      practiceId: validatedData.practiceId.toString(),
      recordType: 'USER_ROLE_ASSIGNMENT',
      recordId: assignment.id.toString(),
      description: `Assigned role "${role.displayName}" to user "${user.name}"`,
      userId: userContext?.userId,
      changes: {
        after: {
          userId,
          roleId,
          roleName: role.name,
          userName: user.name,
          assignedBy,
        },
      },
    });

    return NextResponse.json({
      id: assignment.id,
      userId: validatedData.userId,
      roleId: validatedData.roleId,
      assignedAt: assignment.assignedAt.toISOString(),
      assignedBy,
    }, { status: 201 });
  } catch (error) {
    console.error('Error assigning role:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
  }
}

// DELETE revoke role from user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData: RevokeData = revokeSchema.parse(body);
    
    const userId = parseInt(validatedData.userId);
    const roleId = parseInt(validatedData.roleId);

    if (isNaN(userId) || isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid user ID or role ID' }, { status: 400 });
    }

    // Resolve current user for revokedBy
    const userContext = await getUserContextFromRequest(request);

    // Find the active assignment
    const [assignment] = await db.select().from(userRoles).where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.isActive, true)
      )
    );

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get role and user details for audit logging
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    // Revoke the assignment
    await db.update(userRoles)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy: userContext?.userId ? parseInt(userContext.userId) : undefined,
      })
      .where(eq(userRoles.id, assignment.id));

    // Log audit event
    await createAuditLog({
      action: 'DELETE',
      practiceId: validatedData.practiceId.toString(),
      recordType: 'USER_ROLE_ASSIGNMENT',
      recordId: assignment.id.toString(),
      description: `Revoked role "${role?.displayName || 'Unknown'}" from user "${user?.name || 'Unknown'}"`,
      userId: userContext?.userId,
      changes: {
        before: {
          userId,
          roleId,
          roleName: role?.name,
          userName: user?.name,
          isActive: true,
        },
        after: {
          isActive: false,
          revokedAt: new Date().toISOString(),
          revokedBy: userContext?.name || userContext?.email || userContext?.userId || SYSTEM_USER_NAME,
        },
      },
    });
    
    return NextResponse.json({ 
      message: 'Role revoked successfully',
      userId: validatedData.userId,
      roleId: validatedData.roleId
    });
  } catch (error) {
    console.error('Error revoking role:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to revoke role' }, { status: 500 });
  }
}
