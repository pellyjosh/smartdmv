import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // Fetch users from the practice with their role assignments
    const userAssignments = await tenantDb
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
  interface AssignmentRow { userId: number; userName: string | null; userEmail: string | null; currentRole: string | null; lastUpdated: Date | null; assignmentId: number | null; roleId: number | null; roleName: string | null; roleDisplayName: string | null; assignedAt: Date | null; isActive: boolean | null }
  const assignmentsByUser = userAssignments.reduce((acc: Record<number, any>, row: AssignmentRow) => {
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    const validatedData: AssignmentData = assignmentSchema.parse(body);
    
    const userId = parseInt(validatedData.userId as any);
    const roleId = parseInt(validatedData.roleId as any);

    if (isNaN(userId) || isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid user ID or role ID' }, { status: 400 });
    }

    // Check if assignment already exists
    const existingAssignment = await tenantDb
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.isActive, true)
        )
      )
      .limit(1);

    if (existingAssignment.length > 0) {
      return NextResponse.json({ error: 'Role already assigned to user' }, { status: 409 });
    }

    // Create new assignment
    const [newAssignment] = await tenantDb
      .insert(userRoles)
      .values({
        userId,
        roleId,
        assignedAt: new Date(),
        isActive: true,
      })
      .returning();

    // Create audit log
    try {
      await createAuditLog({
        recordType: 'ROLE',
        recordId: newAssignment.id.toString(),
        action: 'CREATE',
        description: `Assigned role ${roleId} to user ${userId}`,
        metadata: { userId, roleId, assigned: true },
        practiceId: validatedData.practiceId?.toString()
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json(newAssignment, { status: 201 });
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    const validatedData: RevokeData = revokeSchema.parse(body);
    
    const userId = parseInt(validatedData.userId as any);
    const roleId = parseInt(validatedData.roleId as any);

    if (isNaN(userId) || isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid user ID or role ID' }, { status: 400 });
    }

    // Find and deactivate the assignment
    const [revokedAssignment] = await tenantDb
      .update(userRoles)
      .set({
        isActive: false,
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.isActive, true)
        )
      )
      .returning();

    if (!revokedAssignment) {
      return NextResponse.json({ error: 'Role assignment not found' }, { status: 404 });
    }

    // Create audit log
    try {
      await createAuditLog({
        recordType: 'ROLE',
        recordId: revokedAssignment.id.toString(),
        action: 'UPDATE',
        description: `Revoked role ${roleId} from user ${userId}`,
        metadata: { userId, roleId, revoked: true, isActive: false },
        practiceId: validatedData.practiceId?.toString()
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({ message: 'Role revoked successfully' });
  } catch (error) {
    console.error('Error revoking role:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to revoke role' }, { status: 500 });
  }
}