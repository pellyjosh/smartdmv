import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, roles } from '@/db/schema';
import { z } from 'zod';
import { eq, and, count, isNull, or } from 'drizzle-orm';
import { createAuditLog } from '@/lib/audit-logger';

// GET roles for a practice
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');
    const available = searchParams.get('available') === 'true';

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // Get all roles for the practice (system-defined and custom)
    const rolesData = await db.select().from(roles).where(
      or(
        eq(roles.practiceId, parseInt(practiceId)),
        and(eq(roles.isSystemDefined, true), isNull(roles.practiceId))
      )
    );

    // Get user counts for each role
    const userCounts = await Promise.all(
      rolesData.map(async (role) => {
        const [result] = await db
          .select({ count: count() })
          .from(users)
          .where(and(
            eq(users.practiceId, parseInt(practiceId)),
            eq(users.role, role.name)
          ));
        return { roleId: role.id, count: result?.count || 0 };
      })
    );

    // Combine roles with user counts
    const rolesWithCounts = rolesData.map(role => {
      const userCount = userCounts.find(uc => uc.roleId === role.id)?.count || 0;
      return {
        ...role,
        userCount,
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
      };
    });

    if (available) {
      // Return simplified format for dropdowns
      return NextResponse.json(rolesWithCounts.map(role => ({
        id: role.id.toString(),
        name: role.name,
        displayName: role.displayName,
        type: role.isSystemDefined ? 'system' : 'custom',
        isActive: role.isActive
      })));
    }

    return NextResponse.json(rolesWithCounts);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// POST create custom role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const roleSchema = z.object({
      name: z.string().min(2),
      displayName: z.string().min(2),
      description: z.string().optional(),
      permissions: z.array(z.object({
        id: z.string(),
        resource: z.string(),
        action: z.string(),
        granted: z.boolean(),
        category: z.string(),
      })),
      practiceId: z.number()
    });

    const validatedData = roleSchema.parse(body);

    // Check if role name already exists for this practice
    const existingRole = await db.select().from(roles).where(
      and(
        eq(roles.name, validatedData.name),
        or(
          eq(roles.practiceId, validatedData.practiceId),
          eq(roles.isSystemDefined, true)
        )
      )
    );

    if (existingRole.length > 0) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
    }

    // Create the role
    const [newRole] = await db.insert(roles).values({
      name: validatedData.name,
      displayName: validatedData.displayName,
      description: validatedData.description,
      permissions: validatedData.permissions,
      practiceId: validatedData.practiceId,
      isSystemDefined: false,
      isActive: true,
    }).returning();

    // Log audit event
    await createAuditLog({
      practiceId: validatedData.practiceId,
      recordType: 'ROLE',
      recordId: newRole.id.toString(),
      description: `Created custom role: ${validatedData.displayName}`,
      newValues: newRole,
    });

    return NextResponse.json({
      ...newRole,
      userCount: 0,
      permissions: Array.isArray(newRole.permissions) ? newRole.permissions : [],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
